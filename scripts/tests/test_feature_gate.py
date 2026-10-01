from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "check_feature_gate.py"
SPEC = importlib.util.spec_from_file_location("check_feature_gate", MODULE_PATH)
gate = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(gate)


class FeatureGateTests(unittest.TestCase):
    def make_case(self):
        tmp = tempfile.TemporaryDirectory()
        root = Path(tmp.name)
        (root / "docs" / "features").mkdir(parents=True)
        scope = root / "docs" / "features" / "example.scope.md"
        scope.write_text("# Scope\n\nN-01 does the thing.\n", encoding="utf-8")
        tracker = root / "docs" / "features" / "example.md"
        tracker.write_text("# Tracker\n", encoding="utf-8")
        digest = hashlib.sha256(scope.read_bytes()).hexdigest()
        plan = {
            "ai_sdlc_version": 1,
            "prospective_only": True,
            "feature_id": "example",
            "tracker_path": "docs/features/example.md",
            "context": {
                "remote_refs_checked": True,
                "existing_behavior_inspected": True,
                "dependencies_recorded": True
            },
            "scope": {
                "path": "docs/features/example.scope.md",
                "version": "1.0",
                "sha256": digest,
                "base_commit": "a" * 40
            },
            "plan_scope_sha256": digest,
            "risk_route": {
                "frontend_ux": {"required": False, "reason": "No major UX change."},
                "security": {"required": False, "reason": "No auth, PII, ownership or policy change."},
                "data_integrity": {"required": False, "reason": "No scoring, migration or authoritative persistence change."},
                "operations": {"required": False, "reason": "No deployment or runtime contract change."}
            },
            "unresolved_blockers": [],
            "approvals": [
                {"role": "product_manager", "agent_id": "pm-1", "decision": "APPROVED", "scope_sha256": digest},
                {"role": "cto", "agent_id": "cto-1", "decision": "APPROVED", "scope_sha256": digest},
                {"role": "head_qa", "agent_id": "qa-1", "decision": "APPROVED", "scope_sha256": digest}
            ],
            "specialist_reviews": [],
            "implementation_authorized": True,
            "requirements": [
                {"id": "N-01", "kind": "NEED", "summary": "Do the thing", "acceptance_ids": ["AC-01"]}
            ],
            "acceptance": [
                {"id": "AC-01", "description": "Observable outcome", "required": True, "status": "PASS", "evidence": ["test"]}
            ],
            "waves": [{
                "id": "W1",
                "name": "Implementation",
                "categories": [{
                    "id": "backend",
                    "stories": [{
                        "id": "US-01",
                        "title": "Do the thing",
                        "acceptance_ids": ["AC-01"],
                        "tasks": [{
                            "id": "T-01",
                            "title": "Implement",
                            "owner_class": "worker",
                            "model_class": "economical",
                            "depends_on": [],
                            "writable_paths": ["backend/apps/example/"],
                            "checks": ["pytest focused"],
                            "traceability": ["AC-01"],
                            "status": "PASS",
                            "commit": "c" * 40,
                            "evidence": ["pytest focused: pass"]
                        }]
                    }]
                }]
            }],
            "quality_reviews": {
                "integrated_commit": "b" * 40,
                "code_review": "PASS",
                "qa_review": "PASS",
                "security_required": False,
                "security_review": "NOT_REQUIRED",
                "findings": []
            },
            "publication": {
                "feature_branch": "feat/example",
                "feature_branch_pushed": True,
                "final_commit": "b" * 40,
                "merged": False,
                "deployed": False
            },
            "final_status": "READY FOR HUMAN REVIEW"
        }
        plan_path = root / "docs" / "features" / "example.plan.json"
        plan_path.write_text(json.dumps(plan), encoding="utf-8")
        return tmp, scope, plan, plan_path

    @staticmethod
    def write(path, plan):
        path.write_text(json.dumps(plan), encoding="utf-8")

    def test_valid_all_gates(self):
        tmp, _, _, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        for name in ("G1", "G2", "G4", "G5"):
            self.assertEqual([], gate.validate(path, name))

    def test_missing_reviewer(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        plan["approvals"].pop()
        self.write(path, plan)
        self.assertTrue(any("missing mandatory reviewer role head_qa" in e for e in gate.validate(path, "G1")))

    def test_stale_reviewer_sha(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        plan["approvals"][0]["scope_sha256"] = "0" * 64
        self.write(path, plan)
        self.assertTrue(any("approval digest is stale" in e for e in gate.validate(path, "G1")))

    def test_wrong_scope_sha(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        plan["scope"]["sha256"] = "0" * 64
        plan["plan_scope_sha256"] = "0" * 64
        for review in plan["approvals"]:
            review["scope_sha256"] = "0" * 64
        self.write(path, plan)
        self.assertTrue(any("stale/wrong digest" in e for e in gate.validate(path, "G1")))

    def test_required_specialist_missing(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        plan["risk_route"]["security"] = {"required": True, "reason": "Changes authorization policy."}
        self.write(path, plan)
        self.assertTrue(any("required specialist security: review record missing" in e for e in gate.validate(path, "G1")))

    def test_unresolved_blocker(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        plan["unresolved_blockers"] = [{"id": "B-01"}]
        self.write(path, plan)
        self.assertTrue(any("must be empty" in e for e in gate.validate(path, "G1")))

    def test_unmapped_acceptance(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        plan["requirements"].append({"id": "N-02", "kind": "NEED", "summary": "Other", "acceptance_ids": ["AC-02"]})
        plan["acceptance"].append({"id": "AC-02", "description": "Other", "required": True, "status": "PASS", "evidence": []})
        self.write(path, plan)
        self.assertTrue(any("AC-02: required acceptance criterion is not mapped" in e for e in gate.validate(path, "G2")))

    def test_bad_dependency(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        plan["waves"][0]["categories"][0]["stories"][0]["tasks"][0]["depends_on"] = ["T-404"]
        self.write(path, plan)
        self.assertTrue(any("depends on unknown task T-404" in e for e in gate.validate(path, "G2")))

    def test_dependency_cycle(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        tasks = plan["waves"][0]["categories"][0]["stories"][0]["tasks"]
        tasks[0]["depends_on"] = ["T-02"]
        tasks.append({
            "id": "T-02",
            "title": "Second",
            "owner_class": "worker",
            "model_class": "economical",
            "depends_on": ["T-01"],
            "writable_paths": ["frontend/src/example/"],
            "checks": ["npm test focused"],
            "traceability": ["AC-01"],
            "status": "PASS"
        })
        self.write(path, plan)
        self.assertTrue(any("dependency cycle" in e for e in gate.validate(path, "G2")))

    def test_incomplete_task(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        plan["waves"][0]["categories"][0]["stories"][0]["tasks"][0]["checks"] = []
        self.write(path, plan)
        self.assertTrue(any("checks must be a non-empty" in e for e in gate.validate(path, "G2")))

    def test_g4_review_failure(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        plan["quality_reviews"]["code_review"] = "FAIL"
        self.write(path, plan)
        self.assertTrue(any("code_review" in e for e in gate.validate(path, "G4")))

    def test_g4_requires_integrated_sha(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        plan["quality_reviews"]["integrated_commit"] = "short"
        self.write(path, plan)
        self.assertTrue(any("integrated_commit" in e for e in gate.validate(path, "G4")))

    def test_g5_not_pushed(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        plan["publication"]["feature_branch_pushed"] = False
        self.write(path, plan)
        self.assertTrue(any("feature_branch_pushed" in e for e in gate.validate(path, "G5")))

    def test_g5_exact_final_sha_and_match(self):
        tmp, _, plan, path = self.make_case()
        self.addCleanup(tmp.cleanup)
        plan["publication"]["final_commit"] = "d" * 40
        self.write(path, plan)
        self.assertTrue(any("must match quality_reviews.integrated_commit" in e for e in gate.validate(path, "G5")))

    def test_malformed_plan(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        path = Path(tmp.name) / "bad.json"
        path.write_text("{bad", encoding="utf-8")
        with self.assertRaises(gate.GateError):
            gate.validate(path, "G1")


if __name__ == "__main__":
    unittest.main()
