from django.http import JsonResponse
from django.views import View
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .permissions import IsGuardian
from .serializers import GuardianRegisterSerializer, StudentRegisterSerializer, UserMeSerializer


class HealthView(View):
    """Simple liveness check — no auth required."""

    def get(self, request):
        from django.db import connection

        import redis as redis_lib
        from django.conf import settings

        db_ok = False
        redis_ok = False
        try:
            connection.ensure_connection()
            db_ok = True
        except Exception:
            pass
        try:
            r = redis_lib.from_url(settings.CACHES["default"]["LOCATION"])
            r.ping()
            redis_ok = True
        except Exception:
            pass

        status_code = 200 if (db_ok and redis_ok) else 503
        return JsonResponse(
            {
                "status": "ok" if (db_ok and redis_ok) else "degraded",
                "db": "ok" if db_ok else "error",
                "redis": "ok" if redis_ok else "error",
            },
            status=status_code,
        )


class GuardianRegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "register"

    def post(self, request):
        serializer = GuardianRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {"access": str(refresh.access_token)},
            status=status.HTTP_201_CREATED,
        )


class StudentRegisterView(APIView):
    """Guardian creates a child sub-account. ConsentRecord must be created first."""

    permission_classes = [IsGuardian]
    throttle_scope = "register"

    def post(self, request):
        # TODO(debt): wire ConsentRecord creation before creating student
        serializer = StudentRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Student account created."}, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data)
