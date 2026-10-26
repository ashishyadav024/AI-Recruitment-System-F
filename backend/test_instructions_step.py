"""
Test Suite: Instructions Step for Aptitude Test (Round 2)
Verifies:
1. Visiting Round 2 creates NO attempt and starts NO timer.
2. The instructions step displays all required fields: 15 questions, 3 sections, 30 min duration, 60% cutoff, marking rules, integrity rules.
3. Attempt and timer start only after "Start Test" is clicked.
4. Refresh during test still resumes with correct remaining time.
5. Returning after submission shows results, not instructions.
"""

import sys
import os
import json
import uuid
import unittest
from datetime import datetime, timezone, timedelta

# Ensure backend root is on path
backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services.aptitude_service import AptitudeService
from repositories.pipeline_repository import PipelineRepository


class TestAptitudeInstructionsStep(unittest.TestCase):
    def setUp(self):
        self.service = AptitudeService()
        self.repo = PipelineRepository(db_path=self.service.db_path)
        self.candidate_email = f"candidate_instr_{uuid.uuid4().hex[:8]}@example.com"
        self.candidate_name = "Candidate Instructions Test"
        self.job_role = "Frontend Developer"

        # 1. Setup candidate application
        self.app = self.repo.get_or_create_application(
            candidate_email=self.candidate_email,
            candidate_name=self.candidate_name,
            job_role=self.job_role,
            is_simulated=False,
            resume_text="Senior React Frontend Developer with TypeScript, Tailwind CSS, component state architecture, and test-driven development experience."
        )
        self.application_id = self.app["application_id"]
        self.pipeline_id = self.app["pipeline_id"]

        # Pass Round 1 so Round 2 unlocks
        r1 = self.repo.get_round_by_type(self.pipeline_id, "resume_screening")
        self.r1_id = r1["round_id"]
        self.repo.start_round_attempt(self.application_id, self.r1_id, False)
        att1 = self.repo.get_attempt_for_round(self.application_id, self.r1_id)
        self.repo.submit_normalized_score(
            attempt_id=att1["attempt_id"],
            score=85.0,
            feedback="Passed ATS"
        )

        # Discover Round 2
        r2 = self.repo.get_round_by_type(self.pipeline_id, "aptitude_test")
        self.r2_id = r2["round_id"]

    def test_01_clicking_continue_creates_no_attempt_and_starts_no_timer(self):
        """Clicking 'Continue to Round 2' opens instructions page; no attempt or timer is created"""
        print("\n--- TEST 1: Opening Round 2 Instructions Page ---")

        # Frontend calls get_test_session (GET /api/aptitude/session/{application_id})
        ok, session_data, err = self.service.get_test_session(self.application_id, self.r2_id)
        self.assertTrue(ok)
        self.assertIsNone(session_data, "Before 'Start Test', session must be None (no attempt created)")
        self.assertIsNone(err)

        # Check repository attempts for Round 2
        att2 = self.repo.get_attempt_for_round(self.application_id, self.r2_id)
        self.assertIsNone(att2, "No attempt record must exist in pipeline repository before Start Test")

        # Check sqlite sessions table
        with self.service._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) as count FROM aptitude_test_sessions WHERE application_id = ?",
                (self.application_id,)
            )
            count = cursor.fetchone()["count"]
            self.assertEqual(count, 0, "No attempt or session row must exist in aptitude_test_sessions table")

        print("[OK] Verified: Opening instructions creates NO attempt and starts NO timer.")

    def test_02_config_and_specifications_displayed_correctly(self):
        """Instructions page shows 15 questions, 30 min duration, 60% cutoff, 3 sections with 5 each, and marking rules"""
        print("\n--- TEST 2: Instructions Page Specifications & Rules ---")
        config = self.service.get_config(self.job_role)

        self.assertEqual(config["total_questions"], 15, "Total questions must be 15")
        self.assertEqual(config["quant_count"], 5, "Quantitative section must have 5 questions")
        self.assertEqual(config["logic_count"], 5, "Logical section must have 5 questions")
        self.assertEqual(config["verbal_count"], 5, "Verbal section must have 5 questions")
        self.assertEqual(config["duration_minutes"], 30, "Duration must be 30 minutes")
        self.assertEqual(config["cutoff_score"], 60.0, "Cutoff must be 60.0%")
        self.assertIn("negative_marking", config, "Marking rules must include negative_marking setting")
        self.assertIn("tab_switch_limit", config, "Allowed violation count must be specified")

        print(f"[OK] Verified: Config displays 15 questions (5 quant, 5 logic, 5 verbal), {config['duration_minutes']} min, {config['cutoff_score']}% cutoff, tab switch limit: {config['tab_switch_limit']}.")

    def test_03_attempt_and_timer_start_only_after_start_test(self):
        """Clicking 'Start Test' starts timer and creates attempt"""
        print("\n--- TEST 3: Starting Test Only After User Clicks Start Test ---")

        # Before Start Test: attempt is None
        att_before = self.repo.get_attempt_for_round(self.application_id, self.r2_id)
        self.assertIsNone(att_before)

        # Candidate clicks "Start Test" -> POST /api/aptitude/start
        ok, session_data, err = self.service.start_test_session(self.application_id, self.r2_id, confirmed_instructions=True)
        self.assertTrue(ok)
        self.assertIsNotNone(session_data)
        self.assertEqual(session_data["status"], "in_progress")
        self.assertEqual(session_data["duration_minutes"], 30)
        self.assertGreater(session_data["remaining_seconds"], 1750, "Remaining seconds must start close to 1800 (30 min)")

        # Verify attempt now exists in database
        att_after = self.repo.get_attempt_for_round(self.application_id, self.r2_id)
        self.assertIsNotNone(att_after, "Attempt record must now exist in pipeline repository")
        self.assertEqual(att_after["status"], "in_progress")

        print(f"[OK] Attempt created: {session_data['attempt_id']}, Timer started: {session_data['remaining_seconds']}s remaining.")

    def test_04_refresh_during_test_resumes_with_correct_remaining_time(self):
        """Refreshing during active test skips instructions and resumes directly with remaining time"""
        print("\n--- TEST 4: Refresh During Test Resumes Directly ---")

        # Start test
        ok_start, session_start, _ = self.service.start_test_session(self.application_id, self.r2_id, confirmed_instructions=True)
        self.assertTrue(ok_start)
        session_id = session_start["session_id"]

        # Autosave one answer
        q0 = session_start["selected_questions"][0]
        self.service.autosave_answer(self.application_id, q0["question_id"], q0["options"][0])

        # Candidate refreshes page (calls get_test_session)
        ok_refresh, session_refreshed, _ = self.service.get_test_session(self.application_id, self.r2_id)
        self.assertTrue(ok_refresh)
        self.assertIsNotNone(session_refreshed)
        self.assertEqual(session_refreshed["status"], "in_progress", "Must resume with in_progress status")
        self.assertEqual(session_refreshed["session_id"], session_id, "Must retain exact same session ID")
        self.assertIn(q0["question_id"], session_refreshed["answers"], "Autosaved answers must be preserved")
        self.assertGreater(session_refreshed["remaining_seconds"], 0, "Remaining seconds must be positive")

        print(f"[OK] Refresh preserved in_progress status, autosaved answers, and {session_refreshed['remaining_seconds']}s remaining time.")

    def test_05_submitted_test_shows_result_not_instructions(self):
        """Submitting test causes subsequent visits to show results, NOT instructions"""
        print("\n--- TEST 5: Completed Test Shows Result ---")

        # Start and submit test
        self.service.start_test_session(self.application_id, self.r2_id, confirmed_instructions=True)
        ok_sub, result, err = self.service.submit_test(self.application_id, self.r2_id)
        self.assertTrue(ok_sub)
        self.assertIsNotNone(result)

        # Subsequent visit
        ok_get, session_after, _ = self.service.get_test_session(self.application_id, self.r2_id)
        self.assertTrue(ok_get)
        self.assertIsNotNone(session_after)
        self.assertEqual(session_after["status"], "completed", "Status must be completed")
        self.assertIsNotNone(session_after.get("result"), "Result must be present")

        print(f"[OK] Completed test returns status=completed and score={session_after['result']['score']}% (results shown, not instructions).")


if __name__ == "__main__":
    unittest.main()
