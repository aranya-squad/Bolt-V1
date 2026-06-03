"""
Progress write layer. Only this module writes to append-only progress tables.
No other code should call .save() on ProgressRecord, QuestionAttempt, or XPEvent directly.
"""

from django.db import transaction
from django.utils import timezone

from apps.exercises.models import ArenaSession

from .models import LessonCompletion, LevelCompletion, ProgressRecord, QuestionAttempt, XPEvent, XPEventType
from .xp_rules import compute_session_xp


def record_attempt(
    session: ArenaSession,
    question_index: int,
    attempt_number: int,
    question_text: str,
    expected_answer: int,
    submitted_answer: int,
    elapsed_ms: int,
) -> QuestionAttempt:
    """Write a single question attempt. Raises IntegrityError on duplicate (index, attempt_number)."""
    is_correct = submitted_answer == expected_answer
    return QuestionAttempt.objects.create(
        session=session,
        question_index=question_index,
        attempt_number=attempt_number,
        question_text=question_text,
        expected_answer=expected_answer,
        submitted_answer=submitted_answer,
        is_correct=is_correct,
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
    session = ArenaSession.objects.select_for_update().get(pk=session.pk)
    if session.submitted_at is not None:
        raise ValueError(f"Session {session.id} is already finalized")

    attempts = list(session.attempts.all())
    score_correct = sum(1 for a in attempts if a.is_correct)
    # Use total questions in session, not submitted attempts — partial sessions
    # (e.g. timer expired) should show "8/30", not "8/8".
    score_total = len(session.questions_json)
    elapsed_total = sum(a.elapsed_ms for a in attempts) // 1000

    accuracy = (score_correct / score_total * 100) if score_total else 0

    # Acquire LevelCompletion lock before computing is_first so that concurrent
    # finalize calls cannot both see is_first=True and double-award the first-completion bonus.
    if session.template is not None:
        lesson = session.template.lesson
        level = lesson.level
        level_completion = (
            LevelCompletion.objects
            .select_for_update()
            .filter(user=session.user, level=level, kind=session.kind)
            .first()
        )
        is_first = level_completion is None
    else:
        lesson = level = level_completion = None
        is_first = False

    xp = compute_session_xp(score_correct, score_total, is_first)

    record = ProgressRecord.objects.create(
        session=session,
        user=session.user,
        score_correct=score_correct,
        score_total=score_total,
        accuracy_pct=round(accuracy, 2),
        time_taken_sec=elapsed_total,
        xp_earned=xp,
    )

    XPEvent.objects.create(
        user=session.user,
        event_type=XPEventType.SESSION_COMPLETE,
        delta=xp,
        source_session=session,
    )

    if session.template is not None:
        # Level-granular completion (lock already held above)
        if level_completion is None:
            LevelCompletion.objects.create(
                user=session.user,
                level=level,
                kind=session.kind,
                best_progress_record=record,
            )
        elif _is_better_record(record, level_completion.best_progress_record):
            level_completion.best_progress_record = record
            level_completion.save(update_fields=["best_progress_record"])

        # Lesson-granular completion (drives PathOfConquest accordion status chips)
        lesson_existing = (
            LessonCompletion.objects
            .select_for_update()
            .filter(user=session.user, lesson=lesson, kind=session.kind)
            .first()
        )
        if lesson_existing is None:
            LessonCompletion.objects.create(
                user=session.user,
                lesson=lesson,
                kind=session.kind,
                best_accuracy_pct=record.accuracy_pct,
                best_progress_record=record,
            )
        elif _is_better_record(record, lesson_existing.best_progress_record):
            lesson_existing.best_accuracy_pct = record.accuracy_pct
            lesson_existing.best_progress_record = record
            lesson_existing.save(update_fields=["best_accuracy_pct", "best_progress_record"])

    from django.core.cache import cache
    cache.delete(f"user_stats:{session.user_id}")

    session.submitted_at = timezone.now()
    session.save(update_fields=["submitted_at"])

    return record
