"""Real-auth settings restricted to the synthetic teacher browser runtime."""

import os
from urllib.parse import urlsplit

from config.settings.base import *  # noqa: F401, F403

_database = urlsplit(os.environ["DATABASE_URL"])
_redis = urlsplit(os.environ["REDIS_URL"])
_preview = os.environ.get("TEACHER_PREVIEW_ORIGIN", "http://127.0.0.1:4182")
_origin = urlsplit(_preview)
_loopback = {"127.0.0.1", "localhost", "::1"}
if (
    os.environ.get("REPLICA_DATABASE_URL")
    or _database.hostname not in _loopback
    or _database.path != "/bolt_teacher_browser"
    or _redis.hostname not in _loopback
    or _redis.path != "/14"
    or _origin.hostname not in _loopback
    or _origin.scheme != "http"
    or _origin.username or _origin.password or _origin.path or _origin.query or _origin.fragment
):
    raise ValueError("Teacher browser tests require isolated loopback database/cache/preview without replicas.")

DEBUG = False
ALLOWED_HOSTS = list(_loopback)
CORS_ALLOWED_ORIGINS = [_preview]
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
