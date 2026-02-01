from django.contrib.auth.models import User
from rest_framework import serializers
from datetime import date
from .models import TaskNote, Task, User, Group, Message

#ORM Object Relational Mapping (accepts JSON data)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password", "role"] 
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    
class GroupSerializer(serializers.ModelSerializer):
    # This will display the string representation of each user in the members list
    members = serializers.StringRelatedField(many=True)
    class Meta:
        model = Group
        fields = "__all__"
        # This allows you to create a group with an empty list
        depth = 1  # This tells DRF to go one level deep into relationships
        extra_kwargs = {
            'members': {'required': False, 'allow_empty': True}
        }
    
class NoteSerializer(serializers.ModelSerializer):
    # This field pulls the username instead of just the ID for the UI
    author_name = serializers.ReadOnlyField(source='author.username')
    group_name = serializers.ReadOnlyField(source='group.name') # This adds the name string of the group

    #tells Python to look at the Parent Class for init method
    #def __init__(self, *args, **kwargs):
    #    super(NoteSerializer, self).__init__(*args, **kwargs)

    class Meta:
        model = TaskNote
        fields = ["id", "title", "content", "created_at", "author", "author_name", "group"]
        extra_kwargs = {"author": {"read_only": True}}

class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.ReadOnlyField(source='assignee.username')
    duration_days = serializers.ReadOnlyField() # Calls the @property in the model
    start_day = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'task_name', 'assignee_name', 'start_day', 'end_date',
            'duration_days', 'progress_percentage', 'hex_color'
        ]

    def get_start_day(self, obj):
        # We calculate the start day relative to the "Project Start"
        # Instead of a hardcoded date, use the group's creation date or a start_date field
        # fallback to current date if not set
        project_start = obj.group.created_at.date()
        delta = obj.start_date - project_start
        return max(1, delta.days + 1) # Returns 1 if task starts on the project_start date
    
class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='author.username')
    sender_initials = serializers.SerializerMethodField()
    is_self = serializers.SerializerMethodField()
    avatar_color = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source='created_at', format="%Y-%m-%dT%H:%M:%SZ")

    class Meta:
        model = Message
        fields = ['id', 'sender_name', 'sender_initials', 'text', 'timestamp', 'is_self', 'avatar_color']

    def get_sender_initials(self, obj):
        name = obj.author.username
        return "".join([n[0].upper() for n in name.split()[:2]])

    def get_is_self(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.author == request.user
        return False
    
    def get_avatar_color(self, obj):
        colors = ['#2563EB', '#7C3AED', '#DB2777', '#059669', '#EA580C']
        # The hash ensures the same user always gets the same color
        return colors[hash(obj.author.username) % len(colors)]
    