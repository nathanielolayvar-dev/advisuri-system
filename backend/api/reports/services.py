from api.supabase_client import supabase
from .utils import generate_weekly_report
from .email_service import send_report_email


def get_teachers():
    response = (
        supabase
        .table("users")   # your table name
        .select("*")
        .eq("role", "teacher")
        .execute()
    )

    if response.data is None:
        return []

    return response.data

def send_weekly_reports():
    data = get_weekly_analytics()

    pdf_buffer = generate_weekly_report(data)

    teachers = get_teachers()

    for teacher in teachers:
        email = teacher.get("email")

        if email:
            pdf_buffer.seek(0)
            send_report_email(email, pdf_buffer)