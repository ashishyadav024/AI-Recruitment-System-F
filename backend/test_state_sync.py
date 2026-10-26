"""
Test State Synchronization for Hiring Pipeline Gating & ATS Auto-Screening
Tests:
1. Pass Round 1:
   - Attempt becomes passed
   - Round 2 becomes unlocked
   - current_round_order advances to 2
   - application status is in_pipeline
2. Fail Round 1:
   - Round 2 remains locked
   - application status is not_selected (reject) or on_hold (hold)
3. Idempotency across reloads & double submission:
   - Re-submitting or calling start_round_attempt after pass does not reset attempt to in_progress
   - GET /candidate-applications/{id}/status returns identical passed state
"""

import sys
import unittest
from datetime import datetime

# Configure stdout encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from repositories.pipeline_repository import PipelineRepository
from db.pipeline_models import RoundStatus, ApplicationStatus, OnFailAction


class TestStateSynchronization(unittest.TestCase):
    def setUp(self):
        self.repo = PipelineRepository()

    def test_pass_round1_unlocks_round2_and_syncs_stepper(self):
        """Pass Round 1 -> Round 1 passed, Round 2 unlocked, order=2, status=in_pipeline"""
        email = f"pass_test_{datetime.utcnow().timestamp()}@example.com"
        app = self.repo.get_or_create_application(
            candidate_email=email,
            candidate_name="Jane Doe",
            job_role="Frontend Developer",
            resume_text="Senior React TypeScript frontend developer with state management and Tailwind CSS experience."
        )
        app_id = app["application_id"]

        # Fetch initial stepper
        initial_stepper = self.repo.get_candidate_stepper_progress(app_id)
        self.assertIsNotNone(initial_stepper)
        rounds = initial_stepper["rounds"]
        r1 = rounds[0]
        r2 = rounds[1]

        self.assertEqual(r1["order"], 1)
        self.assertEqual(r1["status"], RoundStatus.UNLOCKED.value)
        self.assertEqual(r2["status"], RoundStatus.LOCKED.value)
        self.assertEqual(initial_stepper["current_round_order"], 1)

        # 1. Start Round 1
        ok_start, att, err_start = self.repo.start_round_attempt(app_id, r1["round_id"])
        self.assertTrue(ok_start)
        self.assertIsNotNone(att)
        att_id = att["attempt_id"]

        # 2. Submit score 75 (cutoff is 60) -> PASS
        ok_sub, result, err_sub = self.repo.submit_normalized_score(
            attempt_id=att_id,
            score=75.0,
            feedback="Great resume match",
            details={"matched_skills": ["React", "TypeScript"]}
        )
        self.assertTrue(ok_sub)
        self.assertTrue(result["passed"])
        self.assertEqual(result["attempt_status"], RoundStatus.PASSED.value)
        self.assertEqual(result["application_status"], ApplicationStatus.IN_PIPELINE.value)

        # 3. Verify Stepper progress (Single source of truth)
        updated_stepper = self.repo.get_candidate_stepper_progress(app_id)
        up_rounds = updated_stepper["rounds"]
        up_r1 = up_rounds[0]
        up_r2 = up_rounds[1]

        self.assertEqual(up_r1["status"], RoundStatus.PASSED.value)
        self.assertEqual(up_r1["score_data"]["score"], 75.0)
        self.assertTrue(up_r1["score_data"]["passed"])
        self.assertEqual(up_r2["status"], RoundStatus.UNLOCKED.value)
        self.assertEqual(updated_stepper["current_round_order"], 2)
        self.assertEqual(updated_stepper["overall_status"], ApplicationStatus.IN_PIPELINE.value)

        # Count passed rounds: exactly 1
        passed_count = len([r for r in up_rounds if r["status"] == RoundStatus.PASSED.value])
        self.assertEqual(passed_count, 1)

    def test_fail_round1_locks_round2_and_sets_not_selected(self):
        """Fail Round 1 with reject setting -> Round 2 locked, app not_selected"""
        email = f"fail_test_{datetime.utcnow().timestamp()}@example.com"
        app = self.repo.get_or_create_application(
            candidate_email=email,
            candidate_name="Bob Smith",
            job_role="Frontend Developer",
            resume_text="Basic beginner text"
        )
        app_id = app["application_id"]
        stepper = self.repo.get_candidate_stepper_progress(app_id)
        r1 = stepper["rounds"][0]
        r2 = stepper["rounds"][1]

        ok_start, att, _ = self.repo.start_round_attempt(app_id, r1["round_id"])
        self.assertTrue(ok_start)

        # Score 35 (below cutoff 60) -> FAIL
        ok_sub, result, _ = self.repo.submit_normalized_score(
            attempt_id=att["attempt_id"],
            score=35.0,
            feedback="Insufficient skills"
        )
        self.assertTrue(ok_sub)
        self.assertFalse(result["passed"])
        self.assertEqual(result["attempt_status"], RoundStatus.FAILED.value)
        self.assertEqual(result["application_status"], ApplicationStatus.NOT_SELECTED.value)

        # Check stepper
        up_stepper = self.repo.get_candidate_stepper_progress(app_id)
        up_r1 = up_stepper["rounds"][0]
        up_r2 = up_stepper["rounds"][1]

        self.assertEqual(up_r1["status"], RoundStatus.FAILED.value)
        self.assertEqual(up_r2["status"], RoundStatus.LOCKED.value)
        self.assertEqual(up_stepper["overall_status"], ApplicationStatus.NOT_SELECTED.value)

    def test_idempotency_and_reload(self):
        """Calling submit twice or start_round_attempt after pass does NOT reset state"""
        email = f"idempotent_test_{datetime.utcnow().timestamp()}@example.com"
        app = self.repo.get_or_create_application(
            candidate_email=email,
            candidate_name="Alice Wonder",
            job_role="Frontend Developer"
        )
        app_id = app["application_id"]
        stepper = self.repo.get_candidate_stepper_progress(app_id)
        r1 = stepper["rounds"][0]

        ok_start, att, _ = self.repo.start_round_attempt(app_id, r1["round_id"])
        att_id = att["attempt_id"]

        # First submit: Pass
        ok1, res1, _ = self.repo.submit_normalized_score(att_id, 85.0, "Excellent")
        self.assertTrue(ok1)
        self.assertTrue(res1["passed"])

        # Second submit: Identical idempotent response
        ok2, res2, _ = self.repo.submit_normalized_score(att_id, 85.0, "Excellent")
        self.assertTrue(ok2)
        self.assertTrue(res2["passed"])
        self.assertEqual(res2["attempt_status"], RoundStatus.PASSED.value)

        # Calling start_round_attempt again on passed round does NOT reset to IN_PROGRESS
        ok_restart, att_restart, _ = self.repo.start_round_attempt(app_id, r1["round_id"])
        self.assertTrue(ok_restart)
        self.assertEqual(att_restart["status"], RoundStatus.PASSED.value)

        # Stepper remains 100% consistent
        final_stepper = self.repo.get_candidate_stepper_progress(app_id)
        self.assertEqual(final_stepper["rounds"][0]["status"], RoundStatus.PASSED.value)
        self.assertEqual(final_stepper["rounds"][1]["status"], RoundStatus.UNLOCKED.value)
        self.assertEqual(final_stepper["current_round_order"], 2)


if __name__ == "__main__":
    unittest.main()
