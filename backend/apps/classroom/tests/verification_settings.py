"""Isolated CI test configuration with a genuinely separate stale database."""

import os
from urllib.parse import urlsplit

from config.settings.test import *  # noqa: F401, F403

_loopback = {"127.0.0.1", "localhost", "::1"}
_primary = urlsplit(os.environ["DATABASE_URL"])
_cache = urlsplit(os.environ["REDIS_URL"])
_replica = urlsplit(os.environ.get("CLASSROOM_TEST_REPLICA_DATABASE_URL", ""))
if (
    os.environ.get("REPLICA_DATABASE_URL")
    or _primary.hostname not in _loopback
    or _primary.path != "/bolt_teacher_benchmark"
    or _cache.hostname not in _loopback
    or _cache.path != "/15"
    or (_replica.geturl() and (
        _replica.hostname not in _loopback or _replica.path != "/bolt_teacher_stale_replica"
    ))
):
    raise ValueError("Teacher regression tests require isolated loopback synthetic databases/cache.")

# Specialized tests override the router after separate aliases are migrated.
DATABASE_ROUTERS = []
if env("CLASSROOM_TEST_REPLICA_DATABASE_URL", default=""):  # noqa: F405
    DATABASES["classroom_stale_replica"] = env.db("CLASSROOM_TEST_REPLICA_DATABASE_URL")  # noqa: F405
