import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

app = Celery("bolt_abacus")
app.config_from_object("django.conf:settings", namespace="CELERY")
# Auto-discover tasks.py in every INSTALLED_APP.
app.autodiscover_tasks()
