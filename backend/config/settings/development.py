from .base import *  # noqa: F401, F403

DEBUG = True

# Do NOT use CORS_ALLOW_ALL_ORIGINS — incompatible with CORS_ALLOW_CREDENTIALS (browsers reject it)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405

MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]  # noqa: F405

INTERNAL_IPS = ["127.0.0.1"]

# Readable logs in dev
LOGGING["formatters"]["console"] = {  # noqa: F405
    "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
}
LOGGING["handlers"]["console"]["formatter"] = "console"  # noqa: F405
