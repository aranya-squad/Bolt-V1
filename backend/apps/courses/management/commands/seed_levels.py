from django.core.management.base import BaseCommand

from apps.courses.models import Level, Lesson
from apps.exercises.models import ExerciseTemplate, SessionKind

# Must match courses/migrations/0003_level_xp_thresholds.py — re-running seed preserves these values.
XP_THRESHOLDS = [0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5500]

LEVEL_CONFIGS = [
    {"operation": "ADD", "digits": 1, "rows": 2, "question_count": 30},  # 1 Foundations
    {"operation": "ADD", "digits": 2, "rows": 2, "question_count": 30},  # 2 Big Friend
    {"operation": "ADD", "digits": 2, "rows": 3, "question_count": 30},  # 3 Speed Striker
    {"operation": "SUB", "digits": 2, "rows": 2, "question_count": 30},  # 4 Little Friend
    {"operation": "ADD", "digits": 3, "rows": 2, "question_count": 30},  # 5 Combo Strike
    {"operation": "ADD", "digits": 3, "rows": 3, "question_count": 30},  # 6 Double Digits
    {"operation": "MUL", "digits": 2, "rows": 2, "question_count": 30},  # 7 Mind Meld
    {"operation": "MUL", "digits": 2, "rows": 2, "question_count": 30},  # 8 Mental Matrix
    {"operation": "DIV", "digits": 2, "rows": 2, "question_count": 30},  # 9 Zenith Trial
    {"operation": "MUL", "digits": 3, "rows": 2, "question_count": 30},  # 10 Grandmaster
]


class Command(BaseCommand):
    help = "Seed the 10 canonical levels, one lesson each, and one CLASSWORK template each."

    def handle(self, *args, **options):
        levels_created = 0
        lessons_created = 0
        templates_created = 0

        for i, name in enumerate(Level.LEVEL_NAMES):
            order = i + 1
            level, level_new = Level.objects.get_or_create(
                order=order,
                defaults={"name": name, "description": "", "xp_threshold": XP_THRESHOLDS[i], "is_advanced": False},
            )
            if level_new:
                levels_created += 1

            lesson, lesson_new = Lesson.objects.get_or_create(
                level=level,
                order=1,
                defaults={"name": "Class 1", "description": ""},
            )
            if lesson_new:
                lessons_created += 1

            config = LEVEL_CONFIGS[i]
            _, template_new = ExerciseTemplate.objects.get_or_create(
                lesson=lesson,
                kind=SessionKind.CLASSWORK,
                defaults={
                    "question_count": config["question_count"],
                    "time_limit_sec": 600,
                    "config_json": config,
                },
            )
            if template_new:
                templates_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created: {levels_created} levels, {lessons_created} lessons, "
                f"{templates_created} templates. "
                f"Skipped: {10 - levels_created} levels already existed."
            )
        )
