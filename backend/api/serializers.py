from django.contrib.auth.models import User
from rest_framework import serializers
from datetime import date
from .models import TaskNote, Task, User, Group, Message, Document

#ORM Object Relational Mapping (accepts JSON data)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password", "role", "supabase_id"]
        extra_kwargs = {
                    "password": {"write_only": True},
                    "supabase_id": {"required": False} # Make it optional for now
                }

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    
class GroupSerializer(serializers.ModelSerializer):
    # Use PrimaryKeyRelatedField for write operations, StringRelatedField for reads
    members = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    member_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'course', 'members', 'member_details', 'created_at']
        extra_kwargs = {
            'members': {'required': False, 'allow_empty': True},
            'course': {'required': False, 'allow_blank': True}
        }
    
    def get_member_details(self, obj):
        """Return member details for the response"""
        return [
            {'id': m.id, 'username': m.username}
            for m in obj.members.all()
        ]
    
    def create(self, validated_data):
        """Create group without requiring members"""
        return Group.objects.create(**validated_data)
    
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

class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.ReadOnlyField(source='uploaded_by.username')
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'name', 'file', 'file_url', 'file_type', 'file_size', 'uploaded_by', 'uploaded_by_name', 'created_at']

    def get_file_url(self, obj):
        return obj.file.url

    def create(self, validated_data):
        # Auto-calculate file size
        file = validated_data.get('file')
        if file:
            validated_data['file_size'] = f"{file.size / 1024:.1f} KB"
        # Determine file type based on extension
        name = validated_data.get('name', '')
        ext = name.split('.')[-1].lower() if '.' in name else ''
        file_type_map = {
            'pdf': 'pdf', 'doc': 'doc', 'docx': 'doc',
            'xls': 'excel', 'xlsx': 'excel',
            'py': 'code', 'js': 'code', 'html': 'code', 'css': 'code',
            'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
        }
        validated_data['file_type'] = file_type_map.get(ext, 'other')
        return super().create(validated_data)
