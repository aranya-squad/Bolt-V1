"""Isolated safety tests for agent environment preflight."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "agent_env_preflight.py"
SPEC = importlib.util.spec_from_file_location("agent_env_preflight", SRC)
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)


class EnvironmentTests(unittest.TestCase):
    def test_local_endpoints_allowed(self):
        self.assertEqual([], mod.unsafe_targets({
            "DATABASE_URL": "postgres://user:password@127.0.0.1:5432/test",
            "REDIS_URL": "redis://localhost:6379/15",
            "VITE_API_BASE_URL": "http://[::1]:8011/api/v1"
        }, strict=True))

    def test_external_and_missing_rejected_without_secret_echo(self):
        env = {"DATABASE_URL": "postgres://private:SECRET@prod.example:5432/bolt",
               "REDIS_URL": "redis://localhost:6379/3",
               "TEACHER_API_ORIGIN": "https://api.boltabacus.com"}
        issues = mod.unsafe_targets(env, strict=True)
        self.assertEqual(2, len(issues))
        self.assertNotIn("SECRET", str(issues))
        self.assertTrue(mod.unsafe_targets({}, strict=True))

    def test_script_contract(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "frontend").mkdir()
            (root / "frontend" / "package.json").write_text(
                '{"scripts":{"lint":"x","test":"x","build":"x","type-check":"x"}}')
            self.assertEqual([], mod.available_scripts(root))
            (root / "frontend" / "package.json").write_text(
                '{"scripts":{"lint":"x"}}')
            self.assertIn("npm script absent: type-check",
                          mod.available_scripts(root))


if __name__ == "__main__":
    unittest.main()
