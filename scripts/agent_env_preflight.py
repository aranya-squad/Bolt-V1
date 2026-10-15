#!/usr/bin/env python3
"""Preflight isolated Bolt agent test environment without contacting services.

Default = advisory. --strict-e2e rejects potentially live database/cache/API
targets and missing required local endpoints. Never displays credentials.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlsplit

LOOPBACK = {"localhost", "127.0.0.1", "::1"}
REQUIRED_SCRIPTS = {"lint", "type-check", "test", "build"}
URL_KEYS = ("DATABASE_URL", "REDIS_URL", "REPLICA_DATABASE_URL",
            "VITE_API_BASE_URL", "RECOVERY_API_ORIGIN", "TEACHER_API_ORIGIN")


def unsafe_targets(environ: dict[str, str], strict: bool) -> list[str]:
    issues = []
    for key in URL_KEYS:
        value = environ.get(key, "").strip()
        if not value:
            if strict and key in ("DATABASE_URL", "REDIS_URL"):
                issues.append(f"{key}: isolated loopback connection must be explicitly configured")
            continue
        try:
            uri = urlsplit(value)
            host = uri.hostname
        except ValueError:
            host = None
        # Do not allow socket, implicit host, or a remote IP in strict E2E.
        if not host or host.lower() not in LOOPBACK:
            issues.append(f"{key}: non-loopback or unparsable test target")
    return issues


def available_scripts(root: Path) -> list[str]:
    try:
        doc = json.loads((root / "frontend/package.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ["frontend/package.json: missing or invalid"]
    names = set(doc.get("scripts", {}))
    return [f"npm script absent: {s}" for s in sorted(REQUIRED_SCRIPTS - names)]


def node_version() -> str | None:
    try:
        proc = subprocess.run(["node", "--version"], text=True, capture_output=True,
                              timeout=5, check=False)
        if proc.returncode == 0:
            return proc.stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        pass
    return None


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--strict-e2e", action="store_true")
    args = parser.parse_args(argv)
    errors = unsafe_targets(dict(os.environ), args.strict_e2e)
    warnings = available_scripts(args.root)
    node = node_version()
    if not node:
        warnings.append("Node executable unavailable")
    elif not node.startswith("v20."):
        warnings.append(f"Node {node}: standard CI uses Node 20; record deviation")
    if sys.version_info[:2] != (3, 12):
        warnings.append(f"Python {sys.version_info.major}.{sys.version_info.minor}: CI uses 3.12")
    for message in warnings:
        print(f"WARNING: {message}")
    for message in errors:
        print(f"BLOCKED: {message}")
    print("No network requests, migrations, builds or tests were executed by preflight.")
    return 2 if args.strict_e2e and errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
