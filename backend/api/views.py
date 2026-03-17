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

# Models, Analytic Engine & Serializers
from .models import TaskNote, Task, Message, Group, Document
from .serializers import NoteSerializer, TaskSerializer, MessageSerializer, GroupSerializer, DocumentSerializer
from .analytics.analytics_engine import AnalyticsEngine
import pandas as pd

import psycopg2
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
    cur = conn.cursor()
    cur.execute(query, params)
    
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    
    cur.close()
    conn.close()

    return [dict(zip(columns, row)) for row in rows]

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
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        # 1. Validate group
        try:
            group_data = fetch_supabase_data(
                "SELECT * FROM group WHERE id = %s",
                (str(group_id),)
            )

            if not group_data:
                return Response({"error": "Group not found"}, status=404)

            group = group_data[0]
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

        # 2. Fetch data from DB
        tasks_data = fetch_supabase_data(
            "SELECT * FROM task WHERE group_id = %s",
            (str(group_id),)
        )

        messages_data = fetch_supabase_data(
            "SELECT * FROM message WHERE group_id = %s",
            (str(group_id),)
        )

        # 3. Convert to DataFrames
        tasks_df = pd.DataFrame(tasks_data)
        messages_df = pd.DataFrame(messages_data)

        # Debug (optional but recommended)
        print("Tasks fetched:", len(tasks_data))
        print("Messages fetched:", len(messages_data))

        # 4. Initialize engine
        engine = AnalyticsEngine(tasks_df, messages_df)

        # 5. Prepare inputs
        deadline_str = group.get("deadline", "2026-12-31")

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

        # Ensure correct column exists
        assignee_col = "assignee_id" if "assignee_id" in tasks_df.columns else "assigned_to"

        for member in group.members.all():
            member_tasks = tasks_df[
                (tasks_df[assignee_col] == member.id) &
                (tasks_df['progress_percentage'] < 100)
            ]

            load_count = len(member_tasks)

            # FIX: call local method (NOT engine unless moved there)
            risk_score = self.predict_member_bandwidth(member.id, load_count)

            report.append({
                "name": member.username,
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