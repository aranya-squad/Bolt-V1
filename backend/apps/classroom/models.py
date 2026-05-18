import uuid

from django.db import models


class Class(models.Model):
    """
    A teacher's class group. Students are enrolled via Enrollment.
    Full teacher dashboard features are deferred — see ARCHITECTURE.md §19.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=128)
    teacher = models.ForeignKey(
        "users.User", related_name="classes_taught", on_delete=models.CASCADE
    )
    assigned_levels = models.ManyToManyField("courses.Level", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "classroom_class"
        verbose_name = "Class"
        verbose_name_plural = "Classes"

    def __str__(self) -> str:
        return f"{self.name} ({self.teacher.email})"


class Enrollment(models.Model):
    """Links a student to a Class."""

    class_room = models.ForeignKey(Class, related_name="enrollments", on_delete=models.CASCADE)
    student = models.ForeignKey(
        "users.User", related_name="enrollments", on_delete=models.CASCADE
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "classroom_enrollment"
        unique_together = [("class_room", "student")]

    def __str__(self) -> str:
        return f"{self.student.email} in {self.class_room.name}"
