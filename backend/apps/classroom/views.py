from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.courses.models import Level
from apps.progress.models import LessonCompletion, LevelCompletion, ProgressRecord
from apps.users.permissions import IsTeacher

from .models import Class, Enrollment
from .serializers import (
    ClassCreateSerializer,
    ClassPatchSerializer,
    ClassSerializer,
    JoinClassSerializer,
    RosterStudentSerializer,
)


class ClassListCreateView(APIView):
    """GET /classes/ — teacher's own batches; POST /classes/ — create one."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        qs = (
            Class.objects.using("default")
            .filter(teacher=request.user)
            .annotate(
                active_student_count=Count("enrollments", filter=Q(enrollments__is_active=True))
            )
        )
        return Response(ClassSerializer(qs, many=True).data)

    def post(self, request):
        ser = ClassCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        cls = ser.save()
        return Response(ClassSerializer(cls).data, status=status.HTTP_201_CREATED)


class ClassDetailView(APIView):
    """PATCH /classes/{id}/ — update name/live_link/is_active (owner only)."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def _get_own(self, request, pk):
        try:
            return Class.objects.get(pk=pk, teacher=request.user)
        except Class.DoesNotExist:
            return None

    def patch(self, request, pk):
        cls = self._get_own(request, pk)
        if cls is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = ClassPatchSerializer(cls, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ClassSerializer(cls).data)


class RotateJoinCodeView(APIView):
    """POST /classes/{id}/rotate-code/ — invalidate + regenerate join code (S3)."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request, pk):
        try:
            cls = Class.objects.get(pk=pk, teacher=request.user)
        except Class.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        new_code = cls.rotate_join_code()
        return Response({"join_code": new_code})


class RosterView(APIView):
    """GET /classes/{id}/roster/ — per-student level+accuracy, owner only."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, pk):
        try:
            cls = Class.objects.using("default").get(pk=pk, teacher=request.user)
        except Class.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        enrollments = list(
            cls.enrollments.using("default")
            .filter(is_active=True)
            .select_related("student", "student__profile")
        )
        student_ids = [enrollment.student_id for enrollment in enrollments]
        # Keep the two aggregates separate: joining unrelated completion/history
        # tables would multiply both counts and accuracy samples.
        level_counts = {
            row["user_id"]: row["count"]
            for row in LevelCompletion.objects.using("default")
            .filter(user_id__in=student_ids, kind="CLASSWORK")
            .values("user_id")
            .annotate(count=Count("id"))
        }
        accuracy = {
            row["user_id"]: row["average"]
            for row in ProgressRecord.objects.using("default")
            .filter(user_id__in=student_ids)
            .values("user_id")
            .annotate(average=Avg("accuracy_pct"))
        }
        return Response(
            RosterStudentSerializer(
                enrollments,
                many=True,
                context={"level_counts": level_counts, "accuracy": accuracy},
            ).data
        )


class JoinClassView(APIView):
    """POST /classes/join/ — existing student joins an additional batch via join code."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "join"

    def post(self, request):
        ser = JoinClassSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        code = ser.validated_data["join_code"].strip().upper()

        try:
            cls = Class.objects.get(join_code=code, is_active=True)
        except Class.DoesNotExist:
            return Response(
                {"detail": "Invalid or expired join code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Enrollment.objects.filter(class_room=cls, student=request.user).exists():
            return Response({"detail": "Already enrolled."}, status=status.HTTP_400_BAD_REQUEST)

        Enrollment.objects.create(class_room=cls, student=request.user)
        return Response(ClassSerializer(cls).data, status=status.HTTP_201_CREATED)


class TeacherLevelDashboardView(APIView):
    """
    GET /classes/levels/<level_id>/dashboard/
    Returns per-lesson classwork/homework completion counts for all of this
    teacher's classes that have the given level assigned (D-3).
    """

    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, level_id):
        level = get_object_or_404(Level.objects.using("default"), pk=level_id)
        lessons = list(level.lessons.using("default").order_by("order"))

        # All active classes taught by this teacher with this level assigned.
        classes = list(
            Class.objects.using("default")
            .filter(
                teacher=request.user,
                assigned_levels=level,
                is_active=True,
            )
            .annotate(
                active_student_count=Count(
                    "enrollments",
                    filter=Q(enrollments__is_active=True),
                    distinct=True,
                )
            )
            .order_by("name")
        )

        completion_counts = {}
        # A shared student's completion belongs once to each active class. Group
        # across all classes in one primary read instead of scanning history for
        # each class; inactive enrollment cannot contribute to the numerator.
        rows = (
            LessonCompletion.objects.using("default")
            .filter(
                user__enrollments__class_room_id__in=[cls.id for cls in classes],
                user__enrollments__is_active=True,
                lesson_id__in=[lesson.id for lesson in lessons],
            )
            .values("user__enrollments__class_room_id", "lesson_id", "kind")
            .annotate(count=Count("user_id", distinct=True))
        )
        for row in rows:
            key = (row["user__enrollments__class_room_id"], row["lesson_id"], row["kind"])
            completion_counts[key] = row["count"]

        classes_data = []
        for cls in classes:
            lesson_stats = [
                {
                    "lesson_id": str(lesson.id),
                    "classwork_completed": completion_counts.get(
                        (cls.id, lesson.id, "CLASSWORK"), 0
                    ),
                    "homework_completed": completion_counts.get((cls.id, lesson.id, "HOMEWORK"), 0),
                }
                for lesson in lessons
            ]
            classes_data.append(
                {
                    "id": str(cls.id),
                    "name": cls.name,
                    "total_students": cls.active_student_count,
                    "lessons": lesson_stats,
                }
            )

        return Response(
            {
                "level": {"id": str(level.id), "name": level.name, "order": level.order},
                "lessons": [
                    {"id": str(lesson.id), "name": lesson.name, "order": lesson.order}
                    for lesson in lessons
                ],
                "classes": classes_data,
            }
        )
