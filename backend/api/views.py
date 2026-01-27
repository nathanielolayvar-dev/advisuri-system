from django.shortcuts import render
from django.contrib.auth import get_user_model 
from rest_framework import generics, permissions, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings # If needed for other parts

#Roles form database
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

#models import
from .models import User, TaskNote, Task, Message, Group

#serializers import
from .serializers import UserSerializer, NoteSerializer, TaskSerializer, MessageSerializer, GroupSerializer

# Google Auth imports
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

# Define User at the module level using get_user_model()
User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    user = request.user # Fix: access the logged-in user from the request
    # Combine first and last name, fallback to username if empty
    full_name = f"{user.first_name} {user.last_name}".strip()
    
    return Response({
        "name": full_name if full_name else user.username,
        "email": user.email,
        "role": user.role # Added this so your React sidebar knows the role!
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    token = request.data.get('token')
    
    try:
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            '928179385020-2fkalgbejbopemc6qcndo5ee8o9dglld.apps.googleusercontent.com'
        )

        email = idinfo['email']
        # Fix: ensure we use the correct User model defined at the top
        user, created = User.objects.get_or_create(
            email=email, 
            defaults={'username': email}
        )

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'role': user.role # Return role on login
        })

    except ValueError:
        return Response({"error": "Invalid token"}, status=400)

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Add the role to the response
        data['role'] = self.user.role 
        return data
    
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer

    def perform_create(self, serializer):
        # 1. Save the group
        group = serializer.save()
        # 2. Add the person who clicked 'Create' to the members list automatically
        group.members.add(self.request.user)

class UserListView(generics.ListAPIView):
    # We exclude the current user from the list so you don't "add yourself" 
    # (since the backend should add the creator automatically)
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.exclude(id=self.request.user.id)

class NoteListCreate(generics.ListCreateAPIView):
    serializer_class = NoteSerializer

    def get_queryset(self):
        # 1. Get the currently logged-in user
        user = self.request.user
        
        # 2. Look for the 'group' ID in the URL (e.g., /api/notes/?group=1)
        group_id = self.request.query_params.get('group')
        
        # 3. Filter notes by the group ID AND ensure the user is the author
        # (Or you can allow any group member to see it if you have a group membership model)
        if group_id:
            return TaskNote.objects.filter(author=user, group_id=group_id)
        
        # 4. Fallback: if no group is specified, just show all the user's notes
        return TaskNote.objects.filter(author=user)

    def perform_create(self, serializer):
        # We grab the group ID sent from the React 'api.post' call
        group_id = self.request.data.get('group')
        
        # We save the note with BOTH the author and the specific group
        serializer.save(author=self.request.user, group_id=group_id)

class NoteDelete(generics.DestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TaskNote.objects.filter(author=self.request.user)

class CreateUserView(generics.CreateAPIView):
    # Fix: User is now the custom api.User model defined at the top
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class TaskListCreate(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter by group_id passed from React (?group=ID)
        group_id = self.request.query_params.get('group')
        if group_id:
            return Task.objects.filter(group_id=group_id).order_by('start_date')
        return Task.objects.none()

    def perform_create(self, serializer):
        # Automatically link the task to the selected group on save
        group_id = self.request.data.get('group')
        serializer.save(group_id=group_id)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # This allows the frontend to call: /api/messages/?group=5
        group_id = self.request.query_params.get('group')
        if group_id:
            return Message.objects.filter(group_id=group_id).order_by('created_at')
        return Message.objects.none()

    def perform_create(self, serializer):
        # This automatically sets the 'author' to the logged-in user
        serializer.save(author=self.request.user)