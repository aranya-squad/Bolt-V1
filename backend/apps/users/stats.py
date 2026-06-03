"""
Shared stats helper. Used by both UserMeSerializer and XpProgressView
so the cache key and computation logic stay in one place.
"""

from datetime import timedelta

from django.core.cache import cache
from django.db.models import Sum
from django.utils import timezone


def get_user_stats(user) -> dict:
    """
    Returns {total_xp, streak_days, levels_completed, current_level}.
    Result is cached for 60 s under user_stats:{user.pk}.
    """
    cache_key = f"user_stats:{user.pk}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    from apps.progress.models import LevelCompletion, ProgressRecord, XPEvent

    total_xp = XPEvent.objects.filter(user=user).aggregate(t=Sum("delta"))["t"] or 0

    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    dates = set(
        ProgressRecord.objects.filter(user=user).values_list("created_at__date", flat=True)
    )
    start = today if today in dates else (yesterday if yesterday in dates else None)
    streak = 0
    if start is not None:
        d = start
        while d in dates:
            streak += 1
            d -= timedelta(days=1)

    levels_completed = LevelCompletion.objects.filter(user=user, kind="CLASSWORK").count()

    stats = {
        "total_xp": total_xp,
        "streak_days": streak,
        "levels_completed": levels_completed,
        "current_level": min(levels_completed + 1, 10),
    }
    cache.set(cache_key, stats, timeout=60)
    return stats
