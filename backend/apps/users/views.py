import logging

from django.conf import settings
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views import View
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .backends import CallSignBackend
from .constants import PRESET_AVATAR_URLS
from .models import AuditEvent, ConsentRecord, Guardianship, Profile, User
from .permissions import IsGuardian
from .serializers import GuardianRegisterSerializer, ProfileSerializer, StudentRegisterSerializer, UserMeSerializer

_callsign_backend = CallSignBackend()

_log = logging.getLogger("apps.users")

_SJ = settings.SIMPLE_JWT
_COOKIE_NAME = _SJ["REFRESH_COOKIE_NAME"]
_COOKIE_PATH = _SJ["REFRESH_COOKIE_PATH"]
_COOKIE_DOMAIN = _SJ["REFRESH_COOKIE_DOMAIN"]
_COOKIE_MAX_AGE = int(_SJ["REFRESH_TOKEN_LIFETIME"].total_seconds())


def _set_refresh_cookie(response, token_str: str) -> None:
    response.set_cookie(
        _COOKIE_NAME,
        token_str,
        max_age=_COOKIE_MAX_AGE,
        httponly=True,
        secure=not settings.DEBUG,
        samesite=_SJ["REFRESH_COOKIE_SAMESITE"],
        path=_COOKIE_PATH,
        domain=_COOKIE_DOMAIN,
    )


def _client_ip(request) -> str:
    fwd = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "0.0.0.0")


class HealthView(View):
    """Simple liveness check — no auth required."""

    def get(self, request):
        from django.db import connection
        from django_redis import get_redis_connection

        db_ok = False
        redis_ok = False
        try:
            connection.ensure_connection()
            db_ok = True
        except Exception:
            pass
        try:
            # Use pooled connection rather than opening a raw socket
            r = get_redis_connection("default")
            r.ping()
            redis_ok = True
        except Exception:
            # Intentional silent pass — exception message may contain DSN credentials
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


class CookieTokenObtainPairView(TokenObtainPairView):
    """Login: access token in response body, refresh token in HttpOnly cookie."""

    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh = response.data.pop("refresh", None)
            if refresh:
                _set_refresh_cookie(response, refresh)
        return response


class CookieTokenRefreshView(APIView):
    """Refresh: reads refresh token from cookie, validates via TokenRefreshSerializer."""

    permission_classes = []

    def post(self, request):
        token_str = request.COOKIES.get(_COOKIE_NAME)
        if not token_str:
            return Response({"detail": "No refresh token."}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = TokenRefreshSerializer(data={"refresh": token_str})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        response = Response({"access": serializer.validated_data["access"]})
        new_refresh = serializer.validated_data.get("refresh")
        if new_refresh:
            _set_refresh_cookie(response, new_refresh)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.COOKIES.get(_COOKIE_NAME)
        if token:
            try:
                RefreshToken(token).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(_COOKIE_NAME, path=_COOKIE_PATH, domain=_COOKIE_DOMAIN)
        return response


class CallSignLoginView(APIView):
    """
    Student login: POST { call_sign, pin } → access token + HttpOnly refresh cookie.
    call_sign maps to Profile.display_name (case-insensitive).
    pin is the student's 4-digit password set by the guardian at account creation.
    """

    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        call_sign = (request.data.get("call_sign") or "").strip()
        pin = (request.data.get("pin") or "").strip()

        if not call_sign or not pin:
            return Response(
                {"detail": "call_sign and pin are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not pin.isdigit() or len(pin) != 4:
            return Response(
                {"detail": "pin must be exactly 4 digits."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = _callsign_backend.authenticate(request, call_sign=call_sign, pin=pin)
        if user is None:
            return Response(
                {"detail": "Invalid call sign or PIN."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        response = Response({"access": str(refresh.access_token)})
        _set_refresh_cookie(response, str(refresh))
        return response


class GuardianRegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "register"

    def post(self, request):
        serializer = GuardianRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        response = Response(
            {"access": str(refresh.access_token)},
            status=status.HTTP_201_CREATED,
        )
        _set_refresh_cookie(response, str(refresh))
        return response


class StudentRegisterView(APIView):
    """Guardian creates a child sub-account. ConsentRecord + Guardianship + AuditEvent are wired atomically."""

    permission_classes = [IsGuardian]
    throttle_scope = "register"

    @transaction.atomic
    def post(self, request):
        serializer = StudentRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()

        consent = ConsentRecord.objects.create(
            guardian_email=request.user.email,
            student_dob=student.date_of_birth,
            consent_given_at=timezone.now(),
            consent_method="implicit_form_submission",  # TODO(debt): replace with real verification flow before US/EU launch
            ip_address=_client_ip(request),
            user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:1024],
            jurisdiction=request.data.get("jurisdiction", "OTHER"),
        )
        Guardianship.objects.create(
            guardian=request.user,
            student=student,
            relationship=request.data.get("relationship", "parent"),
            consent_record=consent,
        )
        AuditEvent.objects.create(
            actor=request.user,
            subject=student,
            action="student_created",
            metadata={"consent_record_id": str(consent.id)},
        )
        return Response(
            {"detail": "Student account created.", "student_id": str(student.id)},
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = User.objects.select_related("profile").get(pk=request.user.pk)
        return Response(UserMeSerializer(user).data)


class ProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "profile"

    def patch(self, request):
        display_name = request.data.get("display_name")
        avatar_url = request.data.get("avatar_url")

        if avatar_url is not None and avatar_url not in PRESET_AVATAR_URLS:
            return Response({"detail": "Invalid avatar_url."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            profile = Profile.objects.select_for_update().get(user=request.user)
            changed = []
            if display_name is not None:
                profile.display_name = display_name
                changed.append("display_name")
            if avatar_url is not None:
                profile.avatar_url = avatar_url
                changed.append("avatar_url")
            if changed:
                profile.save(update_fields=changed)

        cache.delete(f"user_stats:{request.user.pk}")
        return Response(ProfileSerializer(profile).data)


class AvatarPresetsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"presets": PRESET_AVATAR_URLS})


class XpProgressView(APIView):
    """GET /auth/me/xp-progress/ — returns XP bar data with level thresholds."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.courses.models import Level
        from apps.users.stats import get_user_stats

        stats = get_user_stats(request.user)
        current_level = stats["current_level"]

        thresholds = dict(
            Level.objects.filter(order__in=[current_level, current_level + 1])
            .values_list("order", "xp_threshold")
        )

        current_threshold = thresholds.get(current_level, 0)
        next_threshold = thresholds.get(current_level + 1, current_threshold)
        xp_to_next = max(0, next_threshold - stats["total_xp"]) if next_threshold > current_threshold else 0

        return Response({
            "total_xp": stats["total_xp"],
            "current_level": current_level,
            "streak_days": stats["streak_days"],
            "current_level_threshold": current_threshold,
            "next_level_threshold": next_threshold,
            "xp_to_next_level": xp_to_next,
        })
