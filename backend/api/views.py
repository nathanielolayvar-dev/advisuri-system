from tokenize import group

from django.contrib.auth import get_user_model 
from django.utils import timezone
from rest_framework import generics, permissions, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from urllib3 import request
from urllib3 import request

from api.analytics.algorithms.member_bandwidth import calculate_detailed_bandwidth

# Models, Analytic Engine & Serializers
from .models import TaskNote, Task, Message, Group, Document
from .serializers import NoteSerializer, TaskSerializer, MessageSerializer, GroupSerializer, DocumentSerializer
from .analytics.analytics_engine import AnalyticsEngine
import pandas as pd

import psycopg2
import psycopg2.extras  
import os

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
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Return groups where the user is a member
        return Group.objects.filter(members=user).prefetch_related('members')

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
        print("DEBUG group_id:", group_id)
        print("TYPE:", type(group_id))  
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
        
        print("Group query result:", group_data)

        # 2. Fetch data from DB
        tasks_data = fetch_supabase_data(
            "SELECT id, group_id, assigned_to, progress_percentage, due_date, status, completed_at FROM tasks WHERE group_id = %s",
            (group_id,)
        )

        print("RAW TASKS DATA:", tasks_data[:2])

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

        print("TASKS DF COLUMNS:", tasks_df.columns)

        #Normalization: Handle both 'assigned_to' and 'assignee_id', and ensure 'end_date' exists
        if not tasks_df.empty:
            if "assigned_to" in tasks_df.columns:
                tasks_df["user_id"] = tasks_df["assigned_to"]
            else:
                print("⚠️ assigned_to column missing")
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
            print("⚠️ No messages found for this group")

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
        analysis_results["history"] = self.generate_history(tasks_df)

        # 9. Ensure risk matrix fields exist
        metrics = analysis_results.get("metrics", {})
        metrics.setdefault("risk_likelihood", 0)
        metrics.setdefault("risk_impact", 0)
        metrics.setdefault("risk_urgency", 0)

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
    # SIMPLE HISTORY GENERATOR (NEW)
    # ----------------------------------------
    def generate_history(self, tasks_df):
        if tasks_df.empty or 'created_at' not in tasks_df.columns:
            return {
                "dates": [],
                "completed_counts": [],
                "total_counts": [],
                "velocity_trend": [],
                "prediction_dates": [],
                "backlog_prediction": [],
                "incoming_prediction": []
            }

        try:
            df = tasks_df.copy()
            df['created_at'] = pd.to_datetime(df['created_at'])

            daily = df.groupby(df['created_at'].dt.date).size()

            return {
                "dates": [str(d) for d in daily.index],
                "completed_counts": daily.cumsum().tolist(),
                "total_counts": [len(df)] * len(daily),
                "velocity_trend": daily.rolling(3).mean().fillna(0).tolist(),

                # placeholders for now
                "prediction_dates": [],
                "backlog_prediction": [],
                "incoming_prediction": []
            }

        except Exception as e:
            print("History generation error:", e)
            return {
                "dates": [],
                "completed_counts": [],
                "total_counts": [],
                "velocity_trend": [],
                "prediction_dates": [],
                "backlog_prediction": [],
                "incoming_prediction": []
            }

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