from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils.cache import patch_cache_control
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.progress.models import LessonCompletion, LevelCompletion

from .models import Level, Lesson
from .serializers import LevelSerializer

_LEVEL_CONTEXT_TTL = 60  # seconds; invalidated by finalize_session on completion change


def _level_context(user):
    cache_key = f"level_context:{user.pk}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    completed_ids = set(
        str(lid)
        for lid in LevelCompletion.objects.filter(user=user, kind="CLASSWORK").values_list("level_id", flat=True)
    )
    ordered_ids = [str(lid) for lid in Level.objects.order_by("order").values_list("id", flat=True)]
    result = {"completed_level_ids": completed_ids, "ordered_level_ids": ordered_ids}
    cache.set(cache_key, result, _LEVEL_CONTEXT_TTL)
    return result


class LevelListView(generics.ListAPIView):
    serializer_class = LevelSerializer
    permission_classes = [IsAuthenticated]
    queryset = Level.objects.all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update(_level_context(self.request.user))
        return context

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # Per-user data: private so CDN won't cache; browser may cache briefly.
        patch_cache_control(response, private=True, max_age=30)
        return response


class LevelDetailView(generics.RetrieveAPIView):
    serializer_class = LevelSerializer
    permission_classes = [IsAuthenticated]
    queryset = Level.objects.all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update(_level_context(self.request.user))
        return context

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        patch_cache_control(response, private=True, max_age=30)
        return response


class LessonListView(APIView):
    """
    GET /levels/{level_id}/lessons/
    Returns all lessons for a level with per-user completion data.
    N+1 safe: 3 queries total (level + lessons + completions).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, level_id):
        level = get_object_or_404(Level, pk=level_id)
        lessons = list(level.lessons.order_by("order"))

        lesson_ids = [l.id for l in lessons]
        completions = LessonCompletion.objects.filter(
            user=request.user,
            lesson_id__in=lesson_ids,
        )

        # Build lookup: (str(lesson_id), kind) → best_accuracy_pct
        completion_map: dict[tuple[str, str], float] = {}
        for c in completions:
            completion_map[(str(c.lesson_id), c.kind)] = float(c.best_accuracy_pct)

        classwork_done = {lid for (lid, kind) in completion_map if kind == "CLASSWORK"}

        data = []
        for i, lesson in enumerate(lessons):
            lid = str(lesson.id)
            is_locked = i > 0 and str(lessons[i - 1].id) not in classwork_done
            cw_pct = completion_map.get((lid, "CLASSWORK"))
            data.append({
                "id": lid,
                "order": lesson.order,
                "name": lesson.name,
                "description": lesson.description,
                "classwork_completed": lid in classwork_done,
                "classwork_accuracy_pct": cw_pct,
                "homework_completed": (lid, "HOMEWORK") in completion_map,
                "is_locked": is_locked,
            })

        response = Response(data)
        patch_cache_control(response, private=True, max_age=30)
        return response
