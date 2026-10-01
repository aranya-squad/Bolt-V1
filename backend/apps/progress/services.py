"""
Progress write layer. Only this module writes to append-only progress tables.
No other code should call .save() on ProgressRecord, QuestionAttempt, or XPEvent directly.
"""

from django.core.cache import cache
from django.db import DEFAULT_DB_ALIAS, transaction
from django.utils import timezone

from apps.exercises.attempt_contract import ContractError, question_verdicts
from apps.exercises.models import ArenaSession, DailyQuest

from .models import (
    LessonCompletion,
    LevelCompletion,
    ProgressRecord,
    QuestionAttempt,
    XPEvent,
    XPEventType,
)
from .xp_rules import compute_session_xp


def record_attempt(
    session: ArenaSession,
    question_index: int,
    attempt_number: int,
    question_text: str,
    expected_answer: int,
    submitted_answer: int,
    elapsed_ms: int,
    is_skip: bool = False,
) -> QuestionAttempt:
    """Write a single question attempt. Raises IntegrityError on duplicate (index, attempt_number)."""
    is_correct = (not is_skip) and (submitted_answer == expected_answer)
    return QuestionAttempt.objects.using(session._state.db or DEFAULT_DB_ALIAS).create(
        session=session,
        question_index=question_index,
        attempt_number=attempt_number,
        question_text=question_text,
        expected_answer=expected_answer,
        submitted_answer=submitted_answer,
        is_correct=is_correct,
        is_skip=is_skip,
        elapsed_ms=elapsed_ms,
    )


def _is_better_record(new: ProgressRecord, old: ProgressRecord) -> bool:
    """3-tier tiebreak: accuracy → score_correct → time_taken_sec (lower is better)."""
    if new.accuracy_pct != old.accuracy_pct:
        return new.accuracy_pct > old.accuracy_pct
    if new.score_correct != old.score_correct:
        return new.score_correct > old.score_correct
    return new.time_taken_sec < old.time_taken_sec


@transaction.atomic
def finalize_session(session: ArenaSession) -> ProgressRecord:
    """
    Compute session results, write ProgressRecord + XPEvent(s), mark session submitted.
    Idempotent: raises ValueError if session already finalized.
    """
    # Lock the row to serialize concurrent finalize attempts from different requests/workers.
    session = (
        ArenaSession.objects.using(DEFAULT_DB_ALIAS)
        .select_for_update(of=("self",))
        .select_related("template__lesson__level")
        .get(pk=session.pk)
    )
    database = session._state.db
    if session.submitted_at is not None:
        raise ValueError(f"Session {session.id} is already finalized")

    if session.abandoned_at is not None:
        raise ValueError(f"Session {session.id} is abandoned")

    attempts = list(session.attempts.db_manager(database).all())
    mission = DailyQuest.objects.using(database).select_for_update().filter(session=session).first()
    if mission is not None:
        accepted = {a.question_index for a in attempts if not a.is_skip and 0 <= a.question_index < 5}
        if len(session.questions_json) != 5 or accepted != set(range(5)):
            raise ContractError("mission_incomplete", "Practice all five questions before completing the mission.", 409)
    verdicts = question_verdicts(attempts, len(session.questions_json))
    score_correct = sum(v in {"correct", "fixed"} for v in verdicts.values())
    # Use total questions in session, not submitted attempts — partial sessions
    # (e.g. timer expired) should show "8/30", not "8/8".
    score_total = len(session.questions_json)
    # time_taken_sec is the sum of per-attempt elapsed_ms, NOT wall-clock duration.
    # Wall-clock includes idle gaps (student walked away mid-session) which would
    # unfairly inflate time and break personal-best tiebreaking. Sum-of-elapsed
    # measures only active thinking time.
    elapsed_total = sum(a.elapsed_ms for a in attempts) // 1000

    accuracy = (score_correct / score_total * 100) if score_total else 0

    # Acquire LevelCompletion lock before computing is_first so that concurrent
    # finalize calls cannot both see is_first=True and double-award the first-completion bonus.
    # Lock order is level-then-lesson; the later best-record updates reuse these same rows.
    if session.template is not None:
        lesson = session.template.lesson
        level = lesson.level
        level_completion = (
            LevelCompletion.objects.using(database)
            .select_for_update(of=("self",))
            .select_related("best_progress_record")
            .filter(user=session.user, level=level, kind=session.kind)
            .first()
        )
        is_first = level_completion is None
        # Retake is lesson-granular: a lesson+kind that already has a completion.
        # (is_first is level-granular and only controls the first-completion bonus.)
        lesson_completion = (
            LessonCompletion.objects.using(database)
            .select_for_update(of=("self",))
            .select_related("best_progress_record")
            .filter(user=session.user, lesson=lesson, kind=session.kind)
            .first()
        )
        is_retake = lesson_completion is not None
    else:
        lesson = level = level_completion = lesson_completion = None
        is_first = False
        is_retake = False

    xp = compute_session_xp(score_correct, score_total, is_first, is_retake)

    record = ProgressRecord.objects.using(database).create(
        session=session,
        user=session.user,
        score_correct=score_correct,
        score_total=score_total,
        accuracy_pct=round(accuracy, 2),
        time_taken_sec=elapsed_total,
        xp_earned=xp,
    )

    XPEvent.objects.using(database).create(
        user=session.user,
        event_type=XPEventType.SESSION_COMPLETE,
        delta=xp,
        source_session=session,
    )

    if session.template is not None:
        # Level-granular completion (lock already held above)
        if level_completion is None:
            LevelCompletion.objects.using(database).create(
                user=session.user,
                level=level,
                kind=session.kind,
                best_progress_record=record,
            )
        elif _is_better_record(record, level_completion.best_progress_record):
            level_completion.best_progress_record = record
            level_completion.save(using=database, update_fields=["best_progress_record"])

        # Lesson-granular completion (drives PathOfConquest accordion status chips).
        # Reuses the lesson_completion row locked above.
        if lesson_completion is None:
            LessonCompletion.objects.using(database).create(
                user=session.user,
                lesson=lesson,
                kind=session.kind,
                best_accuracy_pct=record.accuracy_pct,
                best_progress_record=record,
            )
        elif _is_better_record(record, lesson_completion.best_progress_record):
            lesson_completion.best_accuracy_pct = record.accuracy_pct
            lesson_completion.best_progress_record = record
            lesson_completion.save(using=database, update_fields=["best_accuracy_pct", "best_progress_record"])

    # Invalidate after commit so no request can repopulate the cache with
    # pre-commit state between our delete and the transaction COMMIT.
    user_id = session.user_id
    transaction.on_commit(lambda: cache.delete(f"user_stats:{user_id}"), using=database)
    transaction.on_commit(lambda: cache.delete(f"level_context:{user_id}"), using=database)

    session.submitted_at = timezone.now()
    session.config_json = {**session.config_json, "scoring_version": 2}
    session.save(using=database, update_fields=["submitted_at", "config_json"])
    if mission is not None:
        mission.completed_at = session.submitted_at
        mission.save(using=database, update_fields=["completed_at"])

    return record
