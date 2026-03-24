from django.core.mail import EmailMessage

def send_report_email(to_email, pdf_buffer):
    email = EmailMessage(
        subject='Weekly Report',
        body='Attached is your weekly analytics report.',
        to=[to_email],
    )

    email.attach('weekly_report.pdf', pdf_buffer.read(), 'application/pdf')
    email.send()