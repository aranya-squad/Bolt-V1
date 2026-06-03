import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UserManager


class Role(models.TextChoices):
    STUDENT = "STUDENT", "Student"
    GUARDIAN = "GUARDIAN", "Guardian"
    TEACHER = "TEACHER", "Teacher"
    ADMIN = "ADMIN", "Admin"


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.STUDENT)
    # Required for STUDENT accounts (COPPA/GDPR-K age verification)
    date_of_birth = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = "users_user"

    def __str__(self) -> str:
        return f"{self.email} ({self.role})"


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    display_name = models.CharField(max_length=64)
    avatar_url = models.URLField(blank=True)
    locale = models.CharField(max_length=8, default="en")
    timezone = models.CharField(max_length=64, default="UTC")

    class Meta:
        db_table = "users_profile"

    def __str__(self) -> str:
        return self.display_name


class ConsentRecord(models.Model):
    """Immutable parental consent record. Never updated or deleted (COPPA/GDPR-K/DPDP)."""

    class Jurisdiction(models.TextChoices):
        US = "US", "United States"
        EU = "EU", "European Union"
        IN = "IN", "India"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guardian_email = models.EmailField()
    student_dob = models.DateField()
    consent_given_at = models.DateTimeField()
    consent_method = models.CharField(max_length=32)  # email_verification, credit_card
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    jurisdiction = models.CharField(max_length=8, choices=Jurisdiction.choices)

    class Meta:
        db_table = "users_consent_record"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("ConsentRecord is immutable and cannot be updated")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("ConsentRecord cannot be deleted")


class Guardianship(models.Model):
    """Links a guardian (parent) to a student sub-account."""

    guardian = models.ForeignKey(
        User, related_name="guarded_students", on_delete=models.CASCADE
    )
    student = models.ForeignKey(
        User, related_name="guardians", on_delete=models.CASCADE
    )
    relationship = models.CharField(max_length=32, default="parent")
    is_primary = models.BooleanField(default=True)
    consent_record = models.ForeignKey(
        ConsentRecord, on_delete=models.PROTECT, related_name="guardianships"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "users_guardianship"
        unique_together = [("guardian", "student")]

    def __str__(self) -> str:
        return f"{self.guardian.email} → {self.student.email}"


class AuditEvent(models.Model):
    """Guardian actions on child accounts — append-only audit trail."""

    actor = models.ForeignKey(User, related_name="audit_events_actor", on_delete=models.CASCADE)
    subject = models.ForeignKey(
        User, related_name="audit_events_subject", on_delete=models.CASCADE
    )
    action = models.CharField(max_length=64)  # student_created, password_reset, data_deleted
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "users_audit_event"
        indexes = [models.Index(fields=["subject", "-created_at"])]
