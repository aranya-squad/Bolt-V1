from django.urls import path

from .views import (
    FinalizeSessionView,
    SessionDetailView,
    SessionReportView,
    StartClassworkView,
    StartPracticeView,
    SubmitAttemptView,
)

urlpatterns = [
    path("levels/<uuid:level_id>/classwork/start/", StartClassworkView.as_view(), name="classwork-start"),
    path("practice/start/", StartPracticeView.as_view(), name="practice-start"),
    path("sessions/<uuid:session_id>/", SessionDetailView.as_view(), name="session-detail"),
    path("sessions/<uuid:session_id>/attempts/", SubmitAttemptView.as_view(), name="session-attempt"),
    path("sessions/<uuid:session_id>/submit/", FinalizeSessionView.as_view(), name="session-submit"),
    path("sessions/<uuid:session_id>/report/", SessionReportView.as_view(), name="session-report"),
]
