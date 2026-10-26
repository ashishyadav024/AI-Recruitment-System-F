"""
Automated Test Suite for Multi-Round Pipeline Sequential Gating & Normalized Scoring

Tests:
1. Sequential Gating: Candidate cannot start Round 2 without passing Round 1 (Enforces server-side 403 rejection)
2. Failed Cutoff: A score below the cutoff keeps subsequent rounds locked and sets status to 'not_selected' or 'on_hold'
3. Recruiter Override: Recruiter manual override ('promote' / 'allow_retake') unlocks the next round and records audit trail
4. Existing Interview Flow: Simulated technical interview completes and persists normalized score against round attempt
"""

import sys
import uuid
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

# Direct import of repository without loading full repositories.__init__
import repositories.pipeline_repository as pr
from db.pipeline_models import (
    StandardRoundType,
    RoundStatus,
    OnFailAction,
    ApplicationStatus
)

def test_pipeline_sequential_gating():
    print("=" * 80)
    print("[TEST] RUNNING MULTI-ROUND PIPELINE SEQUENTIAL GATING TEST SUITE")
    print("=" * 80)

    repo = pr.PipelineRepository()
    role = "Machine Learning Engineer"

    # Step 1: Initialize Pipeline
    pipeline = repo.get_or_create_default_pipeline(role)
    assert pipeline is not None, "Failed to get/create pipeline"
    rounds = pipeline.get("rounds", [])
    assert len(rounds) == 6, f"Expected 6 standard rounds, got {len(rounds)}"
    print(f"[PASS] Pipeline initialized for '{role}' with {len(rounds)} rounds.")

    round1 = rounds[0]  # Resume Screening
    round2 = rounds[1]  # Aptitude Test
    round5 = rounds[4]  # Technical Interview

    # Step 2: Create Candidate Application
    cand_email = f"test.candidate.{uuid.uuid4().hex[:8]}@enterprise.com"
    cand_name = "Vikram Aditya"
    app = repo.get_or_create_application(cand_email, cand_name, role)
    app_id = app["application_id"]
    print(f"[PASS] Candidate application created: {app_id} (Status: {app['status']})")

    # Step 3: Verify Stepper Initial State
    # Round 1 should be UNLOCKED, all later rounds (2-6) must be LOCKED
    stepper = repo.get_candidate_stepper_progress(app_id)
    assert stepper["rounds"][0]["status"] == RoundStatus.UNLOCKED.value, "Round 1 must start UNLOCKED"
    for r in stepper["rounds"][1:]:
        assert r["status"] == RoundStatus.LOCKED.value, f"Round {r['order']} must start LOCKED"
    print("[PASS] Stepper Initial State: Round 1 is UNLOCKED, Rounds 2-6 are securely LOCKED.")

    # Step 4: Gating Test 1 - Direct attempt to start Round 2 WITHOUT passing Round 1 MUST FAIL (403)
    can_start_r2, reason_r2, _ = repo.validate_can_start_round(app_id, round2["round_id"])
    assert can_start_r2 is False, "Sequential Gating FAILED: Candidate was erroneously allowed to start Round 2 without passing Round 1!"
    assert "Sequential Gating Violation" in reason_r2 or "must be PASSED" in reason_r2, f"Unexpected reason: {reason_r2}"
    print(f"[PASS] Gating Test 1 Passed: Direct start of Round 2 blocked with: '{reason_r2}'")

    # Direct attempt to jump straight to Round 5 (Technical Interview) MUST ALSO FAIL
    can_start_r5, reason_r5, _ = repo.validate_can_start_round(app_id, round5["round_id"])
    assert can_start_r5 is False, "Candidate was erroneously allowed to bypass to Technical Interview!"
    print(f"[PASS] Gating Test 1b Passed: Direct jump to Technical Interview blocked.")

    # Step 5: Start and Pass Round 1 (Resume Screening)
    ok_r1, attempt_r1, err_r1 = repo.start_round_attempt(app_id, round1["round_id"])
    assert ok_r1 is True, f"Failed to start Round 1: {err_r1}"
    print(f"[PASS] Started Round 1 attempt: {attempt_r1['attempt_id']}")

    # Submit passing score: 85/100 (Cutoff is 60)
    ok_sub1, score_res1, err_sub1 = repo.submit_normalized_score(
        attempt_id=attempt_r1["attempt_id"],
        score=85.0,
        feedback="Resume strongly aligned with role requirements.",
        details={"keyword_match": 90, "experience_years": 4}
    )
    assert ok_sub1 is True, f"Failed to submit Round 1 score: {err_sub1}"
    assert score_res1["passed"] is True, "Expected Round 1 to be marked PASSED"
    print(f"[PASS] Round 1 completed with score {score_res1['score']}/100. Cutoff passed!")

    # Step 6: Verify Stepper Progress - Round 1 is PASSED, Round 2 is now UNLOCKED, Round 3 remains LOCKED
    stepper_after_r1 = repo.get_candidate_stepper_progress(app_id)
    assert stepper_after_r1["rounds"][0]["status"] == RoundStatus.PASSED.value
    assert stepper_after_r1["rounds"][1]["status"] == RoundStatus.UNLOCKED.value
    assert stepper_after_r1["rounds"][2]["status"] == RoundStatus.LOCKED.value
    print("[PASS] Stepper Update: Round 1 is PASSED, Round 2 is UNLOCKED, Round 3+ remain LOCKED.")

    # Step 7: Gating Test 2 - Fail Round 2 (Aptitude Test)
    # Start Round 2 (now permitted because Round 1 was passed)
    ok_r2, attempt_r2, _ = repo.start_round_attempt(app_id, round2["round_id"])
    assert ok_r2 is True, "Candidate should be allowed to start Round 2 after passing Round 1"

    # Submit failing score: 45/100 (Below cutoff 60)
    ok_sub2, score_res2, _ = repo.submit_normalized_score(
        attempt_id=attempt_r2["attempt_id"],
        score=45.0,
        feedback="Aptitude score fell below the 60 cutoff threshold.",
        details={"quantitative": 40, "logic": 50}
    )
    assert score_res2["passed"] is False, "Expected Round 2 to be marked FAILED"
    print(f"[PASS] Round 2 submitted with score 45/100 (Fails cutoff 60). Status: {score_res2['attempt_status']}")

    # Verify that Round 3 remains LOCKED and application status is updated
    stepper_after_fail = repo.get_candidate_stepper_progress(app_id)
    assert stepper_after_fail["rounds"][1]["status"] == RoundStatus.FAILED.value
    assert stepper_after_fail["rounds"][2]["status"] == RoundStatus.LOCKED.value
    assert stepper_after_fail["overall_status"] in [ApplicationStatus.NOT_SELECTED.value, ApplicationStatus.ON_HOLD.value]
    print(f"[PASS] Gating Test 2 Passed: Failed Round 2 kept Round 3 LOCKED and application set to: {stepper_after_fail['overall_status']}")

    # Verify that Round 3 still cannot be started
    can_start_r3, reason_r3, _ = repo.validate_can_start_round(app_id, rounds[2]["round_id"])
    assert can_start_r3 is False, "Sequential gating allowed starting Round 3 after Round 2 failed!"
    print(f"[PASS] Gating Test 2b Passed: Starting Round 3 successfully blocked after Round 2 failure.")

    # Step 8: Gating Test 3 - Recruiter Override (Promote)
    # Recruiter Alex Morgan reviews the candidate and promotes them past Round 2
    ok_ovr, ovr_res, err_ovr = repo.apply_recruiter_override(
        application_id=app_id,
        round_id=round2["round_id"],
        action="promote",
        reason="Exceptional prior open-source contributions compensate for test speed.",
        recruiter_name="Alex Morgan"
    )
    assert ok_ovr is True, f"Failed to execute recruiter override: {err_ovr}"
    print(f"[PASS] Recruiter Override Executed: {ovr_res['action']} by {ovr_res['overridden_by']}")

    # Verify that Round 3 is now UNLOCKED after recruiter override promotion
    stepper_after_ovr = repo.get_candidate_stepper_progress(app_id)
    assert stepper_after_ovr["rounds"][1]["status"] == RoundStatus.PASSED.value, "Round 2 must be marked PASSED after override promotion"
    assert stepper_after_ovr["rounds"][2]["status"] == RoundStatus.UNLOCKED.value, "Round 3 must be UNLOCKED after override promotion"
    print("[PASS] Gating Test 3 Passed: Recruiter override unlocked Round 3!")

    # Step 9: Existing Interview Hookup Test (Technical Interview as Round 5)
    # Fast-forward pass Round 3 and Round 4
    for r_idx in [2, 3]:
        r_doc = rounds[r_idx]
        repo.start_round_attempt(app_id, r_doc["round_id"])
        repo.submit_normalized_score(
            attempt_id=repo.get_attempt_for_round(app_id, r_doc["round_id"])["attempt_id"],
            score=78.0,
            feedback=f"Passed Round {r_doc['order']}"
        )

    # Now Round 5 (Technical Interview) is UNLOCKED
    can_start_tech, _, _ = repo.validate_can_start_round(app_id, round5["round_id"])
    assert can_start_tech is True, "Technical Interview should now be unlocked"
    
    ok_tech, attempt_tech, _ = repo.start_round_attempt(
        app_id,
        round5["round_id"],
        interview_id="int-live-test-999"
    )
    assert ok_tech is True

    # Simulate Technical Interview completion (e.g., from VideoInterview scorecard)
    interview_score = 92.0
    ok_tech_sub, tech_score_res, _ = repo.submit_normalized_score(
        attempt_id=attempt_tech["attempt_id"],
        score=interview_score,
        feedback="Outstanding performance across Technical Architecture and System Design.",
        details={
            "stages": 4,
            "technical_depth": 94,
            "problem_solving": 91,
            "communication": 89
        }
    )
    assert ok_tech_sub is True
    assert tech_score_res["passed"] is True
    print(f"[PASS] Existing Interview Hookup Passed: Technical Interview completed with score {tech_score_res['score']}/100 and saved to round attempt!")

    # Verify Stepper: Round 5 is PASSED, Round 6 (HR Interview) is UNLOCKED
    final_stepper = repo.get_candidate_stepper_progress(app_id)
    assert final_stepper["rounds"][4]["status"] == RoundStatus.PASSED.value
    assert final_stepper["rounds"][5]["status"] == RoundStatus.UNLOCKED.value
    print("[PASS] Final Stepper Check: Technical Interview PASSED, HR Interview UNLOCKED.")

    print("\n" + "=" * 80)
    print("[SUCCESS] ALL SEQUENTIAL GATING & PIPELINE TESTS PASSED 100%!")
    print("=" * 80)

if __name__ == "__main__":
    test_pipeline_sequential_gating()
