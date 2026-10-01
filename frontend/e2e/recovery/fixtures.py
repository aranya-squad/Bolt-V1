"""Seed synthetic users, or inspect one synthetic session, in the isolated test database."""

import argparse
import json
import os
import uuid

os.environ["DJANGO_SETTINGS_MODULE"] = "api_settings"

import django  # noqa: E402

django.setup()

from django.contrib.auth.hashers import identify_hasher  # noqa: E402
from django.core.management import call_command  # noqa: E402
from django.utils import timezone  # noqa: E402

from apps.courses.models import Level  # noqa: E402
from apps.exercises.models import ArenaSession, DailyQuest, ExerciseTemplate  # noqa: E402
from apps.progress.models import ProgressRecord, XPEvent  # noqa: E402
from apps.users.models import Profile, User  # noqa: E402

parser = argparse.ArgumentParser()
parser.add_argument("--inspect-session")
args = parser.parse_args()

if args.inspect_session:
    session = ArenaSession.objects.get(pk=args.inspect_session)
    if not session.user.email.startswith("recovery-e2e-") or not session.user.email.endswith("@example.invalid"):
        raise ValueError("Only synthetic recovery sessions can be inspected.")
    record = ProgressRecord.objects.filter(session=session).first()
    print(json.dumps({
        "attempt_count": session.attempts.count(),
        "attempts": list(session.attempts.order_by("question_index", "attempt_number").values(
            "question_index", "attempt_number", "submitted_answer", "is_skip", "elapsed_ms")),
        "result_count": ProgressRecord.objects.filter(session=session).count(),
        "xp_count": XPEvent.objects.filter(source_session=session).count(),
        "score_correct": record.score_correct if record else None,
        "score_total": record.score_total if record else None,
        "xp_earned": record.xp_earned if record else None,
        "quest_count": DailyQuest.objects.filter(session=session).count(),
        "quest_completed": DailyQuest.objects.filter(session=session, completed_at__isnull=False).exists(),
        "lesson_completion_count": session.user.lesson_completions.count(),
        "level_completion_count": session.user.level_completions.count(),
    }))
else:
    call_command("migrate", interactive=False, verbosity=0)
    call_command("seed_levels", verbosity=0)
    level = Level.objects.get(order=1)
    template = ExerciseTemplate.objects.get(lesson__level=level, kind="CLASSWORK")
    template.question_count = 3
    template.time_limit_sec = 120
    template.config_json = {"operation": "ADD", "digits": 1, "rows": 2, "question_count": 3}
    template.save()
    run_id = uuid.uuid4().hex[:8]
    call_signs = []
    for i in range(1, 11):
        user = User.objects.create(email=f"recovery-e2e-{run_id}-{i}@example.invalid", role="STUDENT")
        user.set_password("2468")  # Synthetic fixture PIN only; real configured hashing.
        user.save(update_fields=["password"])
        call_sign = f"RecoveryE2E{run_id}{i}"
        call_signs.append(call_sign)
        Profile.objects.create(user=user, call_sign=call_sign, display_name=f"Recovery test {i}")
        if i >= 8:
            # Synthetic frozen approved-template configurations exercise mobile
            # extremes without changing shared content or other smoke scenarios.
            config = {"operation": ("ADD", "SUB", "MUL")[i - 8], "digits": 4,
                      "rows": 8, "digits_row1": 4, "digits_row2": 2,
                      "question_count": 5, "time_limit_sec": 0}
            DailyQuest.objects.create(user=user, mission_date=timezone.now().date(), timezone="UTC",
                source_level_id=level.pk, source_lesson_id=template.lesson_id,
                source_template_id=template.pk, level_name=level.name, level_order=level.order,
                lesson_name=template.lesson.name, lesson_order=template.lesson.order, config_json=config)
        if identify_hasher(user.password).algorithm == "md5":
            raise ValueError("Real-API smoke tests must use the actual password hasher.")
    print(json.dumps({"level_id": str(level.id), "lesson_id": str(template.lesson_id), "hasher": identify_hasher(user.password).algorithm, "call_signs": call_signs}))
