from rest_framework.permissions import BasePermission

from .models import Guardianship, User


def _student_from_obj(obj) -> User | None:
    if isinstance(obj, User):
        return obj
    return getattr(obj, "user", None)


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "STUDENT"


class IsGuardian(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "GUARDIAN"


# Reserved for future teacher portal — no current view uses this.
class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "TEACHER"


class IsGuardianOfStudent(BasePermission):
    def has_object_permission(self, request, view, obj):
        student = _student_from_obj(obj)
        if not student:
            return False
        return Guardianship.objects.filter(
            guardian=request.user, student=student
        ).exists()


# Reserved for future teacher portal — no current view uses this.
class IsTeacherOfStudent(BasePermission):
    def has_object_permission(self, request, view, obj):
        from apps.classroom.models import Enrollment

        student = _student_from_obj(obj)
        if not student:
            return False
        return Enrollment.objects.filter(
            student=student, class_room__teacher=request.user
        ).exists()
