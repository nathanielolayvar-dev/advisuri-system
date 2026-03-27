from datetime import datetime, timedelta
from io import BytesIO

from django.core.mail import EmailMessage
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer

# Services
from .chart_service import (
    generate_balance_chart,
    generate_bandwidth_chart,
    generate_buffer_chart,
    generate_forecast_chart,
    generate_pulse_chart,
    generate_prediction_chart,
    generate_risk_chart,
    generate_velocity_chart,
)

# Local
from .services import get_weekly_data, get_weekly_summary, get_daily_completion_chart

def generate_pdf_report():
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer)

    styles = getSampleStyleSheet()
    elements = []

    analytics = get_weekly_analytics()

    summary = analytics["summary"]
    daily = analytics["daily"]

    today = datetime.today()
    start_of_week = today - timedelta(days=6)

    elements.append(Paragraph("<b>WEEKLY ANALYTICS REPORT</b>", styles['Title']))
    elements.append(Spacer(1, 12))

    elements.append(
        Paragraph(
            f"Reporting Period: {start_of_week.strftime('%B %d, %Y')} - {today.strftime('%B %d, %Y')}",
            styles['Normal'],
        )
    )
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("<b>Executive Summary</b>", styles['Heading2']))

    elements.append(
        Paragraph(
            f"""
            Total Tasks: {summary['total_tasks']}<br/>
            Completed Tasks: {summary['completed']}<br/>
            Overdue Tasks: {summary['overdue']}<br/>
            Average Completion Rate: {summary['avg_completion']}%
            """,
            styles['Normal'],
        )
    )

    elements.append(Spacer(1, 20))

    def add_chart(title, chart_func):
        elements.append(Paragraph(f"<b>{title}</b>", styles['Heading2']))
        elements.append(Spacer(1, 10))

        chart = chart_func()
        elements.append(Image(chart, width=400, height=250))

        elements.append(Spacer(1, 20))

    add_chart("1. Completion Forecast", generate_forecast_chart)
    add_chart("2. Task Velocity", generate_velocity_chart)
    add_chart("3. Contribution Balance", generate_balance_chart)
    add_chart("4. Workload Prediction", generate_prediction_chart)
    add_chart("5. Milestone Buffer", generate_buffer_chart)
    add_chart("6. Activity Pulse", generate_pulse_chart)
    add_chart("7. Team Bandwidth", generate_bandwidth_chart)
    add_chart("8. Risk Overview", generate_risk_chart)

    elements.append(Paragraph("<b>Analysis & Insights</b>", styles['Heading2']))

    if summary['avg_completion'] >= 80:
        insight = "Overall performance is excellent."
    elif summary['avg_completion'] >= 60:
        insight = "Performance is moderate with room for improvement."
    else:
        insight = "Performance is below expectations."

    elements.append(Paragraph(insight, styles['Normal']))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("<b>Conclusion</b>", styles['Heading2']))
    elements.append(
        Paragraph(
            "Continuous monitoring and timely interventions are essential to improving productivity.",
            styles['Normal'],
        )
    )

    doc.build(elements)

    buffer.seek(0)
    return buffer

def send_report_email(to_email, pdf_buffer):
    pdf_buffer = generate_pdf_report()

    email = EmailMessage(
        subject="Weekly Analytics Report",
        body="Attached is your automated analytics report.",
        to=[to_email],
    )

    email.attach(
        "weekly_report.pdf",
        pdf_buffer.getvalue(),
        "application/pdf",
    )

    email.send()