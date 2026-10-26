import os
import sys
import unittest
import json
import sqlite3
from datetime import datetime, timezone, timedelta

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from repositories.pipeline_repository import PipelineRepository, RoundStatus
from services.aptitude_service import AptitudeService

class TestNoAutoStartAndRefresh(unittest.TestCase):
    def setUp(self):
        self.test_db = os.path.join(backend_dir, "db", "test_autostart.db")
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        self.repo = PipelineRepository(db_path=self.test_db)
        self.service = AptitudeService(db_path=self.test_db)
        self.service.pipeline_repo = self.repo

        # Create application and pass Round 1
        self.app = self.repo.get_or_create_application(
            candidate_email="test.user@example.com",
            candidate_name="Test User",
            job_role="Frontend Developer"
        )
        self.app_id = self.app["application_id"]
        pipe = self.repo.get_pipeline_by_role("Frontend Developer")
        self.r1 = pipe["rounds"][0]
        self.r2 = pipe["rounds"][1]

        # Pass Round 1
        ok_start, att1, _ = self.repo.start_round_attempt(self.app_id, self.r1["round_id"])
        self.assertTrue(ok_start)
        self.repo.submit_normalized_score(att1["attempt_id"], score=80.0, feedback="Passed R1")

    def tearDown(self):
        if os.path.exists(self.test_db):
            try:
                os.remove(self.test_db)
            except Exception:
                pass

    def test_get_session_never_starts_timer(self):
        print("\n--- TEST: GET session never creates attempt or starts timer ---")
        # 1. Round 1 is passed. Call get_test_session
        ok, session, err = self.service.get_test_session(self.app_id, self.r2["round_id"])
        self.assertTrue(ok)
        self.assertIsNone(session, "GET session must return None when test has not been started!")

        # 2. Verify no session in database
        with sqlite3.connect(self.test_db) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM aptitude_test_sessions WHERE application_id = ?", (self.app_id,))
            cnt = cursor.fetchone()[0]
            self.assertEqual(cnt, 0, "No aptitude_test_sessions row should exist!")

            cursor.execute("SELECT COUNT(*) FROM candidate_round_attempts WHERE application_id = ? AND round_id = ?", (self.app_id, self.r2["round_id"]))
            att_cnt = cursor.fetchone()[0]
            self.assertEqual(att_cnt, 0, "No Round 2 attempt should exist before Start Test!")
        print("[OK] Verified: GET request returned session=None without creating attempt or timer.")

        # 3. Candidate clicks Start Test (POST /start)
        print("\n--- TEST: POST /start requires confirmed_instructions ---")
        ok_unconfirmed, sess_unconfirmed, err_unconfirmed = self.service.start_test_session(
            self.app_id, self.r2["round_id"], confirmed_instructions=False
        )
        self.assertFalse(ok_unconfirmed, "Starting test without confirmed_instructions must fail!")
        self.assertIsNone(sess_unconfirmed)
        self.assertIn("instructions", err_unconfirmed.lower())

        # Explicit user click on 'Start Test' after confirming instructions
        ok_start, started_sess, err_start = self.service.start_test_session(
            self.app_id, self.r2["round_id"], confirmed_instructions=True
        )
        self.assertTrue(ok_start)
        self.assertIsNotNone(started_sess)
        self.assertEqual(started_sess["status"], "in_progress")
        self.assertGreater(started_sess["remaining_seconds"], 0)
        session_id = started_sess["session_id"]
        ends_at = started_sess["ends_at"]
        print(f"[OK] Session created: {session_id}, timer started (ends_at={ends_at})")

        # 4. Calling start again or opening second tab returns same session without restarting timer
        print("\n--- TEST: Calling Start again or opening second tab returns existing session ---")
        ok_repeat, repeat_sess, _ = self.service.start_test_session(
            self.app_id, self.r2["round_id"], confirmed_instructions=True
        )
        self.assertTrue(ok_repeat)
        self.assertEqual(repeat_sess["session_id"], session_id)
        self.assertEqual(repeat_sess["ends_at"], ends_at)

        # GET request also returns same session
        ok_get, get_sess, _ = self.service.get_test_session(self.app_id, self.r2["round_id"])
        self.assertTrue(ok_get)
        self.assertEqual(get_sess["session_id"], session_id)
        self.assertEqual(get_sess["ends_at"], ends_at)
        print("[OK] Verified: start_test_session and get_test_session are idempotent and return the exact same attempt.")

        # 5. Expired attempt auto-submits on load
        print("\n--- TEST: Expired attempt auto-submits on GET ---")
        # Manipulate ends_at to be in the past
        past_time = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        with sqlite3.connect(self.test_db) as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE aptitude_test_sessions SET ends_at = ? WHERE session_id = ?", (past_time, session_id))
            conn.commit()

        # Call get_test_session
        ok_exp, exp_sess, _ = self.service.get_test_session(self.app_id, self.r2["round_id"])
        self.assertTrue(ok_exp)
        self.assertIsNotNone(exp_sess)
        self.assertEqual(exp_sess["status"], "completed", "Expired session must auto-submit and become completed!")
        self.assertIsNotNone(exp_sess.get("result"), "Result must be present for auto-submitted expired session!")
        print(f"[OK] Expired session auto-submitted: status={exp_sess['status']}, score={exp_sess['result']['score']}")

if __name__ == "__main__":
    unittest.main()
