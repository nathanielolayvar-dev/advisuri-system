from django.shortcuts import render
from django.contrib.auth.models import User    
from rest_framework import generics
from .serializers import UserSerializer, NoteSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Note

#Google Auth imports
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes


from rest_framework.decorators import api_view
from rest_framework.response import Response

'''
@api_view(['GET'])
def health_check(request):
    return Response({
        "status": "ok",
        "app": "Advisuri System"
    })
'''

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    user = request.user
    # Combine first and last name, fallback to username if empty
    full_name = f"{user.first_name} {user.last_name}".strip()
    
    return Response({
        "name": full_name if full_name else user.username,
        "email": user.email
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    # This matches the "token" sent from your React api.post call
    token = request.data.get('token')
    
    try:
        # Verify the token with Google
        # Replace 'YOUR_GOOGLE_CLIENT_ID' with your actual ID from Google Console
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            '928179385020-2fkalgbejbopemc6qcndo5ee8o9dglld.apps.googleusercontent.com'
        )

        # Get or Create the user in your Django database
        email = idinfo['email']
        username = email.split('@')[0]
        user, created = User.objects.get_or_create(
            email=email, 
            defaults={'username': email}
        )

        # Generate your app's JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })

    except ValueError:
        # Invalid token
        return Response({"error": "Invalid token"}, status=400)

class NoteListCreate(generics.ListCreateAPIView): #class for creating notes
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(author=user) #note written by specific user
    
    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(author=self.request.user)
        else:
            print(serializer.errors)

class NoteDelete(generics.DestroyAPIView):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(author=user) #note written by specific user

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny] 
