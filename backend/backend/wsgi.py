"""
WSGI config for advisuri project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
import sys
from django.core.wsgi import get_wsgi_application


# This line tells Python to look 
# inside the current folder for the 'advisuri' module
# Get the path of the 'backend' folder
path = os.path.dirname(os.path.abspath(__file__))
if path not in sys.path:
    sys.path.append(path)

# Set the DJANGO_SETTINGS_MODULE environment variable
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'advisuri.settings')

application = get_wsgi_application()

app = application  # Vercel looks for 'app' specifically