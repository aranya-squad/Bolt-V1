"""
Read-replica router for Bolt Abacus.

Active only when DATABASES["replica"] is configured via REPLICA_DATABASE_URL
(see settings/base.py). Safe to include with a single DB — db_for_read falls
back to "default" when "replica" is absent from DATABASES.

Read-only apps routed to the replica:
  courses  — level/lesson data; rarely written, read on every page load
  progress — reports/history; written only on session finalize

Write-heavy apps stay on primary:
  exercises — sessions created/updated per game
  users     — auth writes (login, token rotation)
  classroom — enrollment changes

Post-write reads (e.g. the ProgressRecord returned by finalize_session)
must be routed to primary to avoid stale-read regressions. Callers that
need primary-consistency can pass hints={"primary": True} to force it.
"""

_REPLICA_READ_APPS = frozenset(["courses", "progress"])


class PrimaryReplicaRouter:
    def db_for_read(self, model, **hints):
        if hints.get("primary"):
            return "default"
        from django.conf import settings
        if "replica" in settings.DATABASES and model._meta.app_label in _REPLICA_READ_APPS:
            return "replica"
        return "default"

    def db_for_write(self, model, **hints):
        return "default"

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # Only run migrations on the primary; replica is a streaming replica,
        # not a separate schema target.
        return db == "default"
