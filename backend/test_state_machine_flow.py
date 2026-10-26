"""
Comprehensive State Machine Test Suite for Aptitude Test (Round 2)
Verifies:
1. After submitting application and passing Round 1, DB contains NO attempt for Round 2.
2. After "Start Round 2" and visiting instructions, still NO attempt.
3. Start without confirmed_instructions is rejected (HTTP 400).
4. After "Start Test" with confirmed_instructions, exactly ONE attempt exists and timer is running.
5. A second Start returns the exact same attempt (idempotent, 1 row).
6. GET /api/aptitude/session is strictly read-only and resumes existing attempt.
"""

import unittest
import sqlite3
import json
import time
from fastapi.testclient import TestClient

from main import app
from services.aptitude_service import AptitudeService
from repositories.pipeline_repository import PipelineRepository


class TestStateMachineAptitudeFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.service = AptitudeService()
        cls.repo = PipelineRepository()

    def setUp(self):
        self.email = f"state_machine_{int(time.time() * 1000)}@test.com"
        self.candidate_name = "State Machine Candidate"
        self.job_role = "Frontend Developer"

    def _get_db_session_count(self, app_id: str) -> int:
        with self.service._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM aptitude_test_sessions WHERE application_id = ?", (app_id,))
            return cursor.fetchone()[0]

    def _get_db_round2_attempt_count(self, app_id: str, r2_id: str) -> int:
        attempts = self.repo.get_attempts_for_application(app_id)
        return len([a for a in attempts if a["round_id"] == r2_id])

    def test_complete_state_machine_flow(self):
        # ─────────────────────────────────────────────────────────────
        # STEP 1: Submit Application
        # ─────────────────────────────────────────────────────────────
        create_res = self.client.post("/api/candidate-applications", json={
            "candidate_email": self.email,
            "candidate_name": self.candidate_name,
            "job_role": self.job_role,
            "resume_text": "Experienced React TypeScript frontend developer with deep architectural understanding." * 5
        })
        self.assertEqual(create_res.status_code, 200)
        app_data = create_res.json()["application"]
        app_id = app_data["application_id"]
        pipeline_id = app_data["pipeline_id"]

        # Fetch stepper
        status_res = self.client.get(f"/api/candidate-applications/{app_id}/status")
        self.assertEqual(status_res.status_code, 200)
        rounds = status_res.json()["data"]["rounds"]
        r1 = next(r for r in rounds if r["order"] == 1)
        r2 = next(r for r in rounds if r["order"] == 2)

        self.assertEqual(r1["status"], "unlocked")
        self.assertEqual(r2["status"], "locked")

        # ─────────────────────────────────────────────────────────────
        # STEP 2: Evaluate & Pass Round 1 (ATS Screening)
        # ─────────────────────────────────────────────────────────────
        # Start Round 1
        r1_start = self.client.post(
            f"/api/candidate-applications/{app_id}/rounds/{r1['round_id']}/start",
            json={"is_simulated": False}
        )
        self.assertEqual(r1_start.status_code, 200)

        # Submit Round 1 passing score (85% > 60% cutoff)
        r1_submit = self.client.post(
            f"/api/candidate-applications/{app_id}/rounds/{r1['round_id']}/submit",
            json={
                "score": 85.0,
                "feedback": "Cutoff satisfied. Resume approved.",
                "details": {"matched_skills": ["React", "TypeScript"]}
            }
        )
        self.assertEqual(r1_submit.status_code, 200)

        # Re-check stepper: Round 1 is passed, Round 2 is unlocked ONLY
        stepper_after_r1 = self.client.get(f"/api/candidate-applications/{app_id}/status").json()["data"]
        r1_after = next(r for r in stepper_after_r1["rounds"] if r["order"] == 1)
        r2_after = next(r for r in stepper_after_r1["rounds"] if r["order"] == 2)

        self.assertEqual(r1_after["status"], "passed")
        self.assertEqual(r2_after["status"], "unlocked", "Round 2 must be unlocked ONLY")

        # ASSERTION 1: Database contains NO attempt and NO session for Round 2
        db_sessions_after_submit = self._get_db_session_count(app_id)
        db_attempts_after_submit = self._get_db_round2_attempt_count(app_id, r2["round_id"])
        self.assertEqual(db_sessions_after_submit, 0, "No row in aptitude_test_sessions after Round 1 pass")
        self.assertEqual(db_attempts_after_submit, 0, "No row in attempts for Round 2 after Round 1 pass")

        # ─────────────────────────────────────────────────────────────
        # STEP 3: Candidate visits Instructions Page (/apply/round/2/instructions)
        # ─────────────────────────────────────────────────────────────
        # Instructions page queries GET /api/aptitude/session/{app_id}
        sess_get = self.client.get(f"/api/aptitude/session/{app_id}?round_id={r2['round_id']}")
        self.assertEqual(sess_get.status_code, 200)
        self.assertIsNone(sess_get.json()["session"], "GET /session must return null before start")

        # ASSERTION 2: Still NO attempt in database after visiting instructions
        db_sessions_on_instructions = self._get_db_session_count(app_id)
        db_attempts_on_instructions = self._get_db_round2_attempt_count(app_id, r2["round_id"])
        self.assertEqual(db_sessions_on_instructions, 0, "Still no row in aptitude_test_sessions on instructions")
        self.assertEqual(db_attempts_on_instructions, 0, "Still no row in attempts on instructions")

        # ─────────────────────────────────────────────────────────────
        # STEP 4: Calling Start without confirmed_instructions is REJECTED
        # ─────────────────────────────────────────────────────────────
        start_unconfirmed = self.client.post("/api/aptitude/start", json={
            "application_id": app_id,
            "round_id": r2["round_id"],
            "allow_retake": False,
            "confirmed_instructions": False
        })
        self.assertEqual(start_unconfirmed.status_code, 400, "Must reject start without confirmed_instructions")
        self.assertIn("instructions", start_unconfirmed.json()["detail"].lower())

        # Still NO attempt
        self.assertEqual(self._get_db_session_count(app_id), 0)
        self.assertEqual(self._get_db_round2_attempt_count(app_id, r2["round_id"]), 0)

        # ─────────────────────────────────────────────────────────────
        # STEP 5: Clicking "Start Test" with confirmed_instructions = True
        # ─────────────────────────────────────────────────────────────
        start_confirmed = self.client.post("/api/aptitude/start", json={
            "application_id": app_id,
            "round_id": r2["round_id"],
            "allow_retake": False,
            "confirmed_instructions": True
        })
        self.assertEqual(start_confirmed.status_code, 200)
        session_data = start_confirmed.json()["session"]
        self.assertIsNotNone(session_data)
        self.assertEqual(session_data["status"], "in_progress")
        self.assertGreater(session_data["remaining_seconds"], 0, "Timer must be running")
        self.assertEqual(len(session_data["selected_questions"]), 15, "15 questions allocated")

        # ASSERTION 3: Exactly ONE attempt exists in DB
        db_sessions_after_start = self._get_db_session_count(app_id)
        db_attempts_after_start = self._get_db_round2_attempt_count(app_id, r2["round_id"])
        self.assertEqual(db_sessions_after_start, 1, "Exactly 1 row in aptitude_test_sessions")
        self.assertEqual(db_attempts_after_start, 1, "Exactly 1 attempt in pipeline repo for Round 2")

        # ─────────────────────────────────────────────────────────────
        # STEP 6: Second Start call is IDEMPOTENT (returns same attempt)
        # ─────────────────────────────────────────────────────────────
        second_start = self.client.post("/api/aptitude/start", json={
            "application_id": app_id,
            "round_id": r2["round_id"],
            "allow_retake": False,
            "confirmed_instructions": True
        })
        self.assertEqual(second_start.status_code, 200)
        second_session = second_start.json()["session"]
        self.assertEqual(second_session["session_id"], session_data["session_id"], "Must return same session")
        self.assertEqual(second_session["attempt_id"], session_data["attempt_id"], "Must return same attempt")

        # Still exactly 1 row
        self.assertEqual(self._get_db_session_count(app_id), 1)
        self.assertEqual(self._get_db_round2_attempt_count(app_id, r2["round_id"]), 1)

        # ─────────────────────────────────────────────────────────────
        # STEP 7: GET /api/aptitude/session resumes the existing session
        # ─────────────────────────────────────────────────────────────
        resumed_get = self.client.get(f"/api/aptitude/session/{app_id}?round_id={r2['round_id']}")
        self.assertEqual(resumed_get.status_code, 200)
        resumed_data = resumed_get.json()["session"]
        self.assertIsNotNone(resumed_data)
        self.assertEqual(resumed_data["session_id"], session_data["session_id"])
        self.assertEqual(resumed_data["status"], "in_progress")


if __name__ == "__main__":
    unittest.main()
