"""Offline contract tests for exact-SHA CI evidence; no GitHub network calls."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "verify_ci_evidence.py"
SPEC = importlib.util.spec_from_file_location("verify_ci_evidence", SCRIPT)
ci = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(ci)

SHA = "a" * 40
OTHER = "b" * 40


def run(name, sha=SHA, status="completed", conclusion="success",
        created_at="2026-10-14T12:00:00Z", attempt=1):
    return {"name": name, "head_sha": sha, "status": status,
            "conclusion": conclusion, "created_at": created_at,
            "run_attempt": attempt, "id": attempt}


class CIEvidenceTests(unittest.TestCase):
    def test_complete_exact_sha_passes(self):
        self.assertEqual([], ci.check_runs([run("CI"), run("Teacher verification")],
                                           SHA, ["CI", "Teacher verification"]))

    def test_other_sha_is_not_evidence(self):
        issues = ci.check_runs([run("CI", sha=OTHER)], SHA, ["CI"])
        self.assertTrue(any("no run for exact commit" in i for i in issues))

    def test_unknown_missing_and_failed_checks(self):
        for status, conclusion in [("queued", None), ("in_progress", None),
                                   ("completed", "failure"), ("completed", "skipped"),
                                   ("completed", "cancelled")]:
            with self.subTest(status=status, conclusion=conclusion):
                issues = ci.check_runs([run("CI", status=status,
                                            conclusion=conclusion)], SHA, ["CI"])
                self.assertTrue(issues)
        self.assertTrue(ci.check_runs([], SHA, ["CI"]))

    def test_latest_run_wins(self):
        earlier = run("CI")
        later = run("CI", status="completed", conclusion="failure",
                    created_at="2026-10-14T13:00:00Z", attempt=2)
        self.assertTrue(ci.check_runs([earlier, later], SHA, ["CI"]))

    def test_invalid_inputs_rejected(self):
        self.assertTrue(ci.validate_inputs("a/b/extra", SHA, ["CI"]))
        self.assertTrue(ci.validate_inputs("a/b", "short", ["CI"]))
        self.assertTrue(ci.validate_inputs("a/b", SHA, []))
        self.assertFalse(ci.validate_inputs("aranya-squad/Bolt-V1", SHA, ["CI"]))


if __name__ == "__main__":
    unittest.main()
