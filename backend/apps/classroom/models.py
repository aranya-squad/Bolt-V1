import secrets
import uuid

from django.db import models

# Join-code alphabet excludes ambiguous characters (0/O, 1/I).
_JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_JOIN_CODE_LEN = 6


def generate_join_code() -> str:
    return "".join(secrets.choice(_JOIN_CODE_ALPHABET) for _ in range(_JOIN_CODE_LEN))


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
    # Unique code students enter to self-enroll (plan §1g). Rotatable on leak (S3).
    join_code = models.CharField(max_length=12, unique=True, db_index=True, blank=True, default="")
    # Optional live-session URL (e.g. Google Meet) the teacher sets.
    live_session_link = models.URLField(blank=True, default="")
    assigned_levels = models.ManyToManyField("courses.Level", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "classroom_class"
        verbose_name = "Class"
        verbose_name_plural = "Classes"

    def __str__(self) -> str:
        return f"{self.name} ({self.teacher.email})"

    @staticmethod
    def _unique_join_code() -> str:
        for _ in range(20):
            code = generate_join_code()
            if not Class.objects.filter(join_code=code).exists():
                return code
        raise RuntimeError("Could not generate a unique join code after 20 attempts")

    def save(self, *args, **kwargs):
        if not self.join_code:
            self.join_code = self._unique_join_code()
        super().save(*args, **kwargs)

    def rotate_join_code(self) -> str:
        """Invalidate the old code and assign a fresh unique one (plan §1g / S3)."""
        self.join_code = self._unique_join_code()
        self.save(update_fields=["join_code"])
        return self.join_code


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


class EnrollmentConsent(models.Model):
    """
    Teacher/school-attested parental consent, captured at student self-signup (plan R1 / §1b).
    Additive replacement for the guardian-based ConsentRecord path — append-only, never updated
    or deleted. Rollback of the consent rework = drop this table; the immutable users.ConsentRecord
    is never touched.
    """

    class Jurisdiction(models.TextChoices):
        US = "US", "United States"
        EU = "EU", "European Union"
        IN = "IN", "India"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.OneToOneField(
        Enrollment, on_delete=models.CASCADE, related_name="consent"
    )
    # The teacher whose batch the student joined — the attesting party (FERPA school-official model).
    attested_by = models.ForeignKey(
        "users.User", on_delete=models.PROTECT, related_name="consent_attestations"
    )
    method = models.CharField(max_length=32, default="teacher_attested")
    student_dob = models.DateField()
    under_13 = models.BooleanField()  # COPPA flag, computed from DOB at signup
    attested_at = models.DateTimeField()
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    jurisdiction = models.CharField(
        max_length=8, choices=Jurisdiction.choices, default=Jurisdiction.OTHER
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "classroom_enrollment_consent"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("EnrollmentConsent is immutable and cannot be updated")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("EnrollmentConsent cannot be deleted")

    def __str__(self) -> str:
        return f"consent[enrollment={self.enrollment_id}] under_13={self.under_13}"
