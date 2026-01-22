from django.shortcuts import render
from django.contrib.auth import get_user_model 
from rest_framework import generics
from .serializers import UserSerializer, NoteSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings # If needed for other parts

#Roles form database
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Note

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

class NoteListCreate(generics.ListCreateAPIView):   
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Fix: Filter by the instance of the user making the request
        return Note.objects.filter(author=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class NoteDelete(generics.DestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(author=self.request.user)

class CreateUserView(generics.CreateAPIView):
    # Fix: User is now the custom api.User model defined at the top
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]