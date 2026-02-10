from django.contrib.auth import get_user_model 
from django.utils import timezone
from rest_framework import generics, permissions, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response

# Models, Analytic Engine & Serializers
from .models import TaskNote, Task, Message, Group
from .serializers import NoteSerializer, TaskSerializer, MessageSerializer, GroupSerializer
from .analytics_engine import AnalyticsEngine

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

# Handles the logic for all 10 features by calling the methods
class GroupAnalyticsDashboard(APIView):
    def get(self, request, group_id):
        # 1. Gather raw data
        group = Group.objects.get(id=group_id)
        tasks = Task.objects.filter(group=group)
        messages = Message.objects.filter(group=group)
        
        # 2. Initialize the Scikit-Learn Engine
        engine = AnalyticsEngine(tasks, messages)
        
        # 3. Calculate all 9 features (Mapping to your specific list)
        forecast_date, velocity = engine.get_completion_forecast(tasks.count())
        
        # Calculate Milestone Buffer (Days between deadline and forecast)
        buffer_days = 0
        if forecast_date and group.deadline:
            buffer_days = (group.deadline - forecast_date.date()).days

        context = {
            # Descriptive Features
            "activity_pulse": engine.get_activity_pulse(),
            "task_velocity": velocity,
            "contribution_balance": engine.get_contribution_balance(),
            
            # Predictive Features (ML-based)
            "at_risk_status": engine.predict_at_risk(
                overdue_tasks=tasks.filter(due_date__lt=timezone.now(), status__ne='Completed').count(),
                inactivity_days=5 # This would be calculated from last activity timestamp
            ),
            "tone_analysis": engine.analyze_tone(list(messages.values_list('content', flat=True))),
            "workload_prediction": engine.predict_workload_burnout(tasks.count()),
            
            # Forecasting Features
            "completion_forecast": forecast_date.strftime("%Y-%m-%d") if forecast_date else "N/A",
            "milestone_buffer": buffer_days,
            "member_bandwidth": self.get_member_bandwidth_report(group, engine)
        }

        return Response(context)

    def get_member_bandwidth_report(self, group, engine):
        # Feature: Member Bandwidth (Calculated for each member in group)
        report = []
        for member in group.members.all():
            load = Task.objects.filter(assigned_to=member, status='In Progress').count()
            report.append({
                "name": member.username,
                "risk_score": engine.predict_member_bandwidth(member.id, load)
            })
        return report