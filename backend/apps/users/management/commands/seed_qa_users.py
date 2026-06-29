from datetime import date

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.classroom.models import Class, Enrollment, EnrollmentConsent
from apps.users.models import Profile, Role, User

_ADMIN_EMAIL = "qa-admin@boltabacus.dev"
_ADMIN_PASSWORD = "QAadmin1234!"

_TEACHER_EMAIL = "qa-teacher@boltabacus.dev"
_TEACHER_PASSWORD = "QAteacher1!"

# Deterministic internal email so get_or_create is idempotent across re-runs.
_STUDENT_EMAIL = "qaninja-qa@students.boltabacus.internal"
_STUDENT_CALL_SIGN = "qa-ninja"
_STUDENT_PIN = "1234"
_STUDENT_DOB = date(2015, 6, 1)

_BATCH_NAME = "QA Batch"


class Command(BaseCommand):
    help = "Seed QA accounts (admin, teacher + batch, enrolled student). Idempotent. Dev only."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Allow running in production (DEBUG=False). Use once, intentionally.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "seed_qa_users must not run in production (DEBUG is False). Pass --force to override."
            )

        with transaction.atomic():
            admin_new = self._seed_admin()
            teacher, teacher_new = self._seed_teacher()
            klass, class_new = self._seed_class(teacher)
            student, student_new = self._seed_student()
            enroll_new = self._seed_enrollment(klass, student, teacher)

        self._print_summary(admin_new, teacher_new, class_new, student_new, enroll_new, klass)

    def _seed_admin(self) -> bool:
        user, created = User.objects.get_or_create(
            email=_ADMIN_EMAIL,
            defaults={"role": Role.ADMIN, "is_staff": True, "is_superuser": True, "is_active": True},
        )
        if created:
            user.set_password(_ADMIN_PASSWORD)
            user.save()
            Profile.objects.create(user=user, display_name="QA Admin")
        return created

    def _seed_teacher(self):
        user, created = User.objects.get_or_create(
            email=_TEACHER_EMAIL,
            defaults={"role": Role.TEACHER, "is_active": True},
        )
        if created:
            user.set_password(_TEACHER_PASSWORD)
            user.save()
            Profile.objects.create(user=user, display_name="QA Teacher")
        return user, created

    def _seed_class(self, teacher):
        # Class.save() assigns a unique join_code on first create.
        return Class.objects.get_or_create(name=_BATCH_NAME, teacher=teacher)

    def _seed_student(self):
        user, created = User.objects.get_or_create(
            email=_STUDENT_EMAIL,
            defaults={"role": Role.STUDENT, "is_active": True, "date_of_birth": _STUDENT_DOB},
        )
        if created:
            user.set_password(_STUDENT_PIN)
            user.save()
            Profile.objects.create(
                user=user, display_name=_STUDENT_CALL_SIGN, call_sign=_STUDENT_CALL_SIGN
            )
        return user, created

    def _seed_enrollment(self, klass, student, teacher) -> bool:
        enrollment, created = Enrollment.objects.get_or_create(class_room=klass, student=student)
        if created:
            today = date.today()
            age = today.year - _STUDENT_DOB.year - (
                (today.month, today.day) < (_STUDENT_DOB.month, _STUDENT_DOB.day)
            )
            EnrollmentConsent.objects.create(
                enrollment=enrollment,
                attested_by=teacher,
                method="qa_seed",
                student_dob=_STUDENT_DOB,
                under_13=age < 13,
                attested_at=timezone.now(),
                ip_address="127.0.0.1",
                user_agent="seed_qa_users management command",
                jurisdiction="OTHER",
            )
        return created

    def _print_summary(self, admin_new, teacher_new, class_new, student_new, enroll_new, klass):
        def tag(created):
            return self.style.SUCCESS("created") if created else self.style.WARNING("already existed")

        self.stdout.write("")
        self.stdout.write("  QA seed complete — DEV ONLY, never run in production")
        self.stdout.write("  " + "-" * 58)
        self.stdout.write(f"  Admin    [{tag(admin_new)}]   {_ADMIN_EMAIL} / {_ADMIN_PASSWORD}")
        self.stdout.write(f"  Teacher  [{tag(teacher_new)}]   {_TEACHER_EMAIL} / {_TEACHER_PASSWORD}")
        self.stdout.write(f"  Batch    [{tag(class_new)}]   '{klass.name}'  join code: {klass.join_code}")
        self.stdout.write(f"  Student  [{tag(student_new)}]   call_sign: {_STUDENT_CALL_SIGN}  pin: {_STUDENT_PIN}")
        self.stdout.write(f"  Enrollment + consent [{tag(enroll_new)}]")
        self.stdout.write("")
