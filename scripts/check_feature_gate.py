#!/usr/bin/env python3
"""Validate Bolt AI-SDLC feature gate evidence.

Standard-library only. This validates recorded repository invariants; it does not
prove semantic correctness, actual test execution, reviewer independence, hosted
CI, live systems, or production state.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

GATES = ("G1", "G2", "G4", "G5")
ROLES = {"product_manager", "cto", "head_qa"}
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
TASK_PASS = {"PASS", "DONE", "SKIPPED_APPROVED"}
AC_PASS = {"PASS", "NOT_APPLICABLE_APPROVED"}


class GateError(ValueError):
    pass


def load(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise GateError(f"cannot read valid JSON plan: {exc}") from exc
    if not isinstance(value, dict):
        raise GateError("plan root must be a JSON object")
    return value


def resolve(plan_path: Path, value: Any) -> Path | None:
    if not isinstance(value, str) or not value.strip():
        return None
    p = Path(value)
    if p.is_absolute():
        return p
    for parent in (plan_path.parent, *plan_path.parents):
        candidate = parent / p
        if candidate.exists():
            return candidate
    return plan_path.parent / p


def scope_path(plan_path: Path, plan: dict[str, Any], override: Path | None) -> Path:
    scope = plan.get("scope")
    if not isinstance(scope, dict):
        raise GateError("scope must be an object")
    recorded = resolve(plan_path, scope.get("path"))
    if override is not None:
        chosen = override.resolve()
        if recorded is not None and recorded.exists() and recorded.resolve() != chosen:
            raise GateError("--scope does not match scope.path recorded in plan")
        return chosen
    if recorded is None:
        raise GateError("scope.path must be a non-empty path")
    return recorded


def arr(value: Any, label: str, errors: list[str]) -> list[Any]:
    if not isinstance(value, list):
        errors.append(f"{label}: must be an array")
        return []
    return value


def obj(value: Any, label: str, errors: list[str]) -> dict[str, Any]:
    if not isinstance(value, dict):
        errors.append(f"{label}: must be an object")
        return {}
    return value


def g1(plan_path: Path, plan: dict[str, Any], scope_file: Path, errors: list[str]) -> str:
    if plan.get("ai_sdlc_version") != 1:
        errors.append("ai_sdlc_version: expected 1")
    if plan.get("prospective_only") is not True:
        errors.append("prospective_only: must be true")
    if not isinstance(plan.get("feature_id"), str) or not plan["feature_id"].strip():
        errors.append("feature_id: non-empty string required")

    context = obj(plan.get("context"), "context", errors)
    for key in ("remote_refs_checked", "existing_behavior_inspected", "dependencies_recorded"):
        if context.get(key) is not True:
            errors.append(f"context.{key}: must be true before G1")

    scope = obj(plan.get("scope"), "scope", errors)
    digest = scope.get("sha256")
    if not isinstance(digest, str) or not SHA256_RE.fullmatch(digest):
        errors.append("scope.sha256: lowercase 64-character SHA-256 required")
        digest = ""
    try:
        actual = hashlib.sha256(scope_file.read_bytes()).hexdigest()
    except OSError as exc:
        raise GateError(f"cannot read scope file {scope_file}: {exc}") from exc
    if digest and actual != digest:
        errors.append(f"scope.sha256: stale/wrong digest; recorded {digest}, actual {actual}")
    if not isinstance(scope.get("version"), str) or not scope["version"].strip():
        errors.append("scope.version: non-empty string required")
    base = scope.get("base_commit")
    if not isinstance(base, str) or not COMMIT_RE.fullmatch(base):
        errors.append("scope.base_commit: lowercase 40-character commit SHA required")
    if plan.get("plan_scope_sha256") != digest:
        errors.append("plan_scope_sha256: must exactly match scope.sha256")

    approvals = arr(plan.get("approvals"), "approvals", errors)
    by_role: dict[str, dict[str, Any]] = {}
    for i, review in enumerate(approvals):
        if not isinstance(review, dict):
            errors.append(f"approvals[{i}]: must be an object")
            continue
        role = review.get("role")
        if not isinstance(role, str) or not role:
            errors.append(f"approvals[{i}].role: required")
            continue
        if role in by_role:
            errors.append(f"approvals: duplicate role {role}")
        by_role[role] = review
    for role in sorted(ROLES):
        review = by_role.get(role)
        if review is None:
            errors.append(f"approvals: missing mandatory reviewer role {role}")
            continue
        if not isinstance(review.get("agent_id"), str) or not review["agent_id"].strip():
            errors.append(f"{role}: agent_id required")
        if review.get("decision") != "APPROVED":
            errors.append(f"{role}: decision must be APPROVED")
        if review.get("scope_sha256") != digest:
            errors.append(f"{role}: approval digest is stale or does not match scope.sha256")

    blockers = plan.get("unresolved_blockers")
    if not isinstance(blockers, list):
        errors.append("unresolved_blockers: must be an array")
    elif blockers:
        errors.append("unresolved_blockers: must be empty at G1")

    routes = obj(plan.get("risk_route"), "risk_route", errors)
    reviews = arr(plan.get("specialist_reviews", []), "specialist_reviews", errors)
    review_by_role: dict[str, dict[str, Any]] = {}
    for i, review in enumerate(reviews):
        if not isinstance(review, dict):
            errors.append(f"specialist_reviews[{i}]: must be an object")
            continue
        role = review.get("role")
        if not isinstance(role, str) or not role:
            errors.append(f"specialist_reviews[{i}].role: required")
            continue
        if role in review_by_role:
            errors.append(f"specialist_reviews: duplicate role {role}")
        review_by_role[role] = review

    for role, route in routes.items():
        if not isinstance(route, dict):
            errors.append(f"risk_route.{role}: must be an object")
            continue
        required = route.get("required")
        if not isinstance(required, bool):
            errors.append(f"risk_route.{role}.required: must be true or false")
            continue
        if not isinstance(route.get("reason"), str) or not route["reason"].strip():
            errors.append(f"risk_route.{role}.reason: concrete routing reason required")
        review = review_by_role.get(role)
        if required:
            if review is None:
                errors.append(f"required specialist {role}: review record missing")
                continue
            if not isinstance(review.get("agent_id"), str) or not review["agent_id"].strip():
                errors.append(f"required specialist {role}: agent_id required")
            if review.get("decision") != "APPROVED":
                errors.append(f"required specialist {role}: decision must be APPROVED")
            if review.get("scope_sha256") != digest:
                errors.append(f"required specialist {role}: approval digest is stale")
        elif review is not None:
            if review.get("decision") not in ("APPROVED", "NOT_REQUIRED"):
                errors.append(f"optional specialist {role}: invalid decision")
            if review.get("decision") == "APPROVED" and review.get("scope_sha256") != digest:
                errors.append(f"optional specialist {role}: approval digest is stale")
    return digest


def execution(plan: dict[str, Any], errors: list[str]):
    requirements = arr(plan.get("requirements"), "requirements", errors)
    need_ac: dict[str, set[str]] = {}
    req_ids: set[str] = set()
    for i, req in enumerate(requirements):
        if not isinstance(req, dict):
            errors.append(f"requirements[{i}]: must be an object")
            continue
        rid = req.get("id")
        if not isinstance(rid, str) or not rid:
            errors.append(f"requirements[{i}].id: required")
            continue
        if rid in req_ids:
            errors.append(f"requirements: duplicate id {rid}")
        req_ids.add(rid)
        if req.get("kind") == "NEED":
            ids = req.get("acceptance_ids")
            if not isinstance(ids, list) or not ids:
                errors.append(f"NEED {rid}: must map to one or more acceptance IDs")
            else:
                need_ac[rid] = {str(x) for x in ids}
    if not need_ac:
        errors.append("requirements: at least one NEED required")

    acs = arr(plan.get("acceptance"), "acceptance", errors)
    ac_by_id: dict[str, dict[str, Any]] = {}
    for i, ac in enumerate(acs):
        if not isinstance(ac, dict):
            errors.append(f"acceptance[{i}]: must be an object")
            continue
        aid = ac.get("id")
        if not isinstance(aid, str) or not aid:
            errors.append(f"acceptance[{i}].id: required")
            continue
        if aid in ac_by_id:
            errors.append(f"acceptance: duplicate id {aid}")
        ac_by_id[aid] = ac
    for need, ids in need_ac.items():
        for aid in ids:
            if aid not in ac_by_id:
                errors.append(f"NEED {need}: references unknown acceptance ID {aid}")

    waves = arr(plan.get("waves"), "waves", errors)
    if not waves:
        errors.append("waves: must be non-empty")
    wave_ids: set[str] = set()
    story_ids: set[str] = set()
    task_ids: set[str] = set()
    tasks: dict[str, dict[str, Any]] = {}
    mapped: set[str] = set()

    for wi, wave in enumerate(waves):
        if not isinstance(wave, dict):
            errors.append(f"waves[{wi}]: must be an object")
            continue
        wid = wave.get("id")
        if not isinstance(wid, str) or not wid:
            errors.append(f"waves[{wi}].id: required")
            wid = f"<wave-{wi}>"
        elif wid in wave_ids:
            errors.append(f"waves: duplicate id {wid}")
        else:
            wave_ids.add(wid)
        cats = arr(wave.get("categories"), f"{wid}.categories", errors)
        if not cats:
            errors.append(f"{wid}: categories must be non-empty")
        for ci, cat in enumerate(cats):
            if not isinstance(cat, dict):
                errors.append(f"{wid}.categories[{ci}]: must be an object")
                continue
            stories = arr(cat.get("stories"), f"{wid}.categories[{ci}].stories", errors)
            if not stories:
                errors.append(f"{wid}.categories[{ci}]: stories must be non-empty")
            for si, story in enumerate(stories):
                if not isinstance(story, dict):
                    errors.append(f"story {wid}/{ci}/{si}: must be an object")
                    continue
                sid = story.get("id")
                if not isinstance(sid, str) or not sid:
                    errors.append(f"story {wid}/{ci}/{si}: id required")
                    sid = f"<story-{wi}-{ci}-{si}>"
                elif sid in story_ids:
                    errors.append(f"stories: duplicate id {sid}")
                else:
                    story_ids.add(sid)
                s_acs = story.get("acceptance_ids")
                if not isinstance(s_acs, list) or not s_acs:
                    errors.append(f"{sid}: acceptance_ids must be non-empty")
                    s_acs = []
                for aid in s_acs:
                    if aid not in ac_by_id:
                        errors.append(f"{sid}: unknown acceptance ID {aid}")
                    else:
                        mapped.add(aid)
                items = arr(story.get("tasks"), f"{sid}.tasks", errors)
                if not items:
                    errors.append(f"{sid}: tasks must be non-empty")
                for ti, task in enumerate(items):
                    if not isinstance(task, dict):
                        errors.append(f"{sid}.tasks[{ti}]: must be an object")
                        continue
                    tid = task.get("id")
                    if not isinstance(tid, str) or not tid:
                        errors.append(f"{sid}.tasks[{ti}].id: required")
                        continue
                    if tid in task_ids:
                        errors.append(f"tasks: duplicate id {tid}")
                    task_ids.add(tid)
                    tasks[tid] = task
                    for key in ("owner_class", "model_class"):
                        if not isinstance(task.get(key), str) or not task[key].strip():
                            errors.append(f"{tid}: {key} required")
                    for key in ("writable_paths", "checks"):
                        value = task.get(key)
                        if not isinstance(value, list) or not value or not all(
                            isinstance(x, str) and x.strip() for x in value
                        ):
                            errors.append(f"{tid}: {key} must be a non-empty string array")
                    deps = task.get("depends_on")
                    if not isinstance(deps, list) or not all(isinstance(x, str) for x in deps):
                        errors.append(f"{tid}: depends_on must be an array of task IDs")
                    trace = task.get("traceability")
                    prereq = task.get("prerequisite_reason")
                    if (not isinstance(trace, list) or not trace) and not (
                        isinstance(prereq, str) and prereq.strip()
                    ):
                        errors.append(f"{tid}: needs traceability or prerequisite_reason")
                        trace = []
                    if isinstance(trace, list):
                        for aid in trace:
                            if isinstance(aid, str) and aid.startswith("PREREQ:"):
                                continue
                            if aid not in ac_by_id:
                                errors.append(f"{tid}: unknown traceability ref {aid}")
                            else:
                                mapped.add(aid)

    for aid, ac in ac_by_id.items():
        if ac.get("required", True) and aid not in mapped:
            errors.append(f"{aid}: required acceptance criterion is not mapped to story/task")

    graph: dict[str, list[str]] = {}
    for tid, task in tasks.items():
        deps = task.get("depends_on") if isinstance(task.get("depends_on"), list) else []
        graph[tid] = []
        for dep in deps:
            if dep not in tasks:
                errors.append(f"{tid}: depends on unknown task {dep}")
            else:
                graph[tid].append(dep)
    state: dict[str, int] = {}
    def visit(node: str, path: list[str]) -> None:
        if state.get(node) == 1:
            errors.append(f"task dependency cycle detected: {' -> '.join(path + [node])}")
            return
        if state.get(node) == 2:
            return
        state[node] = 1
        for dep in graph.get(node, []):
            visit(dep, path + [node])
        state[node] = 2
    for tid in graph:
        if not state.get(tid):
            visit(tid, [])
    return ac_by_id, tasks


def g2(plan: dict[str, Any], digest: str, errors: list[str]):
    if plan.get("implementation_authorized") is not True:
        errors.append("implementation_authorized: must be true after G1")
    if plan.get("plan_scope_sha256") != digest:
        errors.append("plan_scope_sha256: must match frozen scope digest at G2")
    return execution(plan, errors)


def g4(
    plan: dict[str, Any],
    acs: dict[str, dict[str, Any]],
    tasks: dict[str, dict[str, Any]],
    errors: list[str],
) -> None:
    for aid, ac in acs.items():
        if ac.get("required", True) and ac.get("status") not in AC_PASS:
            errors.append(f"{aid}: required acceptance status must be PASS")
    for tid, task in tasks.items():
        if task.get("status") not in TASK_PASS:
            errors.append(f"{tid}: task status must be PASS/DONE")
    quality = obj(plan.get("quality_reviews"), "quality_reviews", errors)
    integrated = quality.get("integrated_commit")
    if not isinstance(integrated, str) or not COMMIT_RE.fullmatch(integrated):
        errors.append("quality_reviews.integrated_commit: 40-character commit SHA required")
    if quality.get("code_review") != "PASS":
        errors.append("quality_reviews.code_review: independent review must PASS")
    if quality.get("qa_review") != "PASS":
        errors.append("quality_reviews.qa_review: Head-QA execution review must PASS")
    if quality.get("security_required") is True:
        if quality.get("security_review") != "PASS":
            errors.append("quality_reviews.security_review: required security review must PASS")
    elif quality.get("security_review") not in ("PASS", "NOT_REQUIRED"):
        errors.append("quality_reviews.security_review: must be PASS or NOT_REQUIRED")
    findings = quality.get("findings", [])
    if not isinstance(findings, list):
        errors.append("quality_reviews.findings: must be an array")
    else:
        for i, finding in enumerate(findings):
            if not isinstance(finding, dict):
                errors.append(f"quality_reviews.findings[{i}]: must be an object")
            elif finding.get("blocking") is True and finding.get("status") != "RESOLVED":
                errors.append(f"quality finding {finding.get('id', i)}: blocking finding unresolved")
    blockers = plan.get("unresolved_blockers")
    if not isinstance(blockers, list) or blockers:
        errors.append("unresolved_blockers: must remain empty at G4")


def g5(plan_path: Path, plan: dict[str, Any], errors: list[str]) -> None:
    pub = obj(plan.get("publication"), "publication", errors)
    if not isinstance(pub.get("feature_branch"), str) or not pub["feature_branch"].strip():
        errors.append("publication.feature_branch: non-empty branch required")
    final = pub.get("final_commit")
    if not isinstance(final, str) or not COMMIT_RE.fullmatch(final):
        errors.append("publication.final_commit: lowercase 40-character commit SHA required")
    if pub.get("feature_branch_pushed") is not True:
        errors.append("publication.feature_branch_pushed: must be true")
    if pub.get("merged") is not False:
        errors.append("publication.merged: must be false at AI handoff")
    if pub.get("deployed") is not False:
        errors.append("publication.deployed: must be false at AI handoff")
    quality = plan.get("quality_reviews")
    if isinstance(quality, dict):
        integrated = quality.get("integrated_commit")
        if (
            isinstance(final, str) and COMMIT_RE.fullmatch(final)
            and isinstance(integrated, str) and COMMIT_RE.fullmatch(integrated)
            and final != integrated
        ):
            errors.append("publication.final_commit: must match quality_reviews.integrated_commit")
    if plan.get("final_status") != "READY FOR HUMAN REVIEW":
        errors.append("final_status: must be READY FOR HUMAN REVIEW")
    tracker = resolve(plan_path, plan.get("tracker_path"))
    if tracker is None:
        errors.append("tracker_path: non-empty path required")
    elif not tracker.is_file():
        errors.append(f"tracker_path: file does not exist: {tracker}")


def validate(plan_path: Path, gate: str, scope_override: Path | None = None) -> list[str]:
    plan = load(plan_path)
    chosen_scope = scope_path(plan_path, plan, scope_override)
    errors: list[str] = []
    digest = g1(plan_path, plan, chosen_scope, errors)
    acs: dict[str, dict[str, Any]] = {}
    tasks: dict[str, dict[str, Any]] = {}
    if gate in ("G2", "G4", "G5"):
        acs, tasks = g2(plan, digest, errors)
    if gate in ("G4", "G5"):
        g4(plan, acs, tasks, errors)
    if gate == "G5":
        g5(plan_path, plan, errors)
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan_path", nargs="?", type=Path)
    parser.add_argument("--plan", dest="plan_option", type=Path)
    parser.add_argument("--scope", type=Path)
    parser.add_argument("--gate", required=True, choices=GATES)
    args = parser.parse_args(argv)
    if args.plan_path and args.plan_option and args.plan_path != args.plan_option:
        parser.error("provide positional plan_path or --plan, not two different plans")
    plan_path = args.plan_path or args.plan_option
    if plan_path is None:
        parser.error("a feature plan is required (positional path or --plan)")
    try:
        errors = validate(plan_path, args.gate, args.scope)
    except GateError as exc:
        print(f"FAIL {args.gate}: {exc}", file=sys.stderr)
        return 2
    if errors:
        print(f"FAIL {args.gate}: {len(errors)} issue(s)", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"PASS {args.gate}: {plan_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
