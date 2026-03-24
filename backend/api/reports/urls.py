from django.urls import path
from .views import send_report

urlpatterns = [
    path('send-report/', send_report),
]