from .base import *  # noqa: F401, F403

DEBUG = True

# Broad CORS for local dev
CORS_ALLOW_ALL_ORIGINS = True

INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405

MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]  # noqa: F405

INTERNAL_IPS = ["127.0.0.1"]

# Readable logs in dev
LOGGING["formatters"]["console"] = {  # noqa: F405
    "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
}
LOGGING["handlers"]["console"]["formatter"] = "console"  # noqa: F405
