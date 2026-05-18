"""
Progress write layer. Only this module writes to append-only progress tables.
No other code should call .save() on ProgressRecord, QuestionAttempt, or XPEvent directly.
"""

from django.db import transaction
from django.utils import timezone

from apps.exercises.models import ArenaSession

from .models import LevelCompletion, ProgressRecord, QuestionAttempt, XPEvent, XPEventType
from .xp_rules import compute_session_xp


def record_attempt(
    session: ArenaSession,
    question_index: int,
    question_text: str,
    expected_answer: int,
    submitted_answer: int,
    elapsed_ms: int,
) -> QuestionAttempt:
    """Write a single question attempt. Raises IntegrityError on duplicate index."""
    is_correct = submitted_answer == expected_answer
    return QuestionAttempt.objects.create(
        session=session,
        question_index=question_index,
        question_text=question_text,
        expected_answer=expected_answer,
        submitted_answer=submitted_answer,
        is_correct=is_correct,
        elapsed_ms=elapsed_ms,
    )


@transaction.atomic
def finalize_session(session: ArenaSession) -> ProgressRecord:
    """
    Compute session results, write ProgressRecord + XPEvent(s), mark session submitted.
    Idempotent: raises ValueError if session already finalized.
    """
    if session.submitted_at is not None:
        raise ValueError(f"Session {session.id} is already finalized")

    attempts = list(session.attempts.all())
    score_correct = sum(1 for a in attempts if a.is_correct)
    score_total = len(attempts)
    elapsed_total = sum(a.elapsed_ms for a in attempts) // 1000

    accuracy = (score_correct / score_total * 100) if score_total else 0

    is_first = not LevelCompletion.objects.filter(
        user=session.user,
        level=session.template.lesson.level if session.template else None,
        kind=session.kind,
    ).exists() if session.template else False

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

    session.submitted_at = timezone.now()
    session.save(update_fields=["submitted_at"])

    return record
