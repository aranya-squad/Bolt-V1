from django.urls import path

from .views import (
    AvatarPresetsView,
    CallSignLoginView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    DeleteAccountView,
    GuardianRegisterView,
    HealthView,
    LogoutView,
    MeView,
    ProfileUpdateView,
    StudentRegisterView,
    TeacherRegisterView,
    XpProgressView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("auth/register/", GuardianRegisterView.as_view(), name="auth-register"),
    path("auth/register-student/", StudentRegisterView.as_view(), name="auth-register-student"),
    path("auth/register-teacher/", TeacherRegisterView.as_view(), name="auth-register-teacher"),
    path("auth/login/", CookieTokenObtainPairView.as_view(), name="auth-login"),
    # Student login — call-sign + 4-digit PIN (no email required)
    path("auth/callsign-login/", CallSignLoginView.as_view(), name="auth-callsign-login"),
    path("auth/refresh/", CookieTokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("auth/me/xp-progress/", XpProgressView.as_view(), name="auth-me-xp-progress"),
    path("auth/me/profile/", ProfileUpdateView.as_view(), name="auth-me-profile"),
    path("auth/avatar-presets/", AvatarPresetsView.as_view(), name="auth-avatar-presets"),
    path("auth/delete-account/", DeleteAccountView.as_view(), name="auth-delete-account"),
]
