from django.urls import path

from .views import LessonListView, LevelDetailView, LevelListView

urlpatterns = [
    path("levels/", LevelListView.as_view(), name="level-list"),
    path("levels/<uuid:pk>/", LevelDetailView.as_view(), name="level-detail"),
    path("levels/<uuid:level_id>/lessons/", LessonListView.as_view(), name="lesson-list"),
]
