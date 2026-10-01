#!/usr/bin/env python3
"""Offline structural/freshness checks; no dependencies, fetches or live requests.

Metadata uses a deliberately small YAML subset: flat key: scalar front matter.
The context router's read/inspect/mandatory lists accept plain path scalars.
This is not a general YAML parser or proof of semantic/live correctness.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date
from pathlib import Path
import re
import shutil
import subprocess

CANONICAL = (
    "BOLT_BOOTSTRAP.md", "docs/PROJECT_BRIEF.md", "docs/CONTEXT_INDEX.yaml",
    "docs/SYSTEM_MAP.md", "docs/RUNBOOK.md", "docs/DECISIONS.md",
    "docs/adr/README.md", "docs/AI_DEV_LOG.md", "docs/CLOUD_DEV_HANDOFF.md",
    "AGENTS.md",
)
STARTUP = ("BOLT_BOOTSTRAP.md", "docs/PROJECT_BRIEF.md", "docs/CONTEXT_INDEX.yaml")
STATUSES = {"IN PROGRESS", "BLOCKED", "READY FOR HUMAN REVIEW", "MERGED", "RELEASED"}
COMMIT_KEYS = {"base_commit", "current_commit", "reviewed_code_commit",
               "verified_application_commit", "verified_context_commit"}
PLACEHOLDERS = {"", "pending", "pending-finalization", "tbd", "todo", "unknown", "<current>", "..."}
SHA = re.compile(r"[0-9a-fA-F]{40}\Z")


@dataclass(frozen=True)
class Issue:
    severity: str
    path: str
    message: str


def scalar(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def front_matter(text: str) -> dict[str, str]:
    """Reject malformed/duplicate flat fields rather than silently guessing YAML."""
    lines = text.splitlines()
    if not lines or lines[0] != "---":
        raise ValueError("missing opening front matter")
    result: dict[str, str] = {}
    for line in lines[1:]:
        if line == "---":
            return result
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        match = re.fullmatch(r"([a-z][a-z0-9_]*):\s*(.*?)\s*", line)
        if not match:
            raise ValueError("metadata must use flat key: scalar fields")
        key, value = match.groups()
        if key in result:
            raise ValueError(f"duplicate metadata field: {key}")
        if value.startswith(("[", "{", "|", ">")):
            raise ValueError(f"unsupported non-scalar field: {key}")
        result[key] = scalar(value)
    raise ValueError("unclosed front matter")


def git(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True,
                          text=True, timeout=10, check=False)


def route_paths(text: str):
    """Yield path entries only inside the known path-list fields, ignoring prose."""
    field_indent = None
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        if field_indent is not None and indent <= field_indent:
            field_indent = None
        if re.fullmatch(r"(?:mandatory|read|inspect):", stripped):
            field_indent = indent
        elif field_indent is not None and stripped.startswith("- "):
            value = scalar(stripped[2:])
            if value.startswith("relevant "):
                value = value[len("relevant "):]
            if value.startswith(("docs/", "frontend/", "backend/", "scripts/", ".github/")) or value in {
                "BOLT_BOOTSTRAP.md", "Caddyfile", "docker-compose.prod.yml", "vercel.json",
                "aws-deploy.sh", "aws-resume-deploy.sh", "aws-teardown.sh", ".env.production.example",
            }:
                yield value


def headings(text: str) -> set[str]:
    result = set()
    for title in re.findall(r"^#{1,6}\s+(.+?)\s*#*\s*$", text, re.MULTILINE):
        result.add(re.sub(r"[^\w\- ]", "", title.lower()).replace(" ", "-"))
    return result


def check(root: Path, today: date | None = None, max_age_days: int = 30) -> list[Issue]:
    root = root.resolve()
    today = today or date.today()
    issues: list[Issue] = []
    texts: dict[str, str] = {}

    def add(severity, path, message):
        issues.append(Issue(severity, path, message))

    def read(path):
        if path in texts:
            return texts[path]
        try:
            texts[path] = (root / path).read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            add("ERROR", path, f"cannot read required file ({type(exc).__name__})")
            return None
        return texts[path]

    for path in (*CANONICAL, "docs/CURRENT_STATE.md"):
        read(path)
    local_git = bool(shutil.which("git")) and git(root, "rev-parse", "--is-inside-work-tree").returncode == 0
    shallow = local_git and git(root, "rev-parse", "--is-shallow-repository").stdout.strip() == "true"
    if not local_git:
        add("WARNING", ".", "local Git unavailable: commit existence/source-drift checks skipped")
    checked_shas = set()

    def metadata(path, required, date_key):
        text = read(path)
        if text is None:
            return {}
        try:
            data = front_matter(text)
        except ValueError as exc:
            add("ERROR", path, str(exc))
            return {}
        for key in required:
            if data.get(key, "").lower() in PLACEHOLDERS:
                add("ERROR", path, f"missing or placeholder metadata: {key}")
        if date_key in data:
            try:
                stamp = date.fromisoformat(data[date_key])
                age = (today - stamp).days
                if age < 0:
                    add("ERROR", path, f"{date_key} is in the future")
                elif age > max_age_days:
                    add("WARNING", path, f"{date_key} is {age} days old; verify relevant source/refs")
            except ValueError:
                add("ERROR", path, f"{date_key} must be an ISO date")
        for key in COMMIT_KEYS & data.keys():
            commit = data[key]
            if not SHA.fullmatch(commit):
                add("ERROR", path, f"{key} must name a full 40-character commit SHA")
            elif local_git and commit not in checked_shas:
                checked_shas.add(commit)
                if git(root, "cat-file", "-e", commit + "^{commit}").returncode:
                    level = "WARNING" if shallow else "ERROR"
                    add(level, path, f"{key} not available locally" + (" (shallow history; inspect refs)" if shallow else ""))
        return data

    brief = metadata("docs/PROJECT_BRIEF.md", (
        "last_updated", "verified_application_commit", "verified_context_commit",
        "verified_context_branch", "live_environment_verified", "status"), "last_updated")
    commit = brief.get("verified_application_commit", "")
    if local_git and SHA.fullmatch(commit) and not git(root, "cat-file", "-e", commit + "^{commit}").returncode:
        changes = git(root, "diff", "--name-only", commit, "--", "backend", "frontend")
        if changes.returncode:
            add("WARNING", "docs/PROJECT_BRIEF.md", "unable to compare application verification checkpoint")
        elif changes.stdout.strip():
            add("WARNING", "docs/PROJECT_BRIEF.md", "application source changed since verified_application_commit; reverify affected context")

    for path in ("docs/SYSTEM_MAP.md", "docs/RUNBOOK.md"):
        metadata(path, ("last_updated",), "last_updated")

    feature_paths = sorted((root / "docs/features").glob("*.md"))
    if not feature_paths:
        add("ERROR", "docs/features", "no feature handoff documents found")
    for feature in feature_paths:
        path = feature.relative_to(root).as_posix()
        data = metadata(path, ("status", "branch", "owner", "last_checkpoint"), "last_checkpoint")
        if data.get("status") not in STATUSES:
            add("ERROR", path, "status must use documented feature status semantics")
        if not any(data.get(key) for key in ("current_commit", "base_commit", "reviewed_code_commit")):
            add("ERROR", path, "missing current/base/reviewed commit checkpoint")
        branch = data.get("branch", "")
        if branch and (any(c.isspace() for c in branch) or branch.startswith("-") or ".." in branch):
            add("ERROR", path, "invalid branch metadata")
        text = texts.get(path, "")
        match = re.search(r"^## Next Exact Action\s*\n(.*?)(?=^## |\Z)", text, re.MULTILINE | re.DOTALL)
        if not match or match.group(1).strip().lower() in PLACEHOLDERS:
            add("ERROR", path, "missing/non-actionable Next Exact Action section")

    for path in ("AGENTS.md", "docs/CLOUD_DEV_HANDOFF.md", "docs/CURRENT_STATE.md"):
        for target in STARTUP:
            if target not in texts.get(path, ""):
                add("ERROR", path, f"compatibility/startup pointer missing: {target}")
    for target in ("docs/PROJECT_BRIEF.md", "docs/CONTEXT_INDEX.yaml", "docs/DECISIONS.md"):
        if target not in texts.get("BOLT_BOOTSTRAP.md", ""):
            add("ERROR", "BOLT_BOOTSTRAP.md", f"canonical reference missing: {target}")

    for target in re.findall(r"`(docs/[A-Za-z0-9_./-]+\.md)`", texts.get("BOLT_BOOTSTRAP.md", "")):
        if not (root / target).is_file():
            add("ERROR", "BOLT_BOOTSTRAP.md", f"referenced document missing: {target}")

    router = texts.get("docs/CONTEXT_INDEX.yaml", "")
    if not re.search(r"^version: [1-9][0-9]*$", router, re.MULTILINE):
        add("ERROR", "docs/CONTEXT_INDEX.yaml", "missing/invalid router version")
    stamp = re.search(r"^last_updated: (\d{4}-\d{2}-\d{2})$", router, re.MULTILINE)
    try:
        if stamp is None:
            raise ValueError
        router_date = date.fromisoformat(stamp.group(1))
        age = (today - router_date).days
        if age < 0:
            add("ERROR", "docs/CONTEXT_INDEX.yaml", "router last_updated is in the future")
        elif age > max_age_days:
            add("WARNING", "docs/CONTEXT_INDEX.yaml", f"router last_updated is {age} days old; verify routes")
    except ValueError:
        add("ERROR", "docs/CONTEXT_INDEX.yaml", "missing/invalid router last_updated")
    for target in STARTUP:
        if not re.search(r"^\s+- " + re.escape(target) + r"\s*$", router, re.MULTILINE):
            add("ERROR", "docs/CONTEXT_INDEX.yaml", f"startup path missing: {target}")
    for reference in route_paths(router):
        path, _, anchor = reference.partition("#")
        if "<" in path:  # documented feature template, not a literal filename
            continue
        if Path(path).is_absolute() or ".." in Path(path).parts:
            add("ERROR", "docs/CONTEXT_INDEX.yaml", f"unsafe routed path: {path}")
            continue
        matches = list(root.glob(path))
        if not matches:
            add("ERROR", "docs/CONTEXT_INDEX.yaml", f"routed path missing: {path}")
        elif anchor and anchor not in headings(matches[0].read_text(encoding="utf-8")):
            add("ERROR", "docs/CONTEXT_INDEX.yaml", f"routed heading missing: {reference}")
    return issues


def annotation(issue: Issue) -> str:
    def escape(value):
        return value.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    path = escape(issue.path).replace(",", "%2C").replace(":", "%3A")
    # All initial CI findings are warning annotations, including structural errors.
    return f"::warning file={path}::{escape(issue.severity + ': ' + issue.message)}"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--warning-only", action="store_true", help="report errors but return zero")
    parser.add_argument("--github-actions", action="store_true", help="emit warning annotations")
    parser.add_argument("--max-age-days", type=int, default=30)
    args = parser.parse_args(argv)
    if args.max_age_days < 0:
        parser.error("--max-age-days must be non-negative")
    issues = check(args.root, max_age_days=args.max_age_days)
    for issue in issues:
        print(annotation(issue) if args.github_actions else f"{issue.severity} {issue.path}: {issue.message}")
    errors = sum(i.severity == "ERROR" for i in issues)
    warnings = len(issues) - errors
    print(f"Context freshness: {errors} error(s), {warnings} warning(s). Offline structural/source-drift check only.")
    return 0 if args.warning_only or not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
