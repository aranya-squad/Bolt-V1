"""Primary-consistent daily assignment and idempotent session binding."""

import copy
import secrets
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db import DEFAULT_DB_ALIAS, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Lesson, Level
from apps.progress.models import LessonCompletion, LevelCompletion
from apps.users.models import Profile, User
from apps.users.permissions import IsStudent

from .attempt_contract import is_integer
from .generators.curated import CuratedGenerator
from .models import ArenaSession, DailyQuest, ExerciseTemplate, SessionKind
from .serializers import DailyQuestSerializer, SessionMetaSerializer


def effective_config(config):
    """Validate required arithmetic parameters before the legacy generator can default them."""
    if not isinstance(config, dict) or config.get("operation") not in ("ADD", "SUB", "MUL", "DIV", "MIXED"):
        return None
    for key, maximum in (("digits", 4), ("rows", 8), ("digits_row1", 4), ("digits_row2", 2)):
        if key not in config and key.startswith("digits_row"):
            continue
        value = config.get(key)
        minimum = 2 if key == "rows" else 1
        if not is_integer(value) or not minimum <= value <= maximum:
            return None
    frozen = {**copy.deepcopy(config), "question_count": 5, "time_limit_sec": 0}
    if not valid_questions(CuratedGenerator(seed=0, template_config=frozen).generate()):
        return None
    return frozen


def valid_questions(questions):
    return len(questions) == 5 and all(is_integer(q.answer) and q.answer >= 0 for q in questions)


def content_for_user(user):
    levels = list(Level.objects.using(DEFAULT_DB_ALIAS).order_by("order"))
    completed_levels = set(LevelCompletion.objects.using(DEFAULT_DB_ALIAS).filter(
        user=user, kind=SessionKind.CLASSWORK
    ).values_list("level_id", flat=True))
    unlocked = [level for index, level in enumerate(levels)
                if index == 0 or levels[index - 1].pk in completed_levels]
    if not unlocked:
        return None
    level = unlocked[-1]
    lessons = list(Lesson.objects.using(DEFAULT_DB_ALIAS).filter(level=level).order_by("order"))
    completed_lessons = set(LessonCompletion.objects.using(DEFAULT_DB_ALIAS).filter(
        user=user, kind=SessionKind.CLASSWORK, lesson__level=level
    ).values_list("lesson_id", flat=True))
    for index, lesson in enumerate(lessons):
        if index and lessons[index - 1].pk not in completed_lessons:
            continue
        template = ExerciseTemplate.objects.using(DEFAULT_DB_ALIAS).filter(
            lesson=lesson, kind=SessionKind.CLASSWORK
        ).first()
        config = effective_config(template.config_json) if template else None
        if config is not None:
            return level, lesson, template, config
    return None


def pinned_zone(user):
    first = DailyQuest.objects.using(DEFAULT_DB_ALIAS).filter(user=user).order_by("created_at", "id").first()
    name = first.timezone if first else Profile.objects.using(DEFAULT_DB_ALIAS).filter(
        user=user
    ).values_list("timezone", flat=True).first()
    try:
        return name, ZoneInfo(name)
    except (ZoneInfoNotFoundError, TypeError, ValueError):
        return "UTC", ZoneInfo("UTC")


def lock_student(user):
    # Serialize assignment/start without blocking finalization's User FK KEY SHARE
    # checks while it holds the mission row. No user identity key is changed here.
    locked = User.objects.using(DEFAULT_DB_ALIAS).select_for_update(no_key=True).get(pk=user.pk)
    if not locked.is_active or locked.role != "STUDENT":
        raise PermissionDenied("Daily missions are available to active students.")
    return locked


class PrivateMissionView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store"
        return response


class TodayDailyQuestView(PrivateMissionView):
    @transaction.atomic(using=DEFAULT_DB_ALIAS)
    def get(self, request):
        user = lock_student(request.user)
        now = timezone.now()
        name, zone = pinned_zone(user)
        date = now.astimezone(zone).date()
        quest = DailyQuest.objects.using(DEFAULT_DB_ALIAS).filter(user=user, mission_date=date).first()
        if quest is None:
            content = content_for_user(user)
            if content:
                level, lesson, template, config = content
                quest = DailyQuest.objects.using(DEFAULT_DB_ALIAS).create(
                    user=user, mission_date=date, timezone=name, config_json=config,
                    source_level_id=level.pk, source_lesson_id=lesson.pk, source_template_id=template.pk,
                    level_name=level.name, level_order=level.order,
                    lesson_name=lesson.name, lesson_order=lesson.order,
                )
        previous = DailyQuest.objects.using(DEFAULT_DB_ALIAS).filter(
            user=user, mission_date__lt=date, completed_at__isnull=True, session__isnull=False
        ).order_by("-mission_date").first()
        return Response({
            "server_now": now.isoformat(), "timezone": name,
            "reset_at": datetime.combine(date + timedelta(days=1), time.min, tzinfo=zone).isoformat(),
            "mission": DailyQuestSerializer(quest).data if quest else None,
            "previous_unfinished": DailyQuestSerializer(previous).data if previous else None,
            "reason": None if quest else "No mission available yet",
        })


class StartDailyQuestView(PrivateMissionView):
    @transaction.atomic(using=DEFAULT_DB_ALIAS)
    def post(self, request, mission_id):
        user = lock_student(request.user)
        # Never lock the attached session here: finalization locks session → mission.
        quest = get_object_or_404(
            DailyQuest.objects.using(DEFAULT_DB_ALIAS).select_for_update(), pk=mission_id, user=user
        )
        created = quest.session_id is None
        if created:
            seed = secrets.randbits(63)
            questions = CuratedGenerator(seed=seed, template_config=quest.config_json).generate()
            if not valid_questions(questions):
                raise ValidationError("Mission content is unavailable.")
            session = ArenaSession.objects.using(DEFAULT_DB_ALIAS).create(
                user=user, kind=SessionKind.ZEN, template=None, is_test_mode=True,
                config_json=copy.deepcopy(quest.config_json), seed=seed,
                questions_json=[q.to_dict() for q in questions],
            )
            quest.session = session
            quest.save(using=DEFAULT_DB_ALIAS, update_fields=["session"])
        else:
            session = ArenaSession.objects.using(DEFAULT_DB_ALIAS).get(pk=quest.session_id)
        return Response(SessionMetaSerializer(session).data, status=201 if created else 200)
