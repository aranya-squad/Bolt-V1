import uuid

from django.db import models


class SessionKind(models.TextChoices):
    CLASSWORK = "CLASSWORK", "Classwork"
    HOMEWORK = "HOMEWORK", "Homework"
    FLASH_CARDS = "FLASH_CARDS", "Flash Cards"
    ZEN = "ZEN", "Zen Mode"
    TIME_ATTACK = "TIME_ATTACK", "Time Attack"
    CUSTOM = "CUSTOM", "Custom Challenge"


class ExerciseTemplate(models.Model):
    """
    Curated exercise definition tied to a Lesson.
    Procedural Practice (Zen, Time Attack, Custom) does not use this — it uses config_json directly.
    """

    lesson = models.ForeignKey(
        "courses.Lesson", related_name="templates", on_delete=models.CASCADE
    )
    kind = models.CharField(
        max_length=16,
        choices=[(SessionKind.CLASSWORK, "Classwork"), (SessionKind.HOMEWORK, "Homework")],
    )
    question_count = models.PositiveSmallIntegerField(default=30)
    time_limit_sec = models.PositiveIntegerField(default=600)
    # Generator params: operation, digit_range, row_count, etc.
    config_json = models.JSONField()

    class Meta:
        db_table = "exercises_template"
        unique_together = [("lesson", "kind")]

    def __str__(self) -> str:
        return f"{self.lesson} / {self.kind}"


class ArenaSession(models.Model):
    """
    An active or completed gameplay session.
    Created server-side; answers stored server-side only.
    See ARCHITECTURE.md §10 (Anti-Cheat).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("users.User", related_name="sessions", on_delete=models.CASCADE)
    kind = models.CharField(max_length=16, choices=SessionKind.choices)
    template = models.ForeignKey(
        ExerciseTemplate, null=True, blank=True, on_delete=models.PROTECT
    )
    # Frozen config at session start (what the generator used)
    config_json = models.JSONField()
    # Deterministic seed — same seed + config always produces same questions
    seed = models.BigIntegerField()
    # Full question set with answers. NEVER returned to the client.
    questions_json = models.JSONField()
    # When True: skip submissions and retry attempts are rejected server-side (§9 Q3).
    is_test_mode = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    abandoned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "exercises_arena_session"
        indexes = [models.Index(fields=["user", "-started_at"])]

    @property
    def is_complete(self) -> bool:
        return self.submitted_at is not None

    @property
    def is_active(self) -> bool:
        return self.submitted_at is None and self.abandoned_at is None

    def questions_for_client(self) -> list:
        """Return questions with answer stripped — safe to send to browser."""
        return [
            {k: v for k, v in q.items() if k != "answer"}
            for q in self.questions_json
        ]
