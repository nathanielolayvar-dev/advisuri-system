from celery import shared_task
from api.supabase_client import supabase

from .services import get_weekly_analytics
from .email_service import send_report_email, generate_pdf_report

def get_teachers():
    response = (
        supabase
        .table("users")
        .select("user_id, email, role")
        .eq("role", "teacher")
        .execute()
    )

    return response.data or []

def get_teacher_groups(teacher_id):
    response = (
        supabase
        .table("group_members")
        .select("groups(group_id, group_name)") # assumes FK relationship exists
        .eq("user_id", teacher_id)
        .execute()
    )
    return [item["groups"] for item in response.data]

@shared_task
def send_weekly_report_task():
    print("TASK RUNNING")

    teachers = get_teachers()

    for teacher in teachers:
        email = teacher.get("email")
        teacher_id = teacher.get("user_id")

            #  DEBUG PRINTS 
        print("Teacher object:", teacher)
        print("Teacher ID:", teacher_id)

        if not email:
            continue

        groups = get_teacher_groups(teacher_id)

        attachments = []

        for group in groups:
            # ✅ get group-specific analytics
            analytics = get_weekly_analytics(group["group_id"])

            # ✅ generate group-specific PDF
            pdf_buffer = generate_pdf_report(group, analytics)

            pdf_buffer.seek(0)

            attachments.append({
                "filename": f"{group['group_id']}_{group['group_name']}_report.pdf",
                "file": pdf_buffer
            })

        if attachments:
            send_report_email(email, attachments)