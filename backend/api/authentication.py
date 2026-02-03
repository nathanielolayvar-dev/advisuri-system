import requests
import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions

logger = logging.getLogger(__name__)
User = get_user_model()

class SupabaseJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        # 1. Extract the token from the Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]

        # 2. Verify the token with Supabase (Algorithm-agnostic)
        # This handles HS256 and ES256 automatically
        headers = {
            "Authorization": f"Bearer {token}",
            "apikey": settings.SUPABASE_ANON_KEY
        }
        
        try:
            # We call the Supabase Auth server directly to validate the user
            response = requests.get(
                f"{settings.SUPABASE_URL}/auth/v1/user", 
                headers=headers,
                timeout=5
            )

            if response.status_code != 200:
                print(f"DEBUG: Supabase rejected token. Status Code: {response.status_code}")
                return None

            user_data = response.json()
            email = user_data.get('email')
            supabase_uid = user_data.get('id') # This is the unique 'sub'

            # 3. Sync with your Django User model
            # We use update_or_create to ensure is_active is always True
            user, created = User.objects.update_or_create(
                supabase_id=supabase_uid, 
                defaults={
                    'username': email, 
                    'email': email,
                    'is_active': True,
                    'role': 'student' # Matches your ROLE_CHOICES in models.py
                }
            )

            print(f"DEBUG: Successfully authenticated {user.email} (Active: {user.is_active})")
            return (user, None)

        except requests.exceptions.RequestException as e:
            print(f"DEBUG: Connection to Supabase failed: {str(e)}")
            return None
        except Exception as e:
            print(f"DEBUG: Unexpected error in authentication: {str(e)}")
            return None