import uuid

from django.db import models


class Level(models.Model):
    """
    One of the 10 Figma-confirmed levels. Order is canonical.
    xp_threshold and unlock logic TBD pending XP formula (§2 Q4 in ARCHITECTURE.md).
    """

    LEVEL_NAMES = [
        "Foundations",
        "The Big Friend",
        "Speed Striker",
        "The Little Friend",
        "Combo Strike",
        "Double Digits",
        "Mind Meld",
        "Mental Matrix",
        "Zenith Trial",
        "Grandmaster",
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.PositiveSmallIntegerField(unique=True)  # 1..10
    name = models.CharField(max_length=64)
    description = models.TextField(blank=True)
    # TODO(debt): xp_threshold value stubbed at 0; replace when XP formula is finalized
    xp_threshold = models.PositiveIntegerField(default=0)
    is_advanced = models.BooleanField(default=False)

    class Meta:
        db_table = "courses_level"
        ordering = ["order"]

    def __str__(self) -> str:
        return f"{self.order}. {self.name}"


class Lesson(models.Model):
    """A class group within a level (e.g., CLASS 1, CLASS 2 from PRD §5.2)."""

    level = models.ForeignKey(Level, related_name="lessons", on_delete=models.CASCADE)
    order = models.PositiveSmallIntegerField()
    name = models.CharField(max_length=64)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "courses_lesson"
        unique_together = [("level", "order")]
        ordering = ["order"]

    def __str__(self) -> str:
        return f"{self.level.name} / {self.name}"


class ContentBlock(models.Model):
    """Rich instructional content attached to a Lesson (text, video link, image)."""

    class Kind(models.TextChoices):
        TEXT = "TEXT", "Text"
        VIDEO = "VIDEO", "Video URL"
        IMAGE = "IMAGE", "Image"

    lesson = models.ForeignKey(Lesson, related_name="content_blocks", on_delete=models.CASCADE)
    kind = models.CharField(max_length=8, choices=Kind.choices)
    order = models.PositiveSmallIntegerField()
    body = models.TextField()  # markdown text, URL for video/image

    class Meta:
        db_table = "courses_content_block"
        ordering = ["order"]
        unique_together = [("lesson", "order")]


class Material(models.Model):
    """Downloadable PDF for a level (Classwork or Homework)."""

    class Kind(models.TextChoices):
        CLASSWORK = "CLASSWORK", "Classwork"
        HOMEWORK = "HOMEWORK", "Homework"

    level = models.ForeignKey(Level, related_name="materials", on_delete=models.CASCADE)
    kind = models.CharField(max_length=16, choices=Kind.choices)
    file = models.FileField(upload_to="materials/%Y/")
    version = models.PositiveIntegerField(default=1)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "courses_material"
        unique_together = [("level", "kind", "version")]
