from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO

def generate_weekly_report(data):
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)

    p.drawString(100, 750, "Weekly Analytics Report")
    p.drawString(100, 720, f"Completion Rate: {data['completion_rate']}%")
    p.drawString(100, 700, f"Overdue Tasks: {data['overdue_tasks']}")

    p.save()
    buffer.seek(0)

    return buffer