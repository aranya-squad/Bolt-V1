"""The v2 learning-attempt contract; callers hold the session row lock for writes."""

import logging
from dataclasses import dataclass

from django.db import DEFAULT_DB_ALIAS
from django.db.models import Count, Q
from rest_framework.exceptions import APIException

from .constants import (
    ANTICHEAT_ENFORCE_KINDS,
    MAX_ATTEMPTS_PER_QUESTION,
    MIN_ANSWER_MS,
    SKIP_ANSWER_SENTINEL,
)
from .models import SessionKind


class ContractError(APIException):
    def __init__(self, code, detail, status=400, **extra):
        self.status_code = status
        # Keep numeric identity/index fields numeric (APIException normally stringifies them).
        self.detail = {"code": code, "detail": detail, **extra}


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def is_v2(data):
    if not isinstance(data, dict):
        raise ContractError("invalid_attempt", "Request body must be an object.")
    if "contract_version" not in data:
        return False
    if not is_integer(data["contract_version"]) or data["contract_version"] != 2:
        raise ContractError("unsupported_contract", "Supported contract_version is 2.")
    return True


def receipt(attempt):
    return {
        "contract_version": 2,
        "question_index": attempt.question_index,
        "attempt_number": attempt.attempt_number,
        "accepted": True,
        "submitted_answer": attempt.submitted_answer,
        "elapsed_ms": attempt.elapsed_ms,
        "is_skip": attempt.is_skip,
        "is_correct": attempt.is_correct,
        "xp_delta": 0,
    }


def attempt_cap(session):
    if session.is_test_mode:
        return 1
    if session.kind in {SessionKind.CLASSWORK, SessionKind.HOMEWORK}:
        return MAX_ATTEMPTS_PER_QUESTION
    return None


def terminal(session, count, has_terminal):
    cap = attempt_cap(session)
    return bool(has_terminal) or (cap is not None and count >= cap)


def question_verdicts(attempts, question_count):
    """One terminal outcome/credit per frozen question, including absent answers."""
    groups = {i: [] for i in range(question_count)}
    for attempt in attempts:
        if attempt.question_index in groups:
            groups[attempt.question_index].append(attempt)
    verdicts = {}
    for index, group in groups.items():
        # Append order is accepted order; a later accepted gap may have a lower identity.
        group.sort(key=lambda a: a.pk)
        verdict = "unanswered"
        for position, attempt in enumerate(group):
            if attempt.is_skip:
                verdict = "skipped"
                break
            if attempt.is_correct:
                verdict = "correct" if position == 0 else "fixed"
                break
            verdict = "wrong"
        verdicts[index] = verdict
    return verdicts


def integer(item, key, low, high):
    value = item.get(key)
    if not is_integer(value) or not low <= value <= high:
        raise ContractError(
            "invalid_attempt", f"{key} must be an integer between {low} and {high}."
        )
    return value


def identity(item, question_count):
    if not isinstance(item, dict):
        raise ContractError("invalid_attempt", "Each item must be an object.")
    return (
        integer(item, "question_index", 0, min(question_count - 1, 32767)),
        integer(item, "attempt_number", 1, 32767),
    )


@dataclass
class InputAttempt:
    question_index: int
    attempt_number: int
    submitted_answer: int
    elapsed_ms: int
    is_skip: bool
    is_correct: bool = False


def item_error(error, index, item):
    fields = {
        key: item[key]
        for key in ("question_index", "attempt_number")
        if isinstance(item, dict) and is_integer(item.get(key))
    }
    return {
        "index": index,
        **fields,
        "code": error.detail["code"],
        "detail": error.detail["detail"],
    }


def validate_manifest(session, items):
    if not isinstance(items, list) or len(items) > 200:
        raise ContractError(
            "invalid_attempt", "expected_attempts must be a list of at most 200 identities."
        )
    attempts = session.attempts.db_manager(session._state.db or DEFAULT_DB_ALIAS)
    identities = set()
    for index, item in enumerate(items):
        try:
            key = identity(item, len(session.questions_json))
            if key in identities:
                raise ContractError("duplicate_identity", "Duplicate manifest identity.")
            identities.add(key)
        except ContractError as error:
            raise ContractError(
                error.detail["code"], error.detail["detail"], items=[item_error(error, index, item)]
            ) from error
    selectors = Q(pk__in=[])
    for q, number in identities:
        selectors |= Q(question_index=q, attempt_number=number)
    stored = set(attempts.filter(selectors).values_list("question_index", "attempt_number"))
    missing = sorted(identities - stored)
    if missing:
        raise ContractError(
            "pending_attempts",
            "Required attempts have not been accepted.",
            409,
            missing_attempts=[{"question_index": q, "attempt_number": a} for q, a in missing],
        )


def accept_batch(session, items):
    """Validate the entire sequence before the first append, then return original-order receipts."""
    from apps.progress.services import record_attempt

    if not isinstance(items, list) or len(items) > 100:
        raise ContractError("invalid_attempt", "attempts must be a list of at most 100 items.")
    # Explicit manager alias keeps replica routing out of authoritative recovery reads.
    attempts = session.attempts.db_manager(session._state.db or DEFAULT_DB_ALIAS)
    if attempts.filter(attempt_number__isnull=True).exists():
        raise ContractError(
            "unsupported_contract", "Historical attempts lack recoverable identities."
        )
    parsed, seen, errors = [], {}, []
    for index, item in enumerate(items):
        try:
            q, number = identity(item, len(session.questions_json))
            key = (q, number)
            if key in seen:
                error = ContractError("duplicate_identity", "Duplicate identity in batch.")
                errors.append(item_error(error, seen[key], items[seen[key]]))
                raise error
            seen[key] = index
            answer = integer(item, "answer", -2147483648, 2147483647)
            elapsed = integer(item, "elapsed_ms", 0, 2147483647)
            flag = item.get("is_skip")
            if "is_skip" in item and not isinstance(flag, bool):
                raise ContractError("invalid_attempt", "is_skip must be a boolean.")
            if (flag is False and answer == SKIP_ANSWER_SENTINEL) or (
                flag is True and answer not in (0, SKIP_ANSWER_SENTINEL)
            ):
                raise ContractError("invalid_attempt", "Conflicting skip representation.")
            skip = flag is True or answer == SKIP_ANSWER_SENTINEL
            parsed.append(
                (
                    index,
                    InputAttempt(
                        q, number, SKIP_ANSWER_SENTINEL if skip else answer, elapsed, skip
                    ),
                )
            )
        except ContractError as error:
            errors.append(item_error(error, index, item))
    if errors:
        raise ContractError(errors[0]["code"], "Batch validation failed.", items=errors)

    if not parsed:
        return []
    selectors = Q(pk__in=[])
    for q, number in seen:
        selectors |= Q(question_index=q, attempt_number=number)
    stored = attempts.filter(selectors)
    by_identity = {(a.question_index, a.attempt_number): a for a in stored}
    # Counts and terminal flags are bounded by question count, even after many retries.
    states = {
        row["question_index"]: [row["count"], row["has_terminal"]]
        for row in attempts.filter(question_index__in={q for q, _ in seen})
        .values("question_index")
        .annotate(
            count=Count("id"), has_terminal=Count("id", filter=Q(is_correct=True) | Q(is_skip=True))
        )
    }
    new = []
    for index, item in sorted(
        parsed, key=lambda pair: (pair[1].question_index, pair[1].attempt_number)
    ):
        key = (item.question_index, item.attempt_number)
        existing = by_identity.get(key)
        if existing:
            if (existing.submitted_answer, existing.elapsed_ms, existing.is_skip) != (
                item.submitted_answer,
                item.elapsed_ms,
                item.is_skip,
            ):
                error = ContractError(
                    "identity_conflict",
                    "Identity already contains a different accepted payload.",
                    409,
                    receipt=receipt(existing),
                )
            else:
                continue
        elif not session.is_active:
            error = ContractError(
                "session_closed", "Session is closed; only exact accepted replays are allowed.", 409
            )
        else:
            if not item.is_skip and item.elapsed_ms < MIN_ANSWER_MS:
                logging.getLogger("apps.exercises.anticheat").warning(
                    "min_answer_ms_violation",
                    extra={
                        "session_id": str(session.pk),
                        "question_index": item.question_index,
                        "elapsed_ms": item.elapsed_ms,
                        "session_kind": session.kind,
                    },
                )
            state = states.setdefault(item.question_index, [0, 0])
            if terminal(session, state[0], state[1]):
                error = ContractError(
                    "attempt_limit", "This question has reached its terminal state.", 409
                )
            elif session.is_test_mode and item.is_skip:
                error = ContractError("invalid_attempt", "Skipping is not allowed in Test Mode.")
            elif (
                not item.is_skip
                and item.elapsed_ms < MIN_ANSWER_MS
                and session.kind in ANTICHEAT_ENFORCE_KINDS
            ):
                error = ContractError(
                    "invalid_attempt", "Submission rejected: answer submitted implausibly fast."
                )
            else:
                item.is_correct = (
                    not item.is_skip
                    and item.submitted_answer
                    == session.questions_json[item.question_index]["answer"]
                )
                state[0] += 1
                state[1] += int(item.is_correct or item.is_skip)
                new.append(item)
                continue
        error.detail["items"] = [item_error(error, index, items[index])]
        raise error

    for item in new:
        q = session.questions_json[item.question_index]
        attempt = record_attempt(
            session=session,
            question_index=item.question_index,
            attempt_number=item.attempt_number,
            question_text=q["text"],
            expected_answer=q["answer"],
            submitted_answer=item.submitted_answer,
            elapsed_ms=item.elapsed_ms,
            is_skip=item.is_skip,
        )
        by_identity[(item.question_index, item.attempt_number)] = attempt
    return [receipt(by_identity[(item.question_index, item.attempt_number)]) for _, item in parsed]
