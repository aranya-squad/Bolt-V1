import pytest
from django.db import IntegrityError, transaction

from apps.users.tests.factories import GuardianFactory
from apps.exercises.tests.factories import (
    ArenaSessionFactory,
    ExerciseTemplateFactory,
    LevelFactory,
    LessonFactory,
)
from apps.progress.models import LevelCompletion, ProgressRecord, QuestionAttempt, XPEvent
from apps.progress.services import finalize_session, record_attempt


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def user():
    return GuardianFactory()


@pytest.fixture
def template1():
    level = LevelFactory(order=1)
    lesson = LessonFactory(level=level)
    return ExerciseTemplateFactory(lesson=lesson)


@pytest.fixture
def session_with_template(user, template1):
    return ArenaSessionFactory(user=user, template=template1)


@pytest.fixture
def practice_session(user):
    return ArenaSessionFactory(
        user=user,
        template=None,
        kind="ZEN",
        config_json={
            "operation": "ADD",
            "digits": 1,
            "rows": 2,
            "question_count": 3,
            "time_limit_sec": 0,
        },
    )


# ---------------------------------------------------------------------------
# record_attempt
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_record_attempt_correct(session_with_template):
    attempt = record_attempt(session_with_template, 0, "1 + 1", 2, 2, 500)
    assert attempt.is_correct is True
    assert QuestionAttempt.objects.filter(session=session_with_template).count() == 1


@pytest.mark.django_db
def test_record_attempt_incorrect(session_with_template):
    attempt = record_attempt(session_with_template, 0, "1 + 1", 2, 99, 500)
    assert attempt.is_correct is False


@pytest.mark.django_db
def test_record_attempt_duplicate_raises(session_with_template):
    record_attempt(session_with_template, 0, "1 + 1", 2, 2, 500)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            record_attempt(session_with_template, 0, "1 + 1", 2, 99, 1000)


# ---------------------------------------------------------------------------
# finalize_session
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_finalize_creates_progress_record(session_with_template):
    record_attempt(session_with_template, 0, "1 + 1", 2, 2, 500)
    record = finalize_session(session_with_template)
    assert ProgressRecord.objects.filter(session=session_with_template).count() == 1
    assert record.score_correct == 1


@pytest.mark.django_db
def test_finalize_score_total_uses_questions_json(session_with_template):
    # Only 1 of 3 questions answered; score_total must be 3 (not 1)
    record_attempt(session_with_template, 0, "1 + 1", 2, 2, 500)
    record = finalize_session(session_with_template)
    assert record.score_total == 3


@pytest.mark.django_db
def test_finalize_creates_xp_event(user, session_with_template):
    finalize_session(session_with_template)
    event = XPEvent.objects.filter(user=user, event_type="SESSION_COMPLETE").first()
    assert event is not None
    assert event.delta > 0


@pytest.mark.django_db
def test_finalize_creates_level_completion_for_classwork(user, session_with_template, template1):
    finalize_session(session_with_template)
    assert LevelCompletion.objects.filter(
        user=user,
        level=template1.lesson.level,
        kind="CLASSWORK",
    ).exists()


@pytest.mark.django_db
def test_finalize_no_level_completion_for_practice(user, practice_session):
    finalize_session(practice_session)
    assert LevelCompletion.objects.filter(user=user).count() == 0


@pytest.mark.django_db
def test_finalize_already_finalized_raises(session_with_template):
    finalize_session(session_with_template)
    with pytest.raises(ValueError):
        finalize_session(session_with_template)
