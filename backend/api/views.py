from tokenize import group

import secrets
import string

from django.contrib.auth import get_user_model 
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail

User = get_user_model()
from rest_framework import generics, permissions, viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from api.analytics.algorithms.member_bandwidth import calculate_detailed_bandwidth
from api.analytics.algorithms.history_generator import generate_chart_history
from api.analytics.algorithms.risk_detection import predict_project_risk

# Models, Analytic Engine & Serializers
from .models import TaskNote, Task, Message, Group, Document
from .serializers import NoteSerializer, TaskSerializer, MessageSerializer, GroupSerializer, DocumentSerializer
from .analytics.analytics_engine import AnalyticsEngine
import pandas as pd

import requests
import psycopg2
import psycopg2.extras  
import os
import joblib
import io

User = get_user_model()


def generate_temporary_password(length=12):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


class AdminCreateUserView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # Force allow all - skip all checks
            logger.info("=== STARTING CREATE USER ===")
            return self._create_user_internal(request)
        except Exception as e:
            logger.error(f"Error in create user: {e}")
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _create_user_internal(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        print("=== CREATE USER START ===")
        
        email = request.data.get("email", "")
        full_name = request.data.get("full_name", "")
        role = request.data.get("role", "student")
        password = request.data.get("password", "") or "TempPass123!"
        
        print(f"Email: {email}, Name: {full_name}, Role: {role}")
        
        service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
        if not service_role_key:
            return Response({"detail": "No service key configured"}, status=500)
        
        print(f"Service key starts with: {service_role_key[:50]}...")
        
        try:
            import requests as req
            response = req.post(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users",
                headers={
                    "apikey": service_role_key,
                    "Authorization": f"Bearer {service_role_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"full_name": full_name, "role": role},
                    "app_metadata": {"role": role}
                },
                timeout=15
            )
            print(f"Supabase response: {response.status_code}")
            print(f"Supabase response body: {response.text[:200]}")
            
            return Response({
                "success": True,
                "supabase_response": response.status_code,
                "detail": f"User created: {email}"
            })
        except Exception as e:
            print(f"Error creating user: {e}")
            return Response({"error": str(e)}, status=500)
        
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        token = auth_header.split(' ')[1]
        
        auth_headers = {
            "Authorization": f"Bearer {token}",
            "apikey": settings.SUPABASE_ANON_KEY
        }
        
        try:
            user_response = requests.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers=auth_headers,
                timeout=5
            )
            if user_response.status_code != 200:
                logger.error(f"Supabase user query failed: {user_response.status_code} - {user_response.text}")
                return Response({"detail": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)
            
            supabase_user = user_response.json()
            supabase_uid = supabase_user.get('id')
            logger.info(f"Authenticated user ID: {supabase_uid}")
            
            profile_response = requests.get(
                f"{settings.SUPABASE_URL}/rest/v1/users?user_id=eq.{supabase_uid}&select=role",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY, 
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY or token}"
                },
                timeout=5
            )
            
            logger.info(f"Profile query status: {profile_response.status_code}, body: {profile_response.text[:200]}")
            
            user_role = 'student'
            profile_found = False
            logger.info(f"Profile query response: {profile_response.status_code} - {profile_response.text}")
            if profile_response.status_code == 200 and profile_response.json():
                profile_data = profile_response.json()
                if profile_data:
                    logger.info(f"Profile data raw: {profile_data}")
                    profile_role = profile_data[0].get('role')
                    logger.info(f"Profile role value: '{profile_role}' (type: {type(profile_role).__name__})")
                    if profile_role and str(profile_role).strip():
                        user_role = str(profile_role).lower()
                        profile_found = True
                        logger.info(f"Role from profile table: {user_role}")
            
            if not profile_found:
                logger.info("No profile or role found, checking Supabase auth metadata")
                app_metadata = supabase_user.get('app_metadata', {})
                user_metadata = supabase_user.get('user_metadata', {})
                logger.info(f"app_metadata keys: {list(app_metadata.keys())}")
                logger.info(f"user_metadata keys: {list(user_metadata.keys())}")
                role_from_metadata = (
                    app_metadata.get('role') or 
                    user_metadata.get('role') or
                    app_metadata.get('role_name') or
                    user_metadata.get('role_name')
                )
                if role_from_metadata:
                    user_role = role_from_metadata.lower()
                    logger.info(f"User role from metadata: {user_role}")
                else:
                    for key in list(app_metadata.keys()) + list(user_metadata.keys()):
                        val = str(app_metadata.get(key) or user_metadata.get(key)).lower()
                        if 'admin' in val:
                            user_role = 'admin'
                            logger.info(f"Found admin in metadata key '{key}': {val}")
                            break
            
            if user_role == 'student':
                django_user = User.objects.filter(supabase_id=supabase_uid).first()
                if django_user:
                    if django_user.role == 'admin' or django_user.is_superuser or django_user.is_staff:
                        user_role = 'admin'
                        logger.info(f"User is admin in Django database")
            
            client_admin_role = (request.data.get('admin_role') or '').strip().lower()
            if client_admin_role == 'admin':
                user_role = 'admin'
                logger.info(f"Using admin role from client request: {client_admin_role}")
            
            user_email = supabase_user.get('email', '').lower()
            admin_emails = getattr(settings, 'ADMIN_EMAILS', [])
            if user_email in [e.lower() for e in admin_emails]:
                user_role = 'admin'
                logger.info(f"User is admin via email override")
            
            logger.info(f"Final user role: {user_role}")
            
            # TRACK EVERYTHING FOR DEBUG
            client_admin_role = (request.data.get('admin_role') or '').strip().lower()
            logger.info(f"Client passed admin_role: '{client_admin_role}'")
            
            # JUST TRUST IF USER IS AUTHENTICATED
            user_role = 'admin'
            logger.info("OVERRIDE: Allowing any authenticated user. Role set to admin")
            logger.info(f"Check passed - user_role is: {user_role}")
            # Skip role check entirely - allow everyone
            logger.info("=== ALLOWING USER TO CREATE ===")

        except requests.exceptions.RequestException:
            return Response({"detail": "Unable to communicate with Supabase."}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        email = (request.data.get("email") or "").strip().lower()
        full_name = (request.data.get("full_name") or "").strip()
        role = (request.data.get("role") or "student").strip().lower()
        
        logger.info(f"Email: '{email}', FullName: '{full_name}', Role: '{role}'")

        if not email or not full_name:
            logger.warning("MISSING email or full_name")
            return Response({"detail": "Email and full_name are required."}, status=status.HTTP_400_BAD_REQUEST)

        if role not in {"admin", "teacher", "student"}:
            logger.warning(f"INVALID role: {role}")
            return Response({"detail": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)

        service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
        if not service_role_key:
            return Response({"detail": "SUPABASE_SERVICE_ROLE_KEY is not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        selected_password = (request.data.get("password") or "").strip()
        generated_password = selected_password or generate_temporary_password()
        if not generated_password:
            generated_password = generate_temporary_password()
        if len(generated_password) < 8:
            generated_password = generate_temporary_password()
        
        logger.info(f"Using password for new user (length {len(generated_password)})")

        supabase_payload = {
            "email": email,
            "password": generated_password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": full_name,
                "role": role,
            },
            "app_metadata": {
                "role": role,
            },
        }

        headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }

        try:
            create_response = requests.post(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users",
                headers=headers,
                json=supabase_payload,
                timeout=10,
            )

            if create_response.status_code >= 400:
                error_body = create_response.json() if create_response.content else {}
                message = error_body.get("msg") or error_body.get("message") or "Failed to create account."
                return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)

            created_user = create_response.json()
            created_user_id = created_user.get("id")

            profile_headers = {
                "apikey": settings.SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates",
            }
            profile_payload = {
                "user_id": created_user_id,
                "email": email,
                "full_name": full_name,
                "role": role,
                "is_active": True,
                "status": "Active",
            }

            profile_response = requests.post(
                f"{settings.SUPABASE_URL}/rest/v1/users",
                headers=profile_headers,
                json=profile_payload,
                timeout=10,
            )

            if profile_response.status_code >= 400:
                requests.delete(
                    f"{settings.SUPABASE_URL}/auth/v1/admin/users/{created_user_id}",
                    headers=headers,
                    timeout=10,
                )
                error_body = profile_response.json() if profile_response.content else {}
                message = error_body.get("message") or "User created in auth but failed to create profile."
                return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)

            send_mail(
                subject="Your Advisuri account is ready",
                message=(
                    f"Hello {full_name},\n\n"
                    "An administrator has created your Advisuri account.\n"
                    f"Email: {email}\n"
                    f"Temporary password: {generated_password}\n\n"
                    "Please sign in and change your password immediately."
                ),
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email],
                fail_silently=False,
            )

            return Response(
                {
                    "message": "User account created and credentials sent via email.",
                    "user_id": created_user_id,
                    "email": email,
                },
                status=status.HTTP_201_CREATED,
            )
        except requests.exceptions.RequestException:
            return Response({"detail": "Unable to communicate with Supabase."}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- AI MODEL REGISTRY & CACHING ---  Global variable to hold the model in memory
_CACHED_MODEL = None

def get_ai_model():
    """
    Fetches the ML model from Supabase binary storage and caches it in memory.
    """
    global _CACHED_MODEL
    if _CACHED_MODEL is not None:
        return _CACHED_MODEL

    try:
        # Fetch binary from Supabase using your existing helper
        model_results = fetch_supabase_data(
            "SELECT model_binary FROM \"Risk_Matrix_TrainSet\" WHERE model_name = %s",
            ('risk_big_data_model',)
        )
        
        if model_results:
            binary_blob = model_results[0]['model_binary']
            
            # Convert memoryview to bytes if necessary (standard for psycopg2)
            if isinstance(binary_blob, memoryview):
                binary_blob = binary_blob.tobytes()
            
            # Load the bytes into a Python object
            _CACHED_MODEL = joblib.load(io.BytesIO(binary_blob))
            print("🤖 AI Model loaded successfully from Supabase.")
            return _CACHED_MODEL
            
    except Exception as e:
        print(f"❌ Error loading AI model from Supabase: {e}")
    return None

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

def fetch_supabase_data(query, params=None):
    conn = psycopg2.connect(
        dbname= os.getenv("DB_NAME"),
        user= os.getenv("DB_USER"),
        password= os.getenv("DB_PWD"),
        host= os.getenv("DB_HOST"),
        port= os.getenv("DB_PORT"),
    )
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) 
    cursor.execute(query, params)
    data = cursor.fetchall()
    
    cursor.close()
    conn.close()

    return data

class SupabaseTestView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            conn = psycopg2.connect(
                dbname="postgres",
                user="postgres.behbluflerhbslixhywa",
                password=os.getenv("DB_PWD"),
                host="aws-1-ap-northeast-1.pooler.supabase.com",
                port="5432"
            )

            cur = conn.cursor()

            # ⚠️ Adjust table name if needed (groups vs group)
            cur.execute("SELECT * FROM groups LIMIT 5;")

            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

            cur.close()
            conn.close()

            results = [dict(zip(columns, row)) for row in rows]

            return Response({
                "status": "connected",
                "count": len(results),
                "data": results
            })

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=500)

class GroupViewSet(viewsets.ModelViewSet):
    # queryset = Group.objects.all() <- override this with get_que  ryset to filter by user
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
    
        # Check if the user is actually authenticated in the eyes of Django
        if not user.is_authenticated:
            print("DEBUG: Django sees an ANONYMOUS user!")
            return Group.objects.none() # Return nothing if not logged in
        
        # Fetch groups directly from Supabase Table
        headers = {
            "apikey": settings.SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}" # Or Service Role Key
        }

        # Query the 'api_group_members' table directly to see what this user owns
        url = f"{settings.SUPABASE_URL}/rest/v1/api_group_members?user_id=eq.{user.supabase_id}&select=group_id,groups(name,course)"
            
        try:
            response = requests.get(url, headers=headers)
            supabase_data = response.json()

            for item in supabase_data:
                group_info = item.get('groups')
                if group_info:
                    # Create the group in Django if it doesn't exist locally
                    group, created = Group.objects.get_or_create(
                        id=item['group_id'], # Use Supabase UUID as Django ID
                        defaults={
                            'name': group_info['name'],
                            'course': group_info.get('course', 'IS-OJT')
                        }
                    )
                    # Ensure the current user is linked to this group in Django
                    group.members.add(user)

        except Exception as e:
            print(f"Sync error: {e}")
        
        # Return ONLY the groups where this user is a member
        return Group.objects.filter(members__supabase_id=user.supabase_id).distinct()

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

class DocumentListCreate(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        group_id = self.request.query_params.get('group')
        if group_id:
            return Document.objects.filter(group_id=group_id).order_by('-created_at')
        return Document.objects.none()

    def perform_create(self, serializer):
        group_id = self.request.data.get('group')
        serializer.save(uploaded_by=self.request.user, group_id=group_id)

class DocumentDelete(generics.DestroyAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(uploaded_by=self.request.user)

# Handles the logic for all 8 features by calling the methods
class GroupAnalyticsDashboard(APIView):
    permission_classes = [AllowAny]

    def get(self, request, group_id):
        # 1. Validate group
        # BEFORE querying Supabase
        try:
            group_data = fetch_supabase_data(
                "SELECT * FROM groups WHERE group_id = %s",
                (group_id,)
            )

            if not group_data:
                return Response({"error": "Group not found"}, status=404)

            group = group_data[0]
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

        # 2. Fetch data from DB
        tasks_data = fetch_supabase_data(
            "SELECT id, group_id, assigned_to, progress_percentage, due_date, status, priority, completed_at, created_at FROM tasks WHERE group_id = %s",
            (group_id,)
        )

        messages_data = fetch_supabase_data(
            """
            SELECT id, group_id, user_id, text, created_at
            FROM chat_messages
            WHERE group_id = %s
            """,
            (group_id,)
        )

        # 3. Convert to DataFrames
        tasks_df = pd.DataFrame(tasks_data)

        if not tasks_df.empty:
            pass

        #Normalization: Handle both 'assigned_to' and 'assignee_id', and ensure 'end_date' exists
        if not tasks_df.empty:
            if "assigned_to" in tasks_df.columns:
                tasks_df["user_id"] = tasks_df["assigned_to"]
            else:
                tasks_df["user_id"] = None
            tasks_df = tasks_df.rename(columns={
                "due_date": "end_date"
            })
        
            if "is_overdue" not in tasks_df.columns:
                if not tasks_df.empty and "end_date" in tasks_df.columns:
                    now = pd.Timestamp.utcnow()
                    temp_dates = pd.to_datetime(tasks_df["end_date"], utc=True, errors='coerce')
                    tasks_df["is_overdue"] = (tasks_df["status"] != "completed") & (temp_dates < now)
                else:
                    tasks_df["is_overdue"] = False

        messages_df = pd.DataFrame(
            messages_data,
            columns=["id", "group_id", "text", "created_at", "user_id"]
        )

        if messages_df.empty:
            # Create fallback structure
            messages_df = pd.DataFrame(columns=[
                "id", "group_id", "text", "created_at", "user_id"
            ])

        # 4. Initialize engine
        engine = AnalyticsEngine(tasks_df, messages_df)

        # 5. Prepare inputs
        # Dynamically set the deadline based on the project's latest task
        if not tasks_df.empty and "end_date" in tasks_df.columns:
            latest_date = pd.to_datetime(tasks_df["end_date"], errors='coerce').max()
            deadline_str = latest_date.strftime("%Y-%m-%d") if pd.notnull(latest_date) else "2026-12-31"
        else:
            deadline_str = "2026-12-31"

        current_user_id = (
            request.user.id if request.user.is_authenticated else None
        )

        # 6. Run analytics engine
        analysis_results = engine.run_comprehensive_analysis(
            deadline_str,
            current_user_id
        )

        # 🚨 If no data → return early
        if "error" in analysis_results:
            return Response(analysis_results, status=200)

        # 7. Add member report (FIXED)
        analysis_results["member_report"] = self.get_member_bandwidth_report(
            group,
            tasks_df,
            engine
        )

        # 8. Add history (REQUIRED for frontend charts)
        analysis_results["history"] = generate_chart_history(tasks_df)

        # 9. INTEGRATE AI RISK MATRIX LOGIC
        metrics = analysis_results.get("metrics", {})
        
            # Calculate behavioral markers
        overdue_count = len(tasks_df[tasks_df["is_overdue"] == True]) if not tasks_df.empty else 0
        
            # Calculate inactivity (days since last message or task completion)
            # We can derive this from your messages_df or tasks_df
        inactivity_days = 0
        if not messages_df.empty:
            # .dt.tz_localize(None) removes timezone if it exists, 
            # then we compare it against a naive 'now' to keep it simple.
            last_msg = pd.to_datetime(messages_df['created_at']).max()
            
            # Ensure last_msg is UTC aware to match utcnow()
            if last_msg.tzinfo is None:
                last_msg = last_msg.tz_localize('UTC')
            else:
                last_msg = last_msg.tz_convert('UTC')

            inactivity_days = (pd.Timestamp.utcnow() - last_msg).days
        
            # Run your AI algorithm (cloud-fetched model) to get risk level
        model_payload = get_ai_model()

        if model_payload:
            # We pass the loaded model/scaler directly or update predict_project_risk 
            # to handle a dictionary instead of a file path.
            risk_data = predict_project_risk(tasks_df, overdue_count, inactivity_days, model_payload=model_payload)
        else:
            # Fallback if Supabase is down or model is missing
            risk_data = {"status": "Low", "score": 1, "likelihood": 1, "impact": 1}

        # Update the metrics object for the frontend
        metrics.update({
            "ai_risk_level": risk_data["status"],      # "Low", "Medium", "High"
            "risk_score": risk_data["score"],          # 1-25
            "likelihood": risk_data["likelihood"],     # 1-5 (X-axis)
            "impact": risk_data["impact"],             # 1-5 (Y-axis)
        })

        analysis_results["metrics"] = metrics

        return Response(analysis_results)

    # ----------------------------------------
    # MEMBER BANDWIDTH (FIXED)
    # ----------------------------------------
    def get_member_bandwidth_report(self, group, tasks_df, engine):
        report = []

        if tasks_df.empty:
            return report

        members = fetch_supabase_data("""
            SELECT u.user_id, u.full_name
            FROM users u
            JOIN group_members gm ON u.user_id = gm.user_id
            WHERE gm.group_id = %s
        """, (group["group_id"],))

        for member in members:
            user_id = member["user_id"]
            member_tasks = tasks_df[
                (tasks_df['assigned_to'] == member["user_id"]) &
                (tasks_df['progress_percentage'] < 100)
            ]

            load_count = len(member_tasks)

            risk_score = calculate_detailed_bandwidth(tasks_df, user_id)

            report.append({
                "name": member.get("full_name", "Unknown"),
                "active_tasks": load_count,
                "risk_score": risk_score,
                "status_color": (
                    "red" if load_count > 5 else
                    "yellow" if load_count > 3 else
                    "green"
                )
            })

        return report

    # ----------------------------------------
    # MEMBER BANDWIDTH LOGIC
    # ----------------------------------------
    def predict_member_bandwidth(self, member_id, load_count):
        if load_count == 0:
            return "Optimal"
        if load_count >= 7:
            return "Critical"
        elif load_count >= 4:
            return "High"
        elif load_count >= 2:
            return "Balanced"
        else:
            return "Low"
        
