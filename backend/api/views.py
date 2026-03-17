from django.contrib.auth import get_user_model 
from django.utils import timezone
from rest_framework import generics, permissions, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

# Models, Analytic Engine & Serializers
from .models import TaskNote, Task, Message, Group, Document
from .serializers import NoteSerializer, TaskSerializer, MessageSerializer, GroupSerializer, DocumentSerializer
from .analytics.analytics_engine import AnalyticsEngine
import pandas as pd

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
    def get(self, request, group_id):
        # 1. Gather raw data from Django ORM
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)
        
        # Use .values() to get dictionary format for Pandas conversion
        tasks_qs = Task.objects.filter(group_id=group_id).values()
        messages_qs = Message.objects.filter(group_id=group_id).values()

        # 2. Convert to DataFrames (The Engine Bridge)
        tasks_df = pd.DataFrame(list(tasks_qs))
        messages_df = pd.DataFrame(list(messages_qs))
        
        # 3. Initialize the Engine with the data
        engine = AnalyticsEngine(tasks_df, messages_df)
        
        # 4. Format inputs for the Engine
        # Convert group deadline to string "YYYY-MM-DD"
        deadline_str = group.deadline.strftime("%Y-%m-%d") if group.deadline else "2026-12-31"
        # Use the currently logged-in user's ID
        current_user_id = request.user.id

        # 5. Run the "Health Snapshot"
        # This one call executes algorithms in analytics_engine.py and returns a combined report
        analysis_results = engine.run_comprehensive_analysis(deadline_str, request.user.id)
        # Add the member-specific report to the final response
        analysis_results["member_report"] = self.get_member_bandwidth_report(
            group, 
            tasks_df, 
            engine
        )
        # 6. Return the finalized Health Snapshot directly
        return Response(analysis_results)

    def get_member_bandwidth_report(self, group, tasks_df, engine):
        """
        Calculates bandwidth for all members using the pre-loaded tasks DataFrame.
        """
        report = []
        if tasks_df.empty:
            return report
        
        # Iterate through members of the group
        for member in group.members.all():
            # 1. Filter the existing DataFrame for this member's active tasks
            # Matches your column 'assigned_to' and 'progress_percentage'
            member_tasks = tasks_df[
                (tasks_df['assigned_to'] == member.id) & 
                (tasks_df['progress_percentage'] < 100)
            ]
            
            load_count = len(member_tasks)

            # 2. Get the AI prediction from the engine
            # This uses your ML model logic internally
            risk_score = engine.predict_member_bandwidth(member.id, load_count)
            
            report.append({
                "name": member.username,
                "active_tasks": load_count,
                "risk_score": risk_score, # e.g., "High", "Low", or a 0-100 value
                "status_color": "red" if load_count > 5 else "yellow" if load_count > 3 else "green"
            })
            
        return report

    def predict_member_bandwidth(self, member_id, load_count):
        """
        Goal: Determine if a specific user is overwhelmed.
        Uses 'load_count' (tasks where progress < 100).
        """
        # If the user has zero tasks, they have 100% bandwidth
        if load_count == 0:
            return "Optimal"

        # Threshold logic (You can later replace this with a ML model call)
        if load_count >= 7:
            return "Critical"
        elif load_count >= 4:
            return "High"
        elif load_count >= 2:
            return "Balanced"
        else:
            return "Low"