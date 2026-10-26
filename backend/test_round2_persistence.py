import os
import sys
import unittest
import json
import sqlite3

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from repositories.pipeline_repository import PipelineRepository, RoundStatus, ApplicationStatus


class TestRound2AndPersistence(unittest.TestCase):
    def setUp(self):
        # Use a fresh test SQLite database
        self.test_db = os.path.join(backend_dir, "db", "test_pipeline.db")
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        self.repo = PipelineRepository(db_path=self.test_db)

    def tearDown(self):
        if os.path.exists(self.test_db):
            try:
                os.remove(self.test_db)
            except Exception:
                pass

    def test_full_flow_and_persistence(self):
        # 1. Create application
        app = self.repo.get_or_create_application(
            candidate_email="test.candidate@example.com",
            candidate_name="Test Candidate",
            job_role="Frontend Developer",
            resume_text="Senior React developer with TypeScript, modern CSS, Redux, state management, CWV performance and unit testing."
        )
        app_id = app["application_id"]
        self.assertIsNotNone(app_id)
        self.assertEqual(app["status"], ApplicationStatus.IN_PIPELINE.value)

        # Verify Round 1 can start
        pipe = self.repo.get_pipeline_by_role("Frontend Developer")
        r1 = pipe["rounds"][0]
        r2 = pipe["rounds"][1]
        r3 = pipe["rounds"][2]

        can_start_r1, reason, _ = self.repo.validate_can_start_round(app_id, r1["round_id"])
        self.assertTrue(can_start_r1)

        # Round 2 should be BLOCKED because Round 1 is not passed yet
        can_start_r2, reason_r2, _ = self.repo.validate_can_start_round(app_id, r2["round_id"])
        self.assertFalse(can_start_r2)
        self.assertIn("Sequential Gating Violation", reason_r2)

        # Round 3 should be BLOCKED with 403 / violation
        can_start_r3, reason_r3, _ = self.repo.validate_can_start_round(app_id, r3["round_id"])
        self.assertFalse(can_start_r3)
        self.assertIn("Sequential Gating Violation", reason_r3)

        # 2. Start Round 1 and pass it (score 68% against 60% cutoff)
        ok_start, att1, _ = self.repo.start_round_attempt(app_id, r1["round_id"])
        self.assertTrue(ok_start)
        self.assertIsNotNone(att1)

        ok_score, res_score, _ = self.repo.submit_normalized_score(
            attempt_id=att1["attempt_id"],
            score=68.0,
            feedback="ATS match passed threshold.",
            details={"matched_skills": ["React", "TypeScript", "State Management"]}
        )
        self.assertTrue(ok_score)
        self.assertTrue(res_score["passed"])

        # Stepper should now show Round 1 passed and Round 2 unlocked
        stepper = self.repo.get_candidate_stepper_progress(app_id)
        sr1 = next(r for r in stepper["rounds"] if r["round_id"] == r1["round_id"])
        sr2 = next(r for r in stepper["rounds"] if r["round_id"] == r2["round_id"])
        sr3 = next(r for r in stepper["rounds"] if r["round_id"] == r3["round_id"])

        self.assertEqual(sr1["status"], RoundStatus.PASSED.value)
        self.assertEqual(sr2["status"], RoundStatus.UNLOCKED.value)
        self.assertEqual(sr3["status"], RoundStatus.LOCKED.value)

        # 3. Round 2 can now start
        can_start_r2_now, _, round_doc = self.repo.validate_can_start_round(app_id, r2["round_id"])
        self.assertTrue(can_start_r2_now)
        self.assertEqual(round_doc["round_type"], "aptitude_test")

        # Calling Round 3 directly is STILL blocked because Round 2 is not passed yet
        can_start_r3_now, reason_r3_now, _ = self.repo.validate_can_start_round(app_id, r3["round_id"])
        self.assertFalse(can_start_r3_now)
        self.assertIn("must be PASSED", reason_r3_now)

        # 4. Unknown application ID -> returns False with "Candidate application not found"
        can_start_bad, reason_bad, _ = self.repo.validate_can_start_round("app-nonexistent-12345", r2["round_id"])
        self.assertFalse(can_start_bad)
        self.assertEqual(reason_bad, "Candidate application not found")

        # 5. SIMULATE RESTART:
        # Create a brand new PipelineRepository pointing to the same SQLite database
        # Verify in-memory state is empty before load, and that SQLite reloads it completely!
        repo2 = PipelineRepository(db_path=self.test_db)
        app_reloaded = repo2.get_application(app_id)
        self.assertIsNotNone(app_reloaded)
        self.assertEqual(app_reloaded["candidate_email"], "test.candidate@example.com")
        self.assertEqual(app_reloaded["current_round_order"], 2)

        # Verify attempts reloaded
        atts = repo2.get_attempts_for_application(app_id)
        self.assertEqual(len(atts), 1)
        self.assertEqual(atts[0]["status"], RoundStatus.PASSED.value)
        self.assertEqual(atts[0]["score"], 68.0)

        # Verify candidate stepper progress reloaded and intact
        stepper2 = repo2.get_candidate_stepper_progress(app_id)
        self.assertIsNotNone(stepper2)
        sr1_2 = next(r for r in stepper2["rounds"] if r["round_id"] == r1["round_id"])
        sr2_2 = next(r for r in stepper2["rounds"] if r["round_id"] == r2["round_id"])
        self.assertEqual(sr1_2["status"], RoundStatus.PASSED.value)
        self.assertEqual(sr2_2["status"], RoundStatus.UNLOCKED.value)

        # Verify restoration by email
        restored = repo2.get_application_by_email("test.candidate@example.com", "Frontend Developer")
        self.assertIsNotNone(restored)
        self.assertEqual(restored["application_id"], app_id)

        print("\nALL PERSISTENCE, SEQUENTIAL GATING, AND RESTORATION TESTS PASSED!")


if __name__ == "__main__":
    unittest.main()
