from django.contrib.auth import get_user_model 
from rest_framework import generics, permissions, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

# Models & Serializers
from .models import TaskNote, Task, Message, Group
from .serializers import NoteSerializer, TaskSerializer, MessageSerializer, GroupSerializer

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    user = request.user 
    full_name = f"{user.first_name} {user.last_name}".strip()
    return Response({
        "name": full_name if full_name else user.username,
        "email": user.email,
        "role": getattr(user, 'role', 'user') 
    })

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        group = serializer.save()
        group.members.add(self.request.user)

class NoteListCreate(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        group_id = self.request.query_params.get('group')
        if group_id:
            return TaskNote.objects.filter(author=user, group_id=group_id)
        return TaskNote.objects.filter(author=user)

    def perform_create(self, serializer):
        group_id = self.request.data.get('group')
        serializer.save(author=self.request.user, group_id=group_id)

class NoteDelete(generics.DestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TaskNote.objects.filter(author=self.request.user)

class TaskListCreate(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        group_id = self.request.query_params.get('group')
        if group_id:
            return Task.objects.filter(group_id=group_id).order_by('start_date')
        return Task.objects.none()

    def perform_create(self, serializer):
        group_id = self.request.data.get('group')
        serializer.save(group_id=group_id)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        group_id = self.request.query_params.get('group')
        if group_id:
            return Message.objects.filter(group_id=group_id).order_by('created_at')
        return Message.objects.none()

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)