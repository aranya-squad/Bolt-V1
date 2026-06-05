import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.users.tests.factories import GuardianFactory
from apps.exercises.tests.factories import (
    ArenaSessionFactory,
    ExerciseTemplateFactory,
    LevelFactory,
    LessonFactory,
)
from apps.progress.models import LevelCompletion, ProgressRecord


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def user():
    return GuardianFactory()


@pytest.fixture
def auth_client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def level1():
    return LevelFactory(order=1)


@pytest.fixture
def level2(level1):
    return LevelFactory(order=2)


@pytest.fixture
def template1(level1):
    lesson = LessonFactory(level=level1)
    return ExerciseTemplateFactory(lesson=lesson)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _make_level_completion(user, level, template):
    """Create the minimal object chain required for a LevelCompletion."""
    session = ArenaSessionFactory(user=user, template=template)
    record = ProgressRecord.objects.create(
        session=session,
        user=user,
        score_correct=3,
        score_total=3,
        accuracy_pct=100.0,
        time_taken_sec=30,
        xp_earned=80,
    )
    return LevelCompletion.objects.create(
        user=user,
        level=level,
        kind="CLASSWORK",
        best_progress_record=record,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_level_list_requires_auth():
    response = APIClient().get(reverse("level-list"))
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_level_list_returns_levels_ordered(auth_client, level1, level2):
    response = auth_client.get(reverse("level-list"))
    assert response.status_code == status.HTTP_200_OK
    results = response.json()["results"]
    assert len(results) == 2
    assert results[0]["order"] == 1
    assert results[1]["order"] == 2


@pytest.mark.django_db
def test_level1_never_locked(auth_client, level1):
    response = auth_client.get(reverse("level-list"))
    assert response.status_code == status.HTTP_200_OK
    level1_data = next(d for d in response.json()["results"] if d["order"] == 1)
    assert level1_data["is_locked"] is False


@pytest.mark.django_db
def test_level2_locked_when_level1_incomplete(auth_client, level1, level2):
    response = auth_client.get(reverse("level-list"))
    assert response.status_code == status.HTTP_200_OK
    level2_data = next(d for d in response.json()["results"] if d["order"] == 2)
    assert level2_data["is_locked"] is True


@pytest.mark.django_db
def test_level2_unlocked_after_level1_completion(auth_client, user, level1, level2, template1):
    _make_level_completion(user, level1, template1)
    response = auth_client.get(reverse("level-list"))
    level2_data = next(d for d in response.json()["results"] if d["order"] == 2)
    assert level2_data["is_locked"] is False


@pytest.mark.django_db
def test_level_is_completed_true(auth_client, user, level1, template1):
    _make_level_completion(user, level1, template1)
    response = auth_client.get(reverse("level-list"))
    level1_data = next(d for d in response.json()["results"] if d["order"] == 1)
    assert level1_data["is_completed"] is True


@pytest.mark.django_db
def test_level_detail(auth_client, level1):
    response = auth_client.get(reverse("level-detail", kwargs={"pk": level1.id}))
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["order"] == 1
    assert "is_locked" in data
    assert "is_completed" in data


# ---------------------------------------------------------------------------
# Cache-Control headers
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_level_list_has_private_cache_control(auth_client, level1):
    response = auth_client.get(reverse("level-list"))
    cc = response.get("Cache-Control", "")
    assert "private" in cc
    assert "max-age=30" in cc


@pytest.mark.django_db
def test_level_detail_has_private_cache_control(auth_client, level1):
    response = auth_client.get(reverse("level-detail", kwargs={"pk": level1.id}))
    cc = response.get("Cache-Control", "")
    assert "private" in cc


# ---------------------------------------------------------------------------
# level_context Redis cache — population and invalidation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_level_context_cache_populated_on_first_request(auth_client, user, level1):
    from django.core.cache import cache
    cache.delete(f"level_context:{user.pk}")

    auth_client.get(reverse("level-list"))

    cached = cache.get(f"level_context:{user.pk}")
    assert cached is not None
    assert "completed_level_ids" in cached
    assert "ordered_level_ids" in cached


@pytest.mark.django_db(transaction=True)
def test_level_context_cache_invalidated_by_finalize_session(user, template1, level1):
    # transaction=True is required: transaction.on_commit fires only on real COMMIT.
    # The default @pytest.mark.django_db wraps tests in a rolled-back transaction,
    # so on_commit callbacks never fire in that mode.
    from django.core.cache import cache
    from apps.exercises.tests.factories import ArenaSessionFactory
    from apps.progress.services import finalize_session, record_attempt

    # Pre-populate the cache with stale data (no completions yet).
    cache.set(f"level_context:{user.pk}", {"completed_level_ids": set(), "ordered_level_ids": []}, 60)

    session = ArenaSessionFactory(user=user, template=template1)
    record_attempt(session, 0, 1, "1+1", 2, 2, 500)
    finalize_session(session)

    # on_commit fires because the transaction was genuinely committed.
    assert cache.get(f"level_context:{user.pk}") is None
