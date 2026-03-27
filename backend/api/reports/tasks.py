from celery import shared_task
from api.supabase_client import supabase

from .services import get_teachers
from .email_service import send_report_email, generate_pdf_report

def get_teachers():
    response = (
        supabase
        .table("users")
        .select("email, role")
        .eq("role", "teacher")
        .execute()
    )

    return response.data or []

@shared_task
def send_weekly_report_task():
    print("TASK RUNNING")  # temporary test

    # Get all teachers
    teachers = get_teachers()

    # Generate PDF ONCE (important optimization)
    pdf_buffer = generate_pdf_report()

    # Send to each teacher
    for teacher in teachers:
        email = teacher.get("email")

        if email:
            print(f"Sending email to: {email}")  # debug
            pdf_buffer.seek(0)
            send_report_email(email, pdf_buffer)