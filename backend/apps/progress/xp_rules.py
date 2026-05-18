"""
XP calculation rules.

TODO(debt): All values below are stubs. Replace when product finalizes the XP formula
(ARCHITECTURE.md §2 Q4: XP formula — per-correct, per-session, streak bonuses, level thresholds).
"""

# XP awarded per correct answer
XP_PER_CORRECT = 10

# Bonus XP for completing a session with 100% accuracy
PERFECT_SCORE_BONUS = 50

# Bonus XP for first-ever completion of a (level, kind) pair
FIRST_COMPLETION_BONUS = 100

# XP awarded on retakes is 0 (anti-cheat: can't farm XP by replaying)
XP_ON_RETAKE = 0


def compute_session_xp(score_correct: int, score_total: int, is_first_completion: bool) -> int:
    """Return the XP delta for a completed session."""
    xp = score_correct * XP_PER_CORRECT
    if score_correct == score_total:
        xp += PERFECT_SCORE_BONUS
    if is_first_completion:
        xp += FIRST_COMPLETION_BONUS
    return xp
