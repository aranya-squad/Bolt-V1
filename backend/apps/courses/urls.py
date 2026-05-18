from django.urls import path

from .views import LevelDetailView, LevelListView

urlpatterns = [
    path("levels/", LevelListView.as_view(), name="level-list"),
    path("levels/<uuid:pk>/", LevelDetailView.as_view(), name="level-detail"),
]
