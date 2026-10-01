"""Offline regression cases for failure signals, shallow history and advisory CI."""
from contextlib import redirect_stdout
from datetime import date
from io import StringIO
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import check_context_freshness as checker

TODAY = date(2026, 10, 1)
SHA = "a" * 40


class ContextChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for path in (*checker.CANONICAL, "docs/CURRENT_STATE.md"):
            self.write(path, "\n".join(checker.STARTUP) + "\ndocs/DECISIONS.md\n")
        self.write("docs/PROJECT_BRIEF.md", f"""---
last_updated: 2026-10-01
verified_application_commit: {SHA}
verified_context_commit: {SHA}
verified_context_branch: chore/context
live_environment_verified: never
status: current-with-live-unknowns
---
# Brief
""")
        self.feature = "docs/features/example.md"
        self.write(self.feature, f"""---
status: IN PROGRESS
branch: feat/example
base_commit: {SHA}
current_commit: {SHA}
owner: ai
last_checkpoint: 2026-10-01
---
# Feature
## Next Exact Action
Run the focused persistence regression suite and checkpoint verified work.
""")
        self.write("docs/CONTEXT_INDEX.yaml", """version: 1
last_updated: 2026-10-01
startup:
  mandatory:
    - BOLT_BOOTSTRAP.md
    - docs/PROJECT_BRIEF.md
    - docs/CONTEXT_INDEX.yaml
task_routes:
  api:
    read:
      - docs/SYSTEM_MAP.md#api-boundary
    inspect:
      - backend/apps/*/views.py
      - docs/features/<feature>.md
""")
        self.write("docs/SYSTEM_MAP.md", "---\nlast_updated: 2026-10-01\n---\n# System\n## API boundary\n")
        self.write("docs/RUNBOOK.md", "---\nlast_updated: 2026-10-01\n---\n# Runbook\n")
        self.write("backend/apps/example/views.py", "# synthetic fixture\n")

    def write(self, path, text):
        dest = self.root / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text)

    def replace(self, path, old, new):
        target = self.root / path
        target.write_text(target.read_text().replace(old, new))

    def issues(self):
        return checker.check(self.root, TODAY)

    def assertSignal(self, severity, phrase):
        self.assertTrue(any(i.severity == severity and phrase in i.message for i in self.issues()), phrase)

    def test_valid_export_checks_structure_without_inventing_git_evidence(self):
        issues = self.issues()
        self.assertFalse([i for i in issues if i.severity == "ERROR"])
        self.assertEqual(len(issues), 1)
        self.assertIn("Git unavailable", issues[0].message)

    def test_missing_canonical_file(self):
        (self.root / "docs/RUNBOOK.md").unlink()
        self.assertSignal("ERROR", "cannot read required file")

    def test_malformed_duplicate_and_unclosed_front_matter(self):
        for text in ("# No metadata", "---\nstatus: x\nstatus: y\n---", "---\nstatus: x", "---\nstatus: [x]\n---"):
            with self.subTest(text=text), self.assertRaises(ValueError):
                checker.front_matter(text)

    def test_quoted_scalars(self):
        self.replace(self.feature, "status: IN PROGRESS", "status: 'IN PROGRESS'")
        self.assertFalse([i for i in self.issues() if i.severity == "ERROR"])

    def test_brief_requires_freshness_fields(self):
        self.replace("docs/PROJECT_BRIEF.md", "verified_context_commit: " + SHA, "verified_context_commit: pending-finalization")
        self.assertSignal("ERROR", "placeholder metadata: verified_context_commit")

    def test_bad_sha_never_becomes_verified(self):
        self.replace(self.feature, "current_commit: " + SHA, "current_commit: 123abc")
        self.assertSignal("ERROR", "40-character commit SHA")

    def test_stale_checkpoint_warns_future_and_invalid_dates_error(self):
        for value, level, phrase in (("2026-08-01", "WARNING", "days old"),
                                     ("2026-10-02", "ERROR", "future"),
                                     ("2026-02-30", "ERROR", "ISO date")):
            with self.subTest(value=value):
                self.replace(self.feature, self._date_value(), value)
                self.assertSignal(level, phrase)

    def _date_value(self):
        for line in (self.root / self.feature).read_text().splitlines():
            if line.startswith("last_checkpoint:"):
                return line.split(": ")[1]
        self.fail("no checkpoint")

    def test_active_features_require_status_branch_owner_and_commit(self):
        self.replace(self.feature, "status: IN PROGRESS", "status: DONE")
        self.replace(self.feature, "branch: feat/example", "branch:")
        self.replace(self.feature, "owner: ai", "owner: TODO")
        self.replace(self.feature, "base_commit: " + SHA, "")
        self.replace(self.feature, "current_commit: " + SHA, "")
        self.assertSignal("ERROR", "status semantics")
        self.assertSignal("ERROR", "metadata: branch")
        self.assertSignal("ERROR", "metadata: owner")
        self.assertSignal("ERROR", "commit checkpoint")

    def test_empty_or_placeholder_next_action(self):
        text = (self.root / self.feature).read_text()
        action = text.split("## Next Exact Action\n")[1]
        for replacement in ("", "TODO\n", "...\n"):
            with self.subTest(replacement=replacement):
                self.write(self.feature, text.replace(action, replacement))
                self.assertSignal("ERROR", "Next Exact Action")

    def test_compatibility_and_bootstrap_pointers(self):
        self.write("docs/CURRENT_STATE.md", "Legacy state only")
        self.write("BOLT_BOOTSTRAP.md", "Legacy startup")
        self.assertSignal("ERROR", "startup pointer missing")
        self.assertSignal("ERROR", "canonical reference missing")

    def test_router_validates_globs_headings_and_not_feature_template(self):
        (self.root / "backend/apps/example/views.py").unlink()
        self.replace("docs/CONTEXT_INDEX.yaml", "#api-boundary", "#missing")
        self.assertSignal("ERROR", "routed path missing")
        self.assertSignal("ERROR", "routed heading missing")
        self.assertFalse(any("<feature>" in i.message for i in self.issues()))

    def test_bootstrap_broken_deep_reference(self):
        self.write("BOLT_BOOTSTRAP.md", "\n".join(checker.STARTUP) + "\ndocs/DECISIONS.md\n`docs/missing.md`\n")
        self.assertSignal("ERROR", "referenced document missing")

    def test_operational_map_commit_metadata_is_checked(self):
        self.replace("docs/SYSTEM_MAP.md", "last_updated: 2026-10-01", "last_updated: 2026-10-01\nverified_application_commit: not-a-sha")
        self.assertSignal("ERROR", "40-character commit SHA")

    def test_router_version_and_date(self):
        self.replace("docs/CONTEXT_INDEX.yaml", "version: 1", "version: nope")
        self.replace("docs/CONTEXT_INDEX.yaml", "last_updated: 2026-10-01", "last_updated: 2026-02-30")
        self.assertSignal("ERROR", "router version")
        self.assertSignal("ERROR", "router last_updated")

    def test_cli_errors_are_strict_locally_but_advisory_in_ci(self):
        (self.root / "docs/RUNBOOK.md").unlink()
        output = StringIO()
        with redirect_stdout(output):
            self.assertEqual(checker.main(["--root", str(self.root)]), 1)
            self.assertEqual(checker.main(["--root", str(self.root), "--warning-only", "--github-actions"]), 0)
        self.assertIn("::warning file=docs/RUNBOOK.md::ERROR", output.getvalue())
        self.assertNotIn("::error", output.getvalue())

    def test_annotation_escapes_control_sequences(self):
        line = checker.annotation(checker.Issue("ERROR", "a,b:c", "first%\n::error::second"))
        self.assertIn("file=a%2Cb%3Ac", line)
        self.assertIn("first%25%0A::error::second", line)
        self.assertNotIn("\n", line)

    @unittest.skipUnless(shutil.which("git"), "Git not installed")
    def test_full_git_commit_existence_and_source_drift(self):
        self.git("init", "-q")
        self.git("add", ".")
        self.git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture baseline")
        commit = self.git("rev-parse", "HEAD").strip()
        for path in ("docs/PROJECT_BRIEF.md", self.feature):
            self.replace(path, SHA, commit)
        self.assertEqual(self.issues(), [])  # metadata-only edits do not stale app evidence
        self.write("backend/apps/example/views.py", "# changed synthetic behavior\n")
        self.assertSignal("WARNING", "application source changed")
        self.replace(self.feature, "current_commit: " + commit, "current_commit: " + SHA)
        self.assertSignal("ERROR", "not available locally")

    @unittest.skipUnless(shutil.which("git"), "Git not installed")
    def test_shallow_git_missing_history_is_warning(self):
        self.git("init", "-q")
        self.git("add", ".")
        self.git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "shallow fixture")
        commit = self.git("rev-parse", "HEAD").strip()
        (self.root / ".git/shallow").write_text(commit + "\n")
        self.assertSignal("WARNING", "shallow history")
        self.assertFalse([i for i in self.issues() if i.severity == "ERROR"])

    def git(self, *args):
        result = subprocess.run(["git", "-C", str(self.root), *args], capture_output=True, text=True, check=True)
        return result.stdout


if __name__ == "__main__":
    unittest.main()
