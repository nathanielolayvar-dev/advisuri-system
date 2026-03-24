from celery import shared_task
from .services import send_weekly_reports

@shared_task
def send_weekly_reports_task():
    send_weekly_reports()