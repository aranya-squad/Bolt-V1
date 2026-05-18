from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.progress.models import LevelCompletion

from .models import Level
from .serializers import LevelSerializer


def _level_context(user):
    completed_ids = set(
        str(lid)
        for lid in LevelCompletion.objects.filter(user=user, kind="CLASSWORK").values_list("level_id", flat=True)
    )
    ordered_ids = [str(lid) for lid in Level.objects.order_by("order").values_list("id", flat=True)]
    return {"completed_level_ids": completed_ids, "ordered_level_ids": ordered_ids}


class LevelListView(generics.ListAPIView):
    serializer_class = LevelSerializer
    permission_classes = [IsAuthenticated]
    queryset = Level.objects.all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update(_level_context(self.request.user))
        return context


class LevelDetailView(generics.RetrieveAPIView):
    serializer_class = LevelSerializer
    permission_classes = [IsAuthenticated]
    queryset = Level.objects.all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update(_level_context(self.request.user))
        return context
