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
    attempt = record_attempt(session_with_template, 0, 1, "1 + 1", 2, 2, 500)
    assert attempt.is_correct is True
    assert QuestionAttempt.objects.filter(session=session_with_template).count() == 1


@pytest.mark.django_db
def test_record_attempt_incorrect(session_with_template):
    attempt = record_attempt(session_with_template, 0, 1, "1 + 1", 2, 99, 500)
    assert attempt.is_correct is False


@pytest.mark.django_db
def test_record_attempt_duplicate_raises(session_with_template):
    record_attempt(session_with_template, 0, 1, "1 + 1", 2, 2, 500)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            record_attempt(session_with_template, 0, 1, "1 + 1", 2, 99, 1000)


# ---------------------------------------------------------------------------
# finalize_session
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_finalize_creates_progress_record(session_with_template):
    record_attempt(session_with_template, 0, 1, "1 + 1", 2, 2, 500)
    record = finalize_session(session_with_template)
    assert ProgressRecord.objects.filter(session=session_with_template).count() == 1
    assert record.score_correct == 1


@pytest.mark.django_db
def test_finalize_score_total_uses_questions_json(session_with_template):
    # Only 1 of 3 questions answered; score_total must be 3 (not 1)
    record_attempt(session_with_template, 0, 1, "1 + 1", 2, 2, 500)
    record = finalize_session(session_with_template)
    assert record.score_total == 3


@pytest.mark.django_db
def test_finalize_time_taken_is_sum_of_elapsed_not_wall_clock(session_with_template):
    # Sum-of-elapsed = 3500 + 4500 = 8000 ms = 8 seconds.
    # Wall-clock for a test run is <1 second → 0 seconds via integer div.
    # Asserting == 8 therefore only passes with the sum-of-elapsed definition.
    record_attempt(session_with_template, 0, 1, "1+1", 2, 2, 3500)
    record_attempt(session_with_template, 1, 1, "2+2", 4, 4, 4500)
    record = finalize_session(session_with_template)
    assert record.time_taken_sec == 8  # 3500ms + 4500ms = 8000ms = 8s


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


# ---------------------------------------------------------------------------
# Fix 2C — LevelCompletion best_progress_record update logic
# ---------------------------------------------------------------------------


@pytest.fixture
def session2(user, template1):
    return ArenaSessionFactory(user=user, template=template1)


@pytest.mark.django_db
def test_level_completion_updates_best_record_on_better_accuracy(user, session_with_template, session2, template1):
    # First session: 1/3 correct
    record_attempt(session_with_template, 0, 1, "1+1", 2, 2, 500)
    first_record = finalize_session(session_with_template)

    # Second session: 3/3 correct — should replace best
    for i in range(3):
        record_attempt(session2, i, 1, "1+1", 2, 2, 500)
    second_record = finalize_session(session2)

    completion = LevelCompletion.objects.get(user=user, level=template1.lesson.level, kind="CLASSWORK")
    assert completion.best_progress_record_id == second_record.id


@pytest.mark.django_db
def test_level_completion_keeps_best_record_when_new_is_worse(user, session_with_template, session2, template1):
    # First session: 3/3 correct (perfect)
    for i in range(3):
        record_attempt(session_with_template, i, 1, "1+1", 2, 2, 500)
    first_record = finalize_session(session_with_template)

    # Second session: 1/3 correct — should NOT replace best
    record_attempt(session2, 0, 1, "1+1", 2, 2, 500)
    finalize_session(session2)

    completion = LevelCompletion.objects.get(user=user, level=template1.lesson.level, kind="CLASSWORK")
    assert completion.best_progress_record_id == first_record.id


# ---------------------------------------------------------------------------
# Fix 2D — finalize_session sequential double-call test
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_finalize_session_sequential_double_call_raises_value_error_not_integrity_error(session_with_template):
    """Simulates the race condition via sequential calls — select_for_update prevents IntegrityError."""
    finalize_session(session_with_template)
    with pytest.raises(ValueError):
        finalize_session(session_with_template)


# ---------------------------------------------------------------------------
# Fix 3C — ProgressRecord append-only
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_progress_record_update_raises_value_error(session_with_template):
    record = finalize_session(session_with_template)
    with pytest.raises(ValueError, match="append-only"):
        record.save()


# ---------------------------------------------------------------------------
# Zero XP on retake (lesson-granular)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_retake_of_completed_lesson_earns_zero_xp(user, session_with_template, session2):
    """Second finalize of the same lesson+kind earns 0 XP but still records progress."""
    record_attempt(session_with_template, 0, 1, "1+1", 2, 2, 500)
    first_record = finalize_session(session_with_template)
    assert first_record.xp_earned > 0

    # Retake: same template/lesson, perfect score this time.
    for i in range(3):
        record_attempt(session2, i, 1, "1+1", 2, 2, 500)
    retake_record = finalize_session(session2)

    assert retake_record.xp_earned == 0
    # ProgressRecord and accuracy are still recorded for the retake.
    assert retake_record.score_correct == 3
    # The retake's XPEvent carries a zero delta (no farming), original event unchanged.
    retake_event = XPEvent.objects.get(source_session=session2)
    assert retake_event.delta == 0
    first_event = XPEvent.objects.get(source_session=session_with_template)
    assert first_event.delta > 0


@pytest.mark.django_db
def test_practice_session_still_earns_xp_on_every_finalize(user, practice_session):
    """Regression guard: practice (template=None) is never a retake — XP awarded each time."""
    for i in range(3):
        record_attempt(practice_session, i, 1, "1+1", 2, 2, 500)
    record = finalize_session(practice_session)
    assert record.xp_earned > 0
    assert XPEvent.objects.get(source_session=practice_session).delta > 0
