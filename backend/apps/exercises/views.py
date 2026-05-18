import random

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Level
from apps.exercises.generators.curated import CuratedGenerator
from apps.exercises.generators.procedural import ProceduralGenerator
from apps.progress.models import LevelCompletion, ProgressRecord
from apps.progress.services import finalize_session, record_attempt

from .models import ArenaSession, ExerciseTemplate, SessionKind
from .serializers import AttemptSerializer, ProgressRecordSerializer, SessionMetaSerializer


class StartClassworkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, level_id):
        level = get_object_or_404(Level, pk=level_id)

        if level.order > 1:
            prev_level = Level.objects.filter(order=level.order - 1).first()
            if prev_level and not LevelCompletion.objects.filter(
                user=request.user, level=prev_level, kind="CLASSWORK"
            ).exists():
                return Response({"detail": "Level is locked."}, status=status.HTTP_403_FORBIDDEN)

        existing = ArenaSession.objects.filter(
            user=request.user,
            kind=SessionKind.CLASSWORK,
            template__lesson__level=level,
            submitted_at__isnull=True,
            abandoned_at__isnull=True,
        ).first()
        if existing:
            return Response(SessionMetaSerializer(existing).data)

        template = (
            ExerciseTemplate.objects.filter(lesson__level=level, kind=SessionKind.CLASSWORK)
            .select_related("lesson")
            .first()
        )
        if template is None:
            return Response(
                {"detail": "No content available for this level."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        seed = random.getrandbits(63)
        generator = CuratedGenerator(seed=seed, template_config=template.config_json)
        questions = generator.generate()

        session = ArenaSession.objects.create(
            user=request.user,
            kind=SessionKind.CLASSWORK,
            template=template,
            config_json=template.config_json,
            seed=seed,
            questions_json=[q.to_dict() for q in questions],
        )
        return Response(SessionMetaSerializer(session).data, status=status.HTTP_201_CREATED)


class StartPracticeView(APIView):
    permission_classes = [IsAuthenticated]

    VALID_MODES = {"TIME_ATTACK", "ZEN", "CUSTOM"}
    VALID_OPERATIONS = {"ADD", "SUB", "MUL", "DIV"}

    def post(self, request):
        errors = {}

        mode = request.data.get("mode")
        if not mode:
            errors["mode"] = "Required."
        elif mode not in self.VALID_MODES:
            errors["mode"] = f"Must be one of {sorted(self.VALID_MODES)}."

        operation = request.data.get("operation")
        if not operation:
            errors["operation"] = "Required."
        elif operation not in self.VALID_OPERATIONS:
            errors["operation"] = f"Must be one of {sorted(self.VALID_OPERATIONS)}."

        try:
            digits = int(request.data.get("digits", ""))
            if not 1 <= digits <= 4:
                errors["digits"] = "Must be between 1 and 4."
        except (TypeError, ValueError):
            errors["digits"] = "Must be an integer."

        try:
            rows = int(request.data.get("rows", ""))
            if not 2 <= rows <= 8:
                errors["rows"] = "Must be between 2 and 8."
        except (TypeError, ValueError):
            errors["rows"] = "Must be an integer."

        try:
            question_count = int(request.data.get("question_count", ""))
            if not 1 <= question_count <= 100:
                errors["question_count"] = "Must be between 1 and 100."
        except (TypeError, ValueError):
            errors["question_count"] = "Must be an integer."

        try:
            time_limit_sec = int(request.data.get("time_limit_sec", ""))
            if time_limit_sec < 0:
                errors["time_limit_sec"] = "Must be >= 0."
        except (TypeError, ValueError):
            errors["time_limit_sec"] = "Must be an integer."

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        config = {
            "operation": operation,
            "digits": digits,
            "rows": rows,
            "question_count": question_count,
            "time_limit_sec": time_limit_sec,
        }

        seed = random.getrandbits(63)
        questions = ProceduralGenerator(seed=seed, config=config).generate()

        session = ArenaSession.objects.create(
            user=request.user,
            kind=mode,
            template=None,
            config_json=config,
            seed=seed,
            questions_json=[q.to_dict() for q in questions],
        )
        return Response(SessionMetaSerializer(session).data, status=status.HTTP_201_CREATED)


class SessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(ArenaSession, pk=session_id, user=request.user)
        return Response(SessionMetaSerializer(session).data)


class SubmitAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(ArenaSession, pk=session_id, user=request.user)

        if not session.is_active:
            return Response({"detail": "Session is not active."}, status=status.HTTP_400_BAD_REQUEST)

        question_index = request.data.get("question_index")
        if question_index is None:
            return Response({"detail": "question_index is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            question_index = int(question_index)
        except (TypeError, ValueError):
            return Response({"detail": "question_index must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        if question_index < 0 or question_index >= len(session.questions_json):
            return Response({"detail": "question_index out of bounds."}, status=status.HTTP_400_BAD_REQUEST)

        raw_answer = request.data.get("answer")
        if raw_answer is None:
            return Response({"detail": "answer is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            answer = int(raw_answer)
        except (TypeError, ValueError):
            return Response({"detail": "answer must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        elapsed_ms = int(request.data.get("elapsed_ms", 0))

        from apps.progress.models import QuestionAttempt

        existing_attempt = QuestionAttempt.objects.filter(
            session=session, question_index=question_index
        ).first()
        if existing_attempt:
            return Response({
                "question_index": existing_attempt.question_index,
                "is_correct": existing_attempt.is_correct,
                "xp_delta": 0,
            })

        q = session.questions_json[question_index]
        attempt = record_attempt(
            session=session,
            question_index=question_index,
            question_text=q["text"],
            expected_answer=q["answer"],
            submitted_answer=answer,
            elapsed_ms=elapsed_ms,
        )

        return Response({
            "question_index": attempt.question_index,
            "is_correct": attempt.is_correct,
            "xp_delta": 0,
        })


class FinalizeSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(
            ArenaSession.objects.select_related("template__lesson__level"),
            pk=session_id,
            user=request.user,
        )

        try:
            record = session.progress_record
            return Response(ProgressRecordSerializer(record).data)
        except ProgressRecord.DoesNotExist:
            pass

        try:
            record = finalize_session(session)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ProgressRecordSerializer(record).data)


class SessionReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(ArenaSession, pk=session_id, user=request.user)

        try:
            record = session.progress_record
        except ProgressRecord.DoesNotExist:
            return Response(
                {"detail": "Session not yet finalized."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attempts = session.attempts.order_by("question_index")
        return Response({
            "progress": ProgressRecordSerializer(record).data,
            "attempts": AttemptSerializer(attempts, many=True).data,
        })
