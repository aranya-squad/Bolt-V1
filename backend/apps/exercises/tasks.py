from celery import shared_task
from django.utils import timezone

from apps.exercises.constants import MAX_SESSION_SECONDS


@shared_task
def abandon_stale_sessions():
    """
    Mark sessions abandoned_at when no activity has occurred for > 2× time_limit_sec.
    Runs every 5 minutes via Celery beat (see CELERY_BEAT_SCHEDULE in base.py).

    For ZEN sessions (time_limit_sec=0), MAX_SESSION_SECONDS is used as the timeout.
    """
    from datetime import timedelta

    from apps.exercises.models import ArenaSession

    now = timezone.now()
    active_qs = (
        ArenaSession.objects
        .filter(submitted_at__isnull=True, abandoned_at__isnull=True)
        .only("id", "started_at", "config_json")
    )

    to_abandon = []
    # Use iterator() to stream rows in chunks rather than loading all into memory.
    for session in active_qs.iterator(chunk_size=500):
        limit_sec = session.config_json.get("time_limit_sec") or MAX_SESSION_SECONDS
        cutoff = session.started_at + timedelta(seconds=limit_sec * 2)
        if now > cutoff:
            to_abandon.append(session.id)

    if to_abandon:
        ArenaSession.objects.filter(id__in=to_abandon).update(abandoned_at=now)

    return {"abandoned": len(to_abandon)}
