"""Local real-API settings for recovery tests; never an alternative production setup."""

import os
from urllib.parse import urlsplit

from config.settings.development import *  # noqa: F401, F403

_database = urlsplit(os.environ["DATABASE_URL"])
_redis = urlsplit(os.environ["REDIS_URL"])
_preview = os.environ.get("RECOVERY_PREVIEW_ORIGIN", "http://127.0.0.1:4181")
_origin = urlsplit(_preview)
_loopback = {"127.0.0.1", "localhost", "::1"}

if (_database.hostname not in _loopback
        or not _database.path.removeprefix("/").startswith("bolt_recovery_")
        or _redis.hostname not in _loopback
        or _origin.hostname not in _loopback
        or _origin.scheme != "http"
        or _origin.username or _origin.password or _origin.path or _origin.query or _origin.fragment):
    raise ValueError("Recovery tests require an isolated local database, cache and preview.")

# Keep production settings untouched and permit only this additional local preview.
CORS_ALLOWED_ORIGINS = [*CORS_ALLOWED_ORIGINS, _preview]  # noqa: F405
