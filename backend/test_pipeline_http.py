import os
import sys
import unittest

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app as fastapi_app
from api.pipeline_routes import repo


class TestPipelineHTTP(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(fastapi_app)

    def test_pipeline_http_endpoints(self):
        # 1. Create candidate application
        create_res = self.client.post("/api/candidate-applications", json={
            "candidate_email": "jane.doe@example.com",
            "candidate_name": "Jane Doe",
            "job_role": "Frontend Developer",
            "resume_text": "Experienced React and TypeScript engineer with CSS, state management, and testing skills."
        })
        self.assertEqual(create_res.status_code, 200)
        app_data = create_res.json()["application"]
        app_id = app_data["application_id"]
        self.assertIsNotNone(app_id)

        # 2. Get pipeline for role
        pipe_res = self.client.get("/api/pipelines/Frontend%20Developer")
        self.assertEqual(pipe_res.status_code, 200)
        rounds = pipe_res.json()["pipeline"]["rounds"]
        r1_id = rounds[0]["round_id"]
        r2_id = rounds[1]["round_id"]
        r3_id = rounds[2]["round_id"]

        # 3. Validate Round 1 can start
        v1_res = self.client.get(f"/api/candidate-applications/{app_id}/rounds/{r1_id}/validate")
        self.assertEqual(v1_res.status_code, 200)
        self.assertTrue(v1_res.json()["can_start"])

        # 4. Attempting to start Round 2 directly should be BLOCKED with 403 Forbidden
        start_r2_fail = self.client.post(
            f"/api/candidate-applications/{app_id}/rounds/{r2_id}/start",
            json={"is_simulated": False}
        )
        self.assertEqual(start_r2_fail.status_code, 403)
        self.assertIn("must be PASSED", start_r2_fail.json()["detail"])

        # 5. Attempting to start Round 3 directly should also be BLOCKED with 403 Forbidden
        start_r3_fail = self.client.post(
            f"/api/candidate-applications/{app_id}/rounds/{r3_id}/start",
            json={"is_simulated": False}
        )
        self.assertEqual(start_r3_fail.status_code, 403)

        # 6. Pass Round 1 with score 68% (Cutoff 60%)
        start_r1 = self.client.post(
            f"/api/candidate-applications/{app_id}/rounds/{r1_id}/start",
            json={"is_simulated": False}
        )
        self.assertEqual(start_r1.status_code, 200)

        submit_r1 = self.client.post(
            f"/api/candidate-applications/{app_id}/rounds/{r1_id}/submit",
            json={
                "score": 68.0,
                "feedback": "Passed ATS screening threshold.",
                "details": {"matched_skills": ["React", "TypeScript"]}
            }
        )
        self.assertEqual(submit_r1.status_code, 200)
        self.assertTrue(submit_r1.json()["result"]["passed"])

        # 7. Validate Round 2: now can_start should be True!
        v2_res = self.client.get(f"/api/candidate-applications/{app_id}/rounds/{r2_id}/validate")
        self.assertEqual(v2_res.status_code, 200)
        self.assertTrue(v2_res.json()["can_start"])

        # 8. Start Round 2 (Aptitude Test) -> returns clean status: 'coming_soon'
        start_r2 = self.client.post(
            f"/api/candidate-applications/{app_id}/rounds/{r2_id}/start",
            json={"is_simulated": False}
        )
        self.assertEqual(start_r2.status_code, 200)
        r2_body = start_r2.json()
        self.assertTrue(r2_body["success"])
        self.assertEqual(r2_body["status"], "coming_soon")
        self.assertIn("Round 2", r2_body["message"])

        # 9. Calling Round 3 directly is STILL blocked with 403 (because Round 2 not passed)
        start_r3_still_blocked = self.client.post(
            f"/api/candidate-applications/{app_id}/rounds/{r3_id}/start",
            json={"is_simulated": False}
        )
        self.assertEqual(start_r3_still_blocked.status_code, 403)

        # 10. Call with unknown application ID -> returns 404
        bad_validate = self.client.get(f"/api/candidate-applications/app-unknown-xyz/rounds/{r2_id}/validate")
        self.assertEqual(bad_validate.status_code, 404)
        self.assertEqual(bad_validate.json()["detail"], "Candidate application not found")

        # 11. Application Restoration endpoint
        restore_res = self.client.post("/api/candidate-applications/restore", json={
            "candidate_email": "jane.doe@example.com",
            "job_role": "Frontend Developer"
        })
        self.assertEqual(restore_res.status_code, 200)
        restored = restore_res.json()
        self.assertTrue(restored["success"])
        self.assertEqual(restored["application"]["application_id"], app_id)
        # Stepper data includes round 1 passed, round 2 unlocked
        sr1 = next(r for r in restored["data"]["rounds"] if r["round_id"] == r1_id)
        sr2 = next(r for r in restored["data"]["rounds"] if r["round_id"] == r2_id)
        self.assertEqual(sr1["status"], "passed")
        self.assertEqual(sr2["status"], "unlocked")

        # 12. Restore with unknown email -> returns 404
        restore_unknown = self.client.post("/api/candidate-applications/restore", json={
            "candidate_email": "nonexistent.person@unknown.io"
        })
        self.assertEqual(restore_unknown.status_code, 404)

        print("\nALL HTTP API ENDPOINTS, VALIDATION, COMING_SOON, AND RESTORATION TESTS PASSED!")


if __name__ == "__main__":
    unittest.main()
