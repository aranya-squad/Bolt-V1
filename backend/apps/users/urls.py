from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import GuardianRegisterView, HealthView, MeView, StudentRegisterView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("auth/register/", GuardianRegisterView.as_view(), name="auth-register"),
    path("auth/register-student/", StudentRegisterView.as_view(), name="auth-register-student"),
    path("auth/login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
]
