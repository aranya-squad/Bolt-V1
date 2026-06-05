"""Tests for Celery tasks in apps.exercises."""
import pytest
from datetime import timedelta

from django.utils import timezone

from apps.exercises.models import ArenaSession
from apps.exercises.tasks import abandon_stale_sessions
from apps.exercises.tests.factories import ArenaSessionFactory
from apps.users.tests.factories import GuardianFactory


@pytest.fixture
def user():
    return GuardianFactory()


@pytest.mark.django_db
def test_abandon_stale_sessions_flags_expired_session(user):
    """A session whose started_at is older than 2×time_limit_sec is flagged abandoned."""
    session = ArenaSessionFactory(
        user=user,
        config_json={
            "operation": "ADD",
            "digits": 1,
            "rows": 2,
            "question_count": 3,
            "time_limit_sec": 60,
        },
    )
    # Backdate started_at to 3 minutes ago — exceeds 2×60s = 120s cutoff.
    ArenaSession.objects.filter(pk=session.pk).update(
        started_at=timezone.now() - timedelta(minutes=3)
    )

    result = abandon_stale_sessions()

    session.refresh_from_db()
    assert session.abandoned_at is not None
    assert result["abandoned"] == 1


@pytest.mark.django_db
def test_abandon_stale_sessions_ignores_active_session(user):
    """A session still within its time limit is not touched."""
    session = ArenaSessionFactory(
        user=user,
        config_json={
            "operation": "ADD",
            "digits": 1,
            "rows": 2,
            "question_count": 3,
            "time_limit_sec": 600,
        },
    )
    # started_at is now — well within 2×600s = 20 minutes cutoff.
    result = abandon_stale_sessions()

    session.refresh_from_db()
    assert session.abandoned_at is None
    assert result["abandoned"] == 0


@pytest.mark.django_db
def test_abandon_stale_sessions_ignores_already_finalized(user):
    """Submitted sessions are skipped regardless of age."""
    session = ArenaSessionFactory(user=user)
    ArenaSession.objects.filter(pk=session.pk).update(
        started_at=timezone.now() - timedelta(hours=2),
        submitted_at=timezone.now(),
    )

    result = abandon_stale_sessions()

    session.refresh_from_db()
    assert session.abandoned_at is None
    assert result["abandoned"] == 0


@pytest.mark.django_db
def test_abandon_stale_sessions_ignores_already_abandoned(user):
    """Sessions already marked abandoned are not touched again."""
    session = ArenaSessionFactory(user=user)
    abandoned_time = timezone.now() - timedelta(hours=1)
    ArenaSession.objects.filter(pk=session.pk).update(
        started_at=timezone.now() - timedelta(hours=2),
        abandoned_at=abandoned_time,
    )

    abandon_stale_sessions()

    session.refresh_from_db()
    assert session.abandoned_at == abandoned_time


@pytest.mark.django_db
def test_abandon_stale_sessions_zen_uses_max_session_seconds(user):
    """ZEN sessions (time_limit_sec=0) use MAX_SESSION_SECONDS as the timeout."""
    from apps.exercises.constants import MAX_SESSION_SECONDS

    session = ArenaSessionFactory(
        user=user,
        kind="ZEN",
        template=None,
        config_json={
            "operation": "ADD",
            "digits": 1,
            "rows": 2,
            "question_count": 3,
            "time_limit_sec": 0,
        },
    )
    # 30 seconds old — well within 2×3600s = 7200s cutoff.
    ArenaSession.objects.filter(pk=session.pk).update(
        started_at=timezone.now() - timedelta(seconds=30)
    )

    result = abandon_stale_sessions()

    session.refresh_from_db()
    assert session.abandoned_at is None
    assert result["abandoned"] == 0

    # Now backdate past 2×MAX_SESSION_SECONDS.
    ArenaSession.objects.filter(pk=session.pk).update(
        started_at=timezone.now() - timedelta(seconds=MAX_SESSION_SECONDS * 2 + 60)
    )

    result = abandon_stale_sessions()

    session.refresh_from_db()
    assert session.abandoned_at is not None
    assert result["abandoned"] == 1
