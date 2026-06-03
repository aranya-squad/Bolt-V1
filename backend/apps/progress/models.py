import uuid

from django.db import models


class XPEventType(models.TextChoices):
    SESSION_COMPLETE = "SESSION_COMPLETE", "Session Complete"
    STREAK_BONUS = "STREAK_BONUS", "Streak Bonus"
    LEVEL_UP = "LEVEL_UP", "Level Up"
    # TODO(debt): map ⚡🔥🏆 HUD icons to these types once product specifies (ARCHITECTURE.md §2 Q3)
    PERFECT_SCORE = "PERFECT_SCORE", "Perfect Score"
    FIRST_ATTEMPT = "FIRST_ATTEMPT", "First Attempt Bonus"


class QuestionAttempt(models.Model):
    """
    Per-question record. Append-only.
    Required for Mission Report breakdown table (PRD §7.1.4).
    Multi-attempt: unique_together on (session, question_index, attempt_number).
    The non-unique index on (session, question_index) supports fast per-question lookups.
    """

    session = models.ForeignKey(
        "exercises.ArenaSession", related_name="attempts", on_delete=models.CASCADE
    )
    question_index = models.PositiveSmallIntegerField()
    attempt_number = models.PositiveSmallIntegerField(null=True)
    question_text = models.CharField(max_length=256)
    expected_answer = models.IntegerField()
    submitted_answer = models.IntegerField()
    is_correct = models.BooleanField()
    elapsed_ms = models.PositiveIntegerField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "progress_question_attempt"
        unique_together = [("session", "question_index", "attempt_number")]
        indexes = [models.Index(fields=["session", "question_index"])]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("QuestionAttempt is append-only and cannot be updated")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("QuestionAttempt cannot be deleted")


class ProgressRecord(models.Model):
    """Session-level summary. Append-only. One per ArenaSession."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.OneToOneField(
        "exercises.ArenaSession", on_delete=models.CASCADE, related_name="progress_record"
    )
    user = models.ForeignKey(
        "users.User", related_name="progress_records", on_delete=models.CASCADE
    )
    score_correct = models.PositiveIntegerField()
    score_total = models.PositiveIntegerField()
    accuracy_pct = models.DecimalField(max_digits=5, decimal_places=2)
    time_taken_sec = models.PositiveIntegerField()
    xp_earned = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "progress_record"
        indexes = [models.Index(fields=["user", "-created_at"])]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("ProgressRecord is append-only and cannot be updated")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("ProgressRecord cannot be deleted")


class XPEvent(models.Model):
    """
    Every XP delta, logged individually for HUD stats. Append-only.
    Partitioned by month in prod when table exceeds ~10M rows (see ARCHITECTURE.md §19).
    """

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey("users.User", related_name="xp_events", on_delete=models.CASCADE)
    event_type = models.CharField(max_length=32, choices=XPEventType.choices)
    delta = models.IntegerField()  # positive normally; negative for corrections
    source_session = models.ForeignKey(
        "exercises.ArenaSession", null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "progress_xp_event"
        indexes = [models.Index(fields=["user", "-created_at"])]

    def delete(self, *args, **kwargs):
        raise ValueError("XPEvent cannot be deleted")


class LevelCompletion(models.Model):
    """
    Marks a (user, level, kind) as completed. Idempotent — first success wins.
    best_progress_record updated when a better score is achieved.
    """

    user = models.ForeignKey("users.User", related_name="level_completions", on_delete=models.CASCADE)
    level = models.ForeignKey("courses.Level", related_name="completions", on_delete=models.CASCADE)
    kind = models.CharField(
        max_length=16,
        choices=[("CLASSWORK", "Classwork"), ("HOMEWORK", "Homework")],
    )
    first_completed_at = models.DateTimeField(auto_now_add=True)
    best_progress_record = models.ForeignKey(
        ProgressRecord, on_delete=models.PROTECT, related_name="level_completions"
    )

    class Meta:
        db_table = "progress_level_completion"
        unique_together = [("user", "level", "kind")]


class LessonCompletion(models.Model):
    """
    Lesson-granular completion record. Finer-grained than LevelCompletion.
    Drives the PathOfConquest accordion (per-lesson status chips).
    """

    user = models.ForeignKey("users.User", related_name="lesson_completions", on_delete=models.CASCADE)
    lesson = models.ForeignKey("courses.Lesson", related_name="completions", on_delete=models.CASCADE)
    kind = models.CharField(
        max_length=16,
        choices=[("CLASSWORK", "Classwork"), ("HOMEWORK", "Homework")],
    )
    first_completed_at = models.DateTimeField(auto_now_add=True)
    best_accuracy_pct = models.DecimalField(max_digits=5, decimal_places=2)
    best_progress_record = models.ForeignKey(
        ProgressRecord, on_delete=models.PROTECT, related_name="lesson_completions"
    )

    class Meta:
        db_table = "progress_lesson_completion"
        unique_together = [("user", "lesson", "kind")]
