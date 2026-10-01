from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "check_feature_gate.py"
SPEC = importlib.util.spec_from_file_location("check_feature_gate", SCRIPT)
module = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(module)


class FeatureGateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "docs/features").mkdir(parents=True)
        self.scope = self.root / "docs/features/demo.scope.md"
        self.scope.write_text("# Demo scope\n\nN-01: Do the thing.\n", encoding="utf-8")
        digest = hashlib.sha256(self.scope.read_bytes()).hexdigest()

        self.plan = {
            "schema_version": 1,
            "feature_id": "demo",
            "applicability": {"ai_sdlc_v1": True, "prospective": True},
            "context": {
                "remote_refs_checked": True,
                "existing_behavior_inspected": True,
                "dependencies_recorded": True,
            },
            "scope": {
                "path": "docs/features/demo.scope.md",
                "version": "1.0",
                "sha256": digest,
                "base_commit": "a" * 40,
            },
            "plan_scope_sha256": digest,
            "review_route": {
                "mandatory": [
                    {"role": "product_manager", "reviewer": "pm-1", "decision": "APPROVED", "scope_sha256": digest},
                    {"role": "senior_tech_manager_cto", "reviewer": "cto-1", "decision": "APPROVED", "scope_sha256": digest},
                    {"role": "head_qa", "reviewer": "qa-1", "decision": "APPROVED", "scope_sha256": digest},
                ],
                "specialists": [
                    {"role": "security", "required": False, "decision": "NOT_REQUIRED", "reason": "No sensitive boundary"}
                ],
            },
            "acceptance": [
                {"id": "AC-01", "need_id": "N-01", "verification": "Observed result", "status": "PENDING"}
            ],
            "waves": [
                {
                    "id": "W1",
                    "categories": [
                        {
                            "id": "backend",
                            "stories": [
                                {
                                    "id": "US-01",
                                    "acceptance": ["AC-01"],
                                    "tasks": [
                                        {
                                            "id": "T-01",
                                            "title": "Implement",
                                            "acceptance": ["AC-01"],
                                            "model_class": "worker",
                                            "writable_paths": ["backend/apps/demo/"],
                                            "depends_on": [],
                                            "status": "PENDING",
                                        }
                                    ],
                                }
                            ],
                        }
                    ],
                }
            ],
            "blocking_findings": [],
            "final_review": {"code_review": "PENDING", "qa": "PENDING", "security": "NOT_REQUIRED"},
            "handoff": {
                "branch": "feat/demo",
                "head_commit": "",
                "pushed": False,
                "ready_for_human_review": False,
            },
        }
        self.plan_path = self.root / "docs/features/demo.plan.json"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def validate(self, gate: str) -> list[str]:
        self.plan_path.write_text(json.dumps(self.plan), encoding="utf-8")
        return module.validate(self.plan_path, gate, self.root)

    def test_valid_plan_passes_g2(self) -> None:
        self.assertEqual([], self.validate("G2"))

    def test_scope_digest_change_blocks_g1(self) -> None:
        self.scope.write_text("changed", encoding="utf-8")
        self.assertTrue(any("mismatch" in e for e in self.validate("G1")))

    def test_missing_mandatory_reviewer_blocks_g1(self) -> None:
        self.plan["review_route"]["mandatory"] = self.plan["review_route"]["mandatory"][:-1]
        self.assertTrue(any("head_qa" in e for e in self.validate("G1")))

    def test_unmapped_acceptance_blocks_g2(self) -> None:
        self.plan["acceptance"].append(
            {"id": "AC-02", "need_id": "N-02", "verification": "Another result", "status": "PENDING"}
        )
        self.assertTrue(any("AC-02" in e and "not mapped" in e for e in self.validate("G2")))

    def test_required_specialist_blocks_without_approval(self) -> None:
        digest = self.plan["scope"]["sha256"]
        self.plan["review_route"]["specialists"] = [
            {
                "role": "security",
                "required": True,
                "decision": "BLOCKED",
                "scope_sha256": digest,
                "reason": "Auth boundary",
            }
        ]
        self.assertTrue(any("required specialist security" in e for e in self.validate("G1")))

    def test_valid_completed_plan_passes_g5(self) -> None:
        self.plan["acceptance"][0]["status"] = "PASS"
        self.plan["waves"][0]["categories"][0]["stories"][0]["tasks"][0]["status"] = "PASS"
        self.plan["final_review"] = {"code_review": "PASS", "qa": "PASS", "security": "NOT_REQUIRED"}
        self.plan["handoff"] = {
            "branch": "feat/demo",
            "head_commit": "b" * 40,
            "pushed": True,
            "ready_for_human_review": True,
        }
        self.assertEqual([], self.validate("G5"))

    def test_unpushed_handoff_blocks_g5(self) -> None:
        self.plan["acceptance"][0]["status"] = "PASS"
        self.plan["waves"][0]["categories"][0]["stories"][0]["tasks"][0]["status"] = "PASS"
        self.plan["final_review"] = {"code_review": "PASS", "qa": "PASS", "security": "NOT_REQUIRED"}
        self.plan["handoff"]["head_commit"] = "b" * 40
        self.assertTrue(any("handoff.pushed" in e for e in self.validate("G5")))


if __name__ == "__main__":
    unittest.main()
