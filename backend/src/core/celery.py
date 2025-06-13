from celery import Celery
import os

from core import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("core")

# FIX: ensure your app is listed here
app.config_from_object("django.conf:settings", namespace="CELERY")

# Ensure autodiscover includes cpso
# app.autodiscover_tasks(["cpso", "certification_tracking"])
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)

