import pytest

from apps.progress.xp_rules import FIRST_COMPLETION_BONUS, PERFECT_SCORE_BONUS, XP_PER_CORRECT, compute_session_xp


def test_xp_basic():
    xp = compute_session_xp(score_correct=10, score_total=30, is_first_completion=False)
    assert xp == 10 * XP_PER_CORRECT


def test_xp_perfect_score_bonus():
    xp = compute_session_xp(score_correct=30, score_total=30, is_first_completion=False)
    assert xp == 30 * XP_PER_CORRECT + PERFECT_SCORE_BONUS


def test_xp_first_completion_bonus():
    xp = compute_session_xp(score_correct=20, score_total=30, is_first_completion=True)
    assert xp == 20 * XP_PER_CORRECT + FIRST_COMPLETION_BONUS


def test_xp_perfect_and_first():
    xp = compute_session_xp(score_correct=30, score_total=30, is_first_completion=True)
    assert xp == 30 * XP_PER_CORRECT + PERFECT_SCORE_BONUS + FIRST_COMPLETION_BONUS
