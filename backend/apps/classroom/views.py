from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

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
        qs = Class.objects.filter(teacher=request.user).prefetch_related("enrollments")
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
            cls = Class.objects.get(pk=pk, teacher=request.user)
        except Class.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        enrollments = cls.enrollments.filter(is_active=True).select_related(
            "student", "student__profile"
        )
        return Response(RosterStudentSerializer(enrollments, many=True).data)


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
