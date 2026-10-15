#!/usr/bin/env python3
"""Read-only GitHub Actions evidence check at one *exact* commit.

An offline artifact gate cannot prove that tests actually ran. This tool checks
hosted workflow conclusions directly via GitHub, with no writes or deployment.
It is a human pre-integration aid, not a replacement for G1-G5 signoffs.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
SHA_RE = re.compile(r"^[a-fA-F0-9]{40}$")


def validate_inputs(repository: str, commit: str, workflows: list[str]) -> list[str]:
    errors = []
    if not REPO_RE.fullmatch(repository):
        errors.append("repository must be owner/name")
    if not SHA_RE.fullmatch(commit):
        errors.append("commit must be an exact 40-hex Git SHA")
    if not workflows or any(not w.strip() for w in workflows):
        errors.append("at least one named workflow is required")
    return errors


def check_runs(runs: list[dict], commit: str, workflows: list[str]) -> list[str]:
    """A successful run for some other SHA, or a skipped job, is not evidence."""
    errors = []
    for name in dict.fromkeys(workflows):
        matches = [run for run in runs
                   if run.get("name") == name and run.get("head_sha") == commit]
        if not matches:
            errors.append(f"{name}: no run for exact commit {commit}")
            continue
        # The newest run is decisive. An earlier green attempt cannot mask a
        # more recent failure/pending rerun at the same commit.
        latest = max(matches, key=lambda r: (r.get("created_at") or "", r.get("run_attempt") or 0, r.get("id") or 0))
        if latest.get("status") != "completed" or latest.get("conclusion") != "success":
            errors.append(f"{name}: latest exact-commit run is {latest.get('status')}/{latest.get('conclusion')}")
    return errors


def fetch_runs(repository: str, commit: str, token: str | None = None) -> list[dict]:
    # Strictly fixed GitHub read-only endpoint; never follow a user-supplied URL.
    url = (f"https://api.github.com/repos/{repository}/actions/runs?"
           + urlencode({"head_sha": commit, "per_page": 100}))
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "bolt-ci-evidence/1"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = Request(url, headers=headers, method="GET")
    with urlopen(req, timeout=12) as response:
        document = json.load(response)
    if not isinstance(document, dict) or not isinstance(document.get("workflow_runs"), list):
        raise ValueError("GitHub response is missing workflow_runs")
    total = document.get("total_count", 0)
    if not isinstance(total, int) or total > len(document["workflow_runs"]):
        raise ValueError("GitHub response is paginated; cannot claim complete evidence")
    return document["workflow_runs"]


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", default="aranya-squad/Bolt-V1")
    parser.add_argument("--commit", required=True, help="exact SHA being considered for integration")
    parser.add_argument("--workflow", action="append", required=True, help="exact GitHub Actions workflow name; repeat for each required workflow")
    args = parser.parse_args(argv)
    issues = validate_inputs(args.repository, args.commit, args.workflow)
    if issues:
        for issue in issues:
            print(f"BLOCKED: {issue}", file=sys.stderr)
        return 2
    try:
        runs = fetch_runs(args.repository, args.commit, os.environ.get("GITHUB_TOKEN"))
        issues = check_runs(runs, args.commit, args.workflow)
    except (HTTPError, URLError, TimeoutError, ValueError, OSError) as exc:
        # Never print the secret/header/URL; hosted evidence is simply unknown.
        print(f"UNKNOWN: GitHub verification unavailable ({type(exc).__name__})", file=sys.stderr)
        return 2
    if issues:
        for issue in issues:
            print(f"UNVERIFIED: {issue}", file=sys.stderr)
        return 1
    print(f"CI VERIFIED: {args.commit}; workflows: {', '.join(dict.fromkeys(args.workflow))}")
    print("Scope, reviewer independence, merge state and live deployment are NOT attested.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
