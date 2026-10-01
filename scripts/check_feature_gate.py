#!/usr/bin/env python3
"""Validate prospective Bolt AI-SDLC feature gate manifests."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

REQUIRED_ROLES = {"product_manager", "senior_tech_manager_cto", "head_qa"}
HEX64 = re.compile(r"^[0-9a-f]{64}$")
HEX40 = re.compile(r"^[0-9a-f]{40}$")
TASK_STATUSES = {"PENDING", "IN_PROGRESS", "PASS", "BLOCKED"}


def _d(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _l(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _scope_digest(root: Path, rel: str, errors: list[str]) -> str | None:
    if not rel:
        errors.append("scope.path is required")
        return None
    path = (root / rel).resolve()
    try:
        path.relative_to(root)
    except ValueError:
        errors.append("scope.path must stay inside the repository")
        return None
    if not path.is_file():
        errors.append(f"scope file not found: {rel}")
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _g0(plan: dict[str, Any], root: Path, errors: list[str]) -> None:
    if not str(plan.get("feature_id", "")).strip():
        errors.append("feature_id is required")

    scope = _d(plan.get("scope"))
    if not str(scope.get("version", "")).strip():
        errors.append("scope.version is required")
    if not HEX40.fullmatch(str(scope.get("base_commit", ""))):
        errors.append("scope.base_commit must be a full 40-character commit SHA")

    context = _d(plan.get("context"))
    for field in ("remote_refs_checked", "existing_behavior_inspected", "dependencies_recorded"):
        if context.get(field) is not True:
            errors.append(f"context.{field} must be true before G0 passes")


def _g1(plan: dict[str, Any], root: Path, errors: list[str]) -> None:
    _g0(plan, root, errors)
    scope = _d(plan.get("scope"))
    recorded = str(scope.get("sha256", ""))
    if not HEX64.fullmatch(recorded):
        errors.append("scope.sha256 must be a lowercase 64-character SHA-256 digest")

    actual = _scope_digest(root, str(scope.get("path", "")), errors)
    if actual and recorded and actual != recorded:
        errors.append(f"scope.sha256 mismatch: recorded {recorded}, actual {actual}")

    route = _d(plan.get("review_route"))
    seen: set[str] = set()
    for item in _l(route.get("mandatory")):
        review = _d(item)
        role = str(review.get("role", ""))
        if role in seen:
            errors.append(f"duplicate mandatory reviewer role: {role}")
        seen.add(role)
        if review.get("decision") != "APPROVED":
            errors.append(f"mandatory reviewer {role or '<missing>'} is not APPROVED")
        if review.get("scope_sha256") != recorded:
            errors.append(f"mandatory reviewer {role or '<missing>'} signed a stale/different scope digest")
        if not str(review.get("reviewer", "")).strip():
            errors.append(f"mandatory reviewer {role or '<missing>'} needs a reviewer identifier")

    missing = REQUIRED_ROLES - seen
    extra = seen - REQUIRED_ROLES
    if missing:
        errors.append("missing mandatory reviewer roles: " + ", ".join(sorted(missing)))
    if extra:
        errors.append("unexpected mandatory reviewer roles: " + ", ".join(sorted(extra)))

    for item in _l(route.get("specialists")):
        review = _d(item)
        role = str(review.get("role", "<missing>"))
        required = review.get("required") is True
        decision = review.get("decision")
        if required:
            if decision != "APPROVED":
                errors.append(f"required specialist {role} is not APPROVED")
            if review.get("scope_sha256") != recorded:
                errors.append(f"required specialist {role} signed a stale/different scope digest")
        elif decision not in {"NOT_REQUIRED", "APPROVED"}:
            errors.append(f"optional specialist {role} must be NOT_REQUIRED or APPROVED")

    if _l(plan.get("blocking_findings")):
        errors.append("blocking_findings must be empty before G1 passes")


def _collect_tasks(plan: dict[str, Any], errors: list[str]) -> tuple[dict[str, dict[str, Any]], set[str]]:
    tasks: dict[str, dict[str, Any]] = {}
    refs: set[str] = set()
    waves = _l(plan.get("waves"))
    if not waves:
        errors.append("waves must contain at least one execution wave")
        return tasks, refs

    wave_ids: set[str] = set()
    story_ids: set[str] = set()

    for wave in waves:
        w = _d(wave)
        wid = str(w.get("id", ""))
        if not wid or wid in wave_ids:
            errors.append(f"wave id missing or duplicate: {wid or '<missing>'}")
        wave_ids.add(wid)

        categories = _l(w.get("categories"))
        if not categories:
            errors.append(f"wave {wid or '<missing>'} has no categories")

        for category in categories:
            c = _d(category)
            cid = str(c.get("id", ""))
            if not cid:
                errors.append(f"wave {wid or '<missing>'} has a category without id")

            stories = _l(c.get("stories"))
            if not stories:
                errors.append(f"category {cid or '<missing>'} has no stories")

            for story in stories:
                s = _d(story)
                sid = str(s.get("id", ""))
                if not sid or sid in story_ids:
                    errors.append(f"story id missing or duplicate: {sid or '<missing>'}")
                story_ids.add(sid)

                refs |= {str(x) for x in _l(s.get("acceptance")) if str(x)}
                story_tasks = _l(s.get("tasks"))
                if not story_tasks:
                    errors.append(f"story {sid or '<missing>'} has no tasks")

                for task in story_tasks:
                    t = _d(task)
                    tid = str(t.get("id", ""))
                    if not tid or tid in tasks:
                        errors.append(f"task id missing or duplicate: {tid or '<missing>'}")
                        continue

                    tasks[tid] = t
                    task_refs = {str(x) for x in _l(t.get("acceptance")) if str(x)}
                    refs |= task_refs

                    if not task_refs and not str(t.get("prerequisite_reason", "")).strip():
                        errors.append(f"task {tid} must map to acceptance IDs or declare prerequisite_reason")
                    if not str(t.get("model_class", "")).strip():
                        errors.append(f"task {tid} needs model_class")
                    if not isinstance(t.get("writable_paths"), list):
                        errors.append(f"task {tid} writable_paths must be a list")
                    if not isinstance(t.get("depends_on"), list):
                        errors.append(f"task {tid} depends_on must be a list")
                    if t.get("status") not in TASK_STATUSES:
                        errors.append(f"task {tid} has invalid status {t.get('status')!r}")

    return tasks, refs


def _validate_dependencies(tasks: dict[str, dict[str, Any]], errors: list[str]) -> None:
    graph: dict[str, list[str]] = {}
    for tid, task in tasks.items():
        deps = [str(x) for x in _l(task.get("depends_on"))]
        graph[tid] = deps
        for dep in deps:
            if dep == tid:
                errors.append(f"task {tid} depends on itself")
            elif dep not in tasks:
                errors.append(f"task {tid} depends on unknown task {dep}")

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str) -> None:
        if node in visited:
            return
        if node in visiting:
            errors.append(f"task dependency cycle detected at {node}")
            return
        visiting.add(node)
        for dep in graph.get(node, []):
            if dep in graph:
                visit(dep)
        visiting.remove(node)
        visited.add(node)

    for node in graph:
        visit(node)


def _g2(plan: dict[str, Any], root: Path, errors: list[str]) -> None:
    _g1(plan, root, errors)

    acceptance = _l(plan.get("acceptance"))
    if not acceptance:
        errors.append("acceptance must contain at least one acceptance criterion")

    ids: set[str] = set()
    for item in acceptance:
        ac = _d(item)
        aid = str(ac.get("id", ""))
        if not aid or aid in ids:
            errors.append(f"acceptance id missing or duplicate: {aid or '<missing>'}")
        ids.add(aid)

        if not str(ac.get("need_id", "")).startswith("N-"):
            errors.append(f"acceptance {aid or '<missing>'} must map to a Need via need_id")
        if not str(ac.get("verification", "")).strip():
            errors.append(f"acceptance {aid or '<missing>'} needs an observable verification")
        if ac.get("status") not in {"PENDING", "PASS", "BLOCKED"}:
            errors.append(f"acceptance {aid or '<missing>'} has invalid status {ac.get('status')!r}")

    tasks, refs = _collect_tasks(plan, errors)
    unknown = refs - ids
    missing = ids - refs
    if unknown:
        errors.append("stories/tasks reference unknown acceptance IDs: " + ", ".join(sorted(unknown)))
    if missing:
        errors.append("acceptance IDs not mapped into any story/task: " + ", ".join(sorted(missing)))

    _validate_dependencies(tasks, errors)

    if plan.get("plan_scope_sha256") != _d(plan.get("scope")).get("sha256"):
        errors.append("plan_scope_sha256 must match the frozen scope.sha256")


def _g4(plan: dict[str, Any], root: Path, errors: list[str]) -> None:
    _g2(plan, root, errors)
    tasks, _ = _collect_tasks(plan, [])

    for tid, task in tasks.items():
        if task.get("status") != "PASS":
            errors.append(f"task {tid} is not PASS")

    for item in _l(plan.get("acceptance")):
        ac = _d(item)
        if ac.get("status") != "PASS":
            errors.append(f"acceptance {ac.get('id', '<missing>')} is not PASS")

    final_review = _d(plan.get("final_review"))
    for field in ("code_review", "qa"):
        if final_review.get(field) != "PASS":
            errors.append(f"final_review.{field} must be PASS")
    if final_review.get("security") not in {"PASS", "NOT_REQUIRED"}:
        errors.append("final_review.security must be PASS or NOT_REQUIRED")


def _g5(plan: dict[str, Any], root: Path, errors: list[str]) -> None:
    _g4(plan, root, errors)
    handoff = _d(plan.get("handoff"))
    branch = str(handoff.get("branch", ""))

    if not branch or branch in {"main", "master"}:
        errors.append("handoff.branch must name a non-main feature branch")
    if not HEX40.fullmatch(str(handoff.get("head_commit", ""))):
        errors.append("handoff.head_commit must be a full 40-character commit SHA")
    if handoff.get("pushed") is not True:
        errors.append("handoff.pushed must be true")
    if handoff.get("ready_for_human_review") is not True:
        errors.append("handoff.ready_for_human_review must be true")


VALIDATORS = {"G0": _g0, "G1": _g1, "G2": _g2, "G4": _g4, "G5": _g5}


def validate(plan_path: Path, gate: str, repo_root: Path | None = None) -> list[str]:
    root = (repo_root or Path(__file__).resolve().parents[1]).resolve()
    errors: list[str] = []

    try:
        plan = json.loads(plan_path.resolve().read_text(encoding="utf-8"))
    except FileNotFoundError:
        return [f"plan file not found: {plan_path}"]
    except json.JSONDecodeError as exc:
        return [f"invalid JSON plan: {exc}"]

    if not isinstance(plan, dict):
        return ["plan root must be a JSON object"]

    if plan.get("schema_version") != 1:
        errors.append("schema_version must be 1")
    if _d(plan.get("applicability")).get("ai_sdlc_v1") is not True:
        errors.append("applicability.ai_sdlc_v1 must be true")

    VALIDATORS[gate](plan, root, errors)
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan", type=Path)
    parser.add_argument("--gate", choices=tuple(VALIDATORS), default="G2")
    args = parser.parse_args(argv)

    errors = validate(args.plan, args.gate)
    if errors:
        print(f"{args.gate} BLOCKED ({len(errors)} issue(s))")
        for item in errors:
            print(f"- {item}")
        return 1

    print(f"{args.gate} PASS: {args.plan}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
