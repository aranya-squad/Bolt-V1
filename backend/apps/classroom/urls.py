from django.urls import path

from . import views

urlpatterns = [
    # Join must precede <uuid:pk> so "join" is not parsed as a UUID (it would fail, but explicit is cleaner).
    path("classes/join/", views.JoinClassView.as_view(), name="class-join"),
    path("classes/", views.ClassListCreateView.as_view(), name="class-list-create"),
    path("classes/<uuid:pk>/", views.ClassDetailView.as_view(), name="class-detail"),
    path("classes/<uuid:pk>/roster/", views.RosterView.as_view(), name="class-roster"),
    path("classes/<uuid:pk>/rotate-code/", views.RotateJoinCodeView.as_view(), name="class-rotate-code"),
]
