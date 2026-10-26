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

class TestEntryFlow(unittest.TestCase):
    def setUp(self):
        # Use a fresh test SQLite database
        self.test_db = os.path.join(backend_dir, "db", "test_entry_flow.db")
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        self.repo = PipelineRepository(db_path=self.test_db)
        self.email = "priya.mehta@example.com"
        self.role = "Frontend Developer"
        self.name = "Priya Mehta"

    def tearDown(self):
        if os.path.exists(self.test_db):
            try:
                os.remove(self.test_db)
            except Exception:
                pass

    def test_entry_flow_database_and_api(self):
        print("\n--- TEST: Database Unique Constraint & Single Record Guarantee ---")
        
        # 1. Create initial application
        app1 = self.repo.get_or_create_application(
            candidate_email=self.email,
            candidate_name=self.name,
            job_role=self.role,
            is_simulated=False,
            resume_text="Senior Frontend Developer with React, TypeScript, CSS, Redux, Performance, and Unit Testing expertise."
        )
        app_id_1 = app1["application_id"]
        print(f"1. Initial application created: {app_id_1} for {self.email} ({self.role})")

        # Get pipeline rounds
        pipe = self.repo.get_pipeline_by_role(self.role)
        r1 = pipe["rounds"][0]
        r2 = pipe["rounds"][1]

        # 2. Complete Round 1 (Pass)
        ok_r1, att_r1, _ = self.repo.start_round_attempt(app_id_1, r1["round_id"])
        self.assertTrue(ok_r1)
        ok_s1, res_s1, _ = self.repo.submit_normalized_score(
            attempt_id=att_r1["attempt_id"],
            score=75.0,
            feedback="ATS passed cutoff."
        )
        self.assertTrue(ok_s1)
        self.assertTrue(res_s1["passed"])

        # 3. Start Round 2 and Fail it (score 13.3 against 60.0 cutoff)
        ok_r2, att_r2, _ = self.repo.start_round_attempt(app_id_1, r2["round_id"])
        self.assertTrue(ok_r2)
        ok_s2, res_s2, _ = self.repo.submit_normalized_score(
            attempt_id=att_r2["attempt_id"],
            score=13.3,
            feedback="Cutoff missed. Candidate not selected at Round 2."
        )
        self.assertTrue(ok_s2)
        self.assertFalse(res_s2["passed"])
        
        stepper_after_fail = self.repo.get_candidate_stepper_progress(app_id_1)
        sr2 = next(r for r in stepper_after_fail["rounds"] if r["round_id"] == r2["round_id"])
        self.assertEqual(sr2["status"], RoundStatus.FAILED.value)
        self.assertEqual(sr2["score_data"]["score"], 13.3)
        print(f"2. Round 2 failed: status={sr2['status']}, score={sr2['score_data']['score']}")

        # 4. Returning candidate with same email and role (trimmed, different casing)
        messy_email = "   PRIYA.MEHTA@EXAMPLE.COM   "
        restored = self.repo.get_application_by_email(messy_email, self.role)
        self.assertIsNotNone(restored)
        self.assertEqual(restored["application_id"], app_id_1)
        print(f"3. Restored application by case-insensitive trimmed email: {restored['application_id']}")

        # 5. Verify get_or_create_application returns same application without duplicate
        app2 = self.repo.get_or_create_application(
            candidate_email=messy_email,
            candidate_name=self.name,
            job_role=self.role,
            is_simulated=False
        )
        self.assertEqual(app2["application_id"], app_id_1)
        print("4. get_or_create_application returned existing application ID (no duplicate created).")

        # 6. Verify failed round stayed failed (not reset)
        stepper_recheck = self.repo.get_candidate_stepper_progress(app_id_1)
        sr2_recheck = next(r for r in stepper_recheck["rounds"] if r["round_id"] == r2["round_id"])
        self.assertEqual(sr2_recheck["status"], RoundStatus.FAILED.value)
        self.assertEqual(sr2_recheck["score_data"]["score"], 13.3)
        print("5. Verified: failed round 2 remained failed with score 13.3 (never reset).")

        # 7. Simulate 'Apply as a different candidate' (clearing local browser storage)
        # Server application must NOT be deleted.
        persisted_app = self.repo.get_application(app_id_1)
        self.assertIsNotNone(persisted_app)
        self.assertEqual(persisted_app["candidate_name"], self.name)
        print("6. Verified: application still exists on server after local browser storage cleared.")

        # 8. Check SQLite database row count for this email & role - must be exactly 1
        with sqlite3.connect(self.test_db) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM candidate_applications WHERE LOWER(candidate_email) = ? AND LOWER(job_role) = ?",
                (self.email.lower(), self.role.lower())
            )
            count = cursor.fetchone()[0]
            self.assertEqual(count, 1)
            print(f"7. Verified SQLite unique constraint: count for ({self.email}, {self.role}) is {count} (exactly 1).")

if __name__ == "__main__":
    unittest.main()
