from celery import shared_task
from django.contrib.auth import get_user_model

from .email_service import send_report_email, generate_pdf_report

User = get_user_model()

@shared_task
def send_weekly_report_task():
    # ✅ Get all teachers
    teachers = User.objects.filter(
        role='teacher',
        chat_groups__isnull=False
    ).distinct()

    # ✅ Generate PDF ONCE (important optimization)
    pdf_buffer = generate_pdf_report()

    # ✅ Send to each teacher
    for teacher in teachers:
        if teacher.email:
            pdf_buffer.seek(0)  # ✅ reset buffer
            send_report_email(teacher.email, pdf_buffer)