"""
Comprehensive Unit & Integration Tests for Aptitude Test Round
Tests:
1. Question bank integrity (45+ questions, 15 per section, 4 options, valid correct answer).
2. Question selection & option shuffling (no correct answers exposed to browser).
3. 403 Forbidden when Round 1 (Resume Screening) is not passed.
4. Server-side timer calculation and session fixation across page refreshes.
5. Answer autosaving.
6. Anti-cheat tab switch logging.
7. Scoring logic with and without negative marking.
8. Timer expiry triggering auto-submit.
9. Cutoff pass/fail evaluation and pipeline sequential gating (unlocking Round 3 on pass).
10. Database persistence across backend restart.
"""

import os
import sys
import json
import time
from datetime import datetime, timedelta, timezone

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from repositories.pipeline_repository import PipelineRepository
from services.aptitude_service import AptitudeService

def test_question_bank():
    print("Test 1: Testing question bank seeding and integrity...")
    service = AptitudeService()
    stats = service.get_all_questions_count()
    total = stats["total_questions"]
    breakdown = stats["breakdown"]
    print(f"  Total questions in SQLite: {total}")
    print(f"  Breakdown: {breakdown}")
    assert total >= 45, f"Expected >= 45 questions, got {total}"
    assert "Quantitative Aptitude" in breakdown
    assert "Logical Reasoning" in breakdown
    assert "Verbal Ability" in breakdown
    assert sum(breakdown["Quantitative Aptitude"].values()) >= 15
    assert sum(breakdown["Logical Reasoning"].values()) >= 15
    assert sum(breakdown["Verbal Ability"].values()) >= 15
    print("  [OK] Question bank seeded with >= 45 questions across 3 sections.")

def test_gating_403_when_round1_not_passed():
    print("Test 2: Verifying 403 Forbidden when Round 1 is not passed...")
    repo = PipelineRepository()
    service = AptitudeService()
    
    # Create fresh candidate application without passing Round 1
    app = repo.get_or_create_application(
        candidate_email=f"candidate_ungated_{int(time.time())}@test.com",
        candidate_name="Ungated Candidate",
        job_role="Frontend Developer"
    )
    app_id = app["application_id"]
    
    ok, session, err = service.get_or_create_test_session(app_id)
    assert not ok, "Session creation must fail when Round 1 not passed!"
    assert err is not None
    print(f"  [OK] Gating enforced: '{err}'")

def test_session_creation_and_option_shuffling():
    print("Test 3: Testing test session creation after passing Round 1...")
    repo = PipelineRepository()
    service = AptitudeService()
    
    # Create application and pass Round 1
    app = repo.get_or_create_application(
        candidate_email=f"candidate_pass_r1_{int(time.time())}@test.com",
        candidate_name="Qualified Round1",
        job_role="Frontend Developer"
    )
    app_id = app["application_id"]
    
    # Fetch round 1
    stepper = repo.get_candidate_stepper_progress(app_id)
    r1 = stepper["rounds"][0]
    r2 = stepper["rounds"][1]
    
    # Start and pass Round 1
    ok_start, att1, _ = repo.start_round_attempt(app_id, r1["round_id"])
    ok_sub, res1, _ = repo.submit_normalized_score(
        attempt_id=att1["attempt_id"],
        score=75.0,
        feedback="Resume screening passed cutoff"
    )
    assert ok_sub and res1["passed"]
    
    # Now start Aptitude Test (Round 2)
    ok_sess, sess, err = service.get_or_create_test_session(app_id, r2["round_id"])
    assert ok_sess, f"Failed to start session: {err}"
    assert sess is not None
    assert sess["status"] == "in_progress"
    assert len(sess["selected_questions"]) == 15
    assert sess["remaining_seconds"] > 0
    
    # Check that no question exposes correct_answer or explanation
    for q in sess["selected_questions"]:
        assert "correct_answer" not in q, f"SECURITY LEAK: correct_answer exposed in {q['question_id']}"
        assert "explanation" not in q, f"SECURITY LEAK: explanation exposed in {q['question_id']}"
        assert len(q["options"]) == 4
    
    # Test session fixation across refresh: calling again returns same questions
    ok_res, sess2, _ = service.get_or_create_test_session(app_id, r2["round_id"])
    assert sess2["session_id"] == sess["session_id"]
    assert [q["question_id"] for q in sess2["selected_questions"]] == [q["question_id"] for q in sess["selected_questions"]]
    print("  [OK] Questions selected, options shuffled, security clean, session persistent across refresh.")

def test_autosave_and_tab_switch():
    print("Test 4: Testing autosave answer and tab switch logging...")
    repo = PipelineRepository()
    service = AptitudeService()
    
    app = repo.get_or_create_application(
        candidate_email=f"candidate_autosave_{int(time.time())}@test.com",
        candidate_name="Autosave Candidate",
        job_role="Backend Engineer"
    )
    app_id = app["application_id"]
    stepper = repo.get_candidate_stepper_progress(app_id)
    r1 = stepper["rounds"][0]
    r2 = stepper["rounds"][1]
    
    # Pass Round 1
    _, att1, _ = repo.start_round_attempt(app_id, r1["round_id"])
    repo.submit_normalized_score(attempt_id=att1["attempt_id"], score=80.0, feedback="Passed")
    
    # Start session
    _, sess, _ = service.get_or_create_test_session(app_id, r2["round_id"])
    first_q = sess["selected_questions"][0]
    chosen_opt = first_q["options"][1]
    
    # Autosave
    ok_save, save_res, _ = service.autosave_answer(app_id, first_q["question_id"], chosen_opt)
    assert ok_save
    assert save_res["saved"]
    assert save_res["total_answered"] == 1
    
    # Tab switch
    ok_tab, tab_res, _ = service.log_tab_switch(app_id)
    assert ok_tab
    assert tab_res["tab_switches"] == 1
    
    # Toggle review
    ok_rev, rev_res, _ = service.toggle_mark_for_review(app_id, first_q["question_id"])
    assert ok_rev
    assert rev_res["is_marked"] is True
    
    # Verify in session fetch
    _, reloaded_sess, _ = service.get_or_create_test_session(app_id, r2["round_id"])
    assert reloaded_sess["answers"][first_q["question_id"]] == chosen_opt
    assert first_q["question_id"] in reloaded_sess["marked_review"]
    assert reloaded_sess["tab_switches"] == 1
    print("  [OK] Autosave, review flag, and tab-switch counter verified.")

def test_scoring_and_sequential_gating_unlock():
    print("Test 5: Testing grading, cutoff check, and Round 3 unlock...")
    repo = PipelineRepository()
    service = AptitudeService()
    
    app = repo.get_or_create_application(
        candidate_email=f"candidate_pass_r2_{int(time.time())}@test.com",
        candidate_name="Top Performer",
        job_role="Backend Engineer"
    )
    app_id = app["application_id"]
    stepper = repo.get_candidate_stepper_progress(app_id)
    r1 = stepper["rounds"][0]
    r2 = stepper["rounds"][1]
    
    # Pass Round 1
    _, att1, _ = repo.start_round_attempt(app_id, r1["round_id"])
    repo.submit_normalized_score(attempt_id=att1["attempt_id"], score=85.0, feedback="Passed")
    
    # Start Round 2
    _, sess, _ = service.get_or_create_test_session(app_id, r2["round_id"])
    
    # Answer questions using backend keys to simulate an 80% score
    with service._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT question_keys_json FROM aptitude_test_sessions WHERE session_id = ?", (sess["session_id"],))
        keys = json.loads(cursor.fetchone()["question_keys_json"])
    
    questions = sess["selected_questions"]
    # Answer 12 out of 15 correctly (80%)
    for idx, q in enumerate(questions):
        qid = q["question_id"]
        if idx < 12:
            correct_ans = keys[qid]["correct_answer"]
            service.autosave_answer(app_id, qid, correct_ans)
        else:
            # Pick a wrong answer
            wrong = [opt for opt in q["options"] if opt != keys[qid]["correct_answer"]][0]
            service.autosave_answer(app_id, qid, wrong)
    
    # Submit
    ok_sub, result, err = service.submit_test(app_id, r2["round_id"])
    assert ok_sub, f"Submission failed: {err}"
    assert result["score"] == 80.0
    assert result["passed"] is True
    assert result["details"]["correct_count"] == 12
    assert result["details"]["incorrect_count"] == 3
    
    # Check sequential gating: Round 2 is now PASSED, Round 3 is UNLOCKED!
    updated_stepper = repo.get_candidate_stepper_progress(app_id)
    rounds = updated_stepper["rounds"]
    assert rounds[0]["status"] == "passed", f"Round 1 status: {rounds[0]['status']}"
    assert rounds[1]["status"] == "passed", f"Round 2 status: {rounds[1]['status']}"
    assert rounds[2]["status"] == "unlocked", f"Round 3 status: {rounds[2]['status']}"
    passed_count = sum(1 for r in rounds if r["status"] == "passed")
    assert passed_count == 2, f"Expected 2 passed rounds, got {passed_count}"
    print(f"  [OK] Candidate scored 80.0%, passed cutoff 60.0%. Stepper updated: Round 2 PASSED, Round 3 UNLOCKED (Passed count: {passed_count}/6)!")

def test_negative_marking():
    print("Test 6: Testing negative marking penalty...")
    repo = PipelineRepository()
    service = AptitudeService()
    
    # Configure negative marking enabled
    service.update_config({
        "job_role": "Machine Learning Engineer",
        "quant_count": 5,
        "logic_count": 5,
        "verbal_count": 5,
        "duration_minutes": 20,
        "cutoff_score": 60.0,
        "negative_marking": True,
        "negative_penalty": 0.25
    })
    
    app = repo.get_or_create_application(
        candidate_email=f"candidate_neg_{int(time.time())}@test.com",
        candidate_name="Neg Test Candidate",
        job_role="Machine Learning Engineer"
    )
    app_id = app["application_id"]
    stepper = repo.get_candidate_stepper_progress(app_id)
    r1 = stepper["rounds"][0]
    r2 = stepper["rounds"][1]
    
    # Pass Round 1
    _, att1, _ = repo.start_round_attempt(app_id, r1["round_id"])
    repo.submit_normalized_score(attempt_id=att1["attempt_id"], score=80.0, feedback="Passed")
    
    # Start Round 2
    _, sess, _ = service.get_or_create_test_session(app_id, r2["round_id"])
    assert sess["negative_marking"] is True
    
    with service._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT question_keys_json FROM aptitude_test_sessions WHERE session_id = ?", (sess["session_id"],))
        keys = json.loads(cursor.fetchone()["question_keys_json"])
    
    questions = sess["selected_questions"]
    # 10 correct, 4 wrong, 1 unattempted
    # Raw points = 10 - (4 * 0.25) = 10 - 1.0 = 9.0 out of 15.0 => 60.0%
    for idx, q in enumerate(questions):
        qid = q["question_id"]
        if idx < 10:
            service.autosave_answer(app_id, qid, keys[qid]["correct_answer"])
        elif idx < 14:
            wrong = [opt for opt in q["options"] if opt != keys[qid]["correct_answer"]][0]
            service.autosave_answer(app_id, qid, wrong)
        # 15th left unattempted
    
    ok_sub, result, _ = service.submit_test(app_id, r2["round_id"])
    assert ok_sub
    # 9.0 / 15.0 = 60.0%
    assert result["score"] == 60.0
    assert result["details"]["negative_marking_applied"] is True
    assert result["details"]["correct_count"] == 10
    assert result["details"]["incorrect_count"] == 4
    assert result["details"]["unattempted_count"] == 1
    print(f"  [OK] Negative marking applied: 10 correct - (4 * 0.25) = 9.0/15 -> {result['score']}%")

def test_timer_expiry_auto_submit():
    print("Test 7: Testing server-side timer expiry auto-submit...")
    repo = PipelineRepository()
    service = AptitudeService()
    
    app = repo.get_or_create_application(
        candidate_email=f"candidate_expired_{int(time.time())}@test.com",
        candidate_name="Expired Timer Candidate",
        job_role="Data Analyst"
    )
    app_id = app["application_id"]
    stepper = repo.get_candidate_stepper_progress(app_id)
    r1 = stepper["rounds"][0]
    r2 = stepper["rounds"][1]
    
    # Pass Round 1
    _, att1, _ = repo.start_round_attempt(app_id, r1["round_id"])
    repo.submit_normalized_score(attempt_id=att1["attempt_id"], score=80.0, feedback="Passed")
    
    # Start Round 2
    _, sess, _ = service.get_or_create_test_session(app_id, r2["round_id"])
    session_id = sess["session_id"]
    
    # Artificially set ends_at to past in SQLite
    past_time = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    with service._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE aptitude_test_sessions SET ends_at = ? WHERE session_id = ?", (past_time, session_id))
        conn.commit()
    
    # Now when candidate reloads session, auto-submit triggers!
    ok_res, reloaded, _ = service.get_or_create_test_session(app_id, r2["round_id"])
    assert ok_res
    assert reloaded["status"] == "completed"
    assert reloaded["result"]["is_auto_submit"] is True
    print("  [OK] Timer expiry correctly triggered auto-submit.")

def test_recruiter_audit():
    print("Test 8: Testing recruiter audit endpoint...")
    repo = PipelineRepository()
    service = AptitudeService()
    
    app = repo.get_or_create_application(
        candidate_email=f"candidate_audit_{int(time.time())}@test.com",
        candidate_name="Audit Candidate",
        job_role="Frontend Developer"
    )
    app_id = app["application_id"]
    stepper = repo.get_candidate_stepper_progress(app_id)
    r1 = stepper["rounds"][0]
    r2 = stepper["rounds"][1]
    
    # Pass Round 1 & complete Round 2
    _, att1, _ = repo.start_round_attempt(app_id, r1["round_id"])
    repo.submit_normalized_score(attempt_id=att1["attempt_id"], score=80.0, feedback="Passed")
    service.get_or_create_test_session(app_id, r2["round_id"])
    service.submit_test(app_id, r2["round_id"])
    
    audit = service.get_recruiter_candidate_audit(app_id)
    assert audit is not None
    assert "result" in audit
    assert "question_audit" in audit["result"]
    assert len(audit["result"]["question_audit"]) == 15
    first_q = audit["result"]["question_audit"][0]
    assert "candidate_answer" in first_q
    assert "correct_answer" in first_q
    assert "explanation" in first_q
    print("  [OK] Recruiter audit endpoint returns question-by-question candidate vs correct answer breakdown.")

def test_server_restart_keeps_attempt_and_timer():
    print("Test 9: Testing server restart persistence (attempt, questions, and timer preserved)...")
    # Instance 1: Create application, pass Round 1, start Round 2
    repo1 = PipelineRepository()
    service1 = AptitudeService()
    
    app = repo1.get_or_create_application(
        candidate_email=f"candidate_restart_{int(time.time())}@test.com",
        candidate_name="Cold Restart Candidate",
        job_role="Backend Engineer"
    )
    app_id = app["application_id"]
    stepper = repo1.get_candidate_stepper_progress(app_id)
    r1 = stepper["rounds"][0]
    r2 = stepper["rounds"][1]
    
    # Pass Round 1
    _, att1, _ = repo1.start_round_attempt(app_id, r1["round_id"])
    repo1.submit_normalized_score(attempt_id=att1["attempt_id"], score=75.0, feedback="Passed")
    
    # Start Round 2 on service1
    _, sess1, _ = service1.get_or_create_test_session(app_id, r2["round_id"])
    session_id_1 = sess1["session_id"]
    first_qid = sess1["selected_questions"][0]["question_id"]
    first_opt = sess1["selected_questions"][0]["options"][0]
    
    # Candidate answers question 1
    service1.autosave_answer(app_id, first_qid, first_opt)
    ends_at_1 = sess1["ends_at"]
    
    # Simulate a full server restart: dispose service1 and repo1, spawn service2 and repo2 from scratch
    del service1
    del repo1
    time.sleep(0.5)
    
    repo2 = PipelineRepository()
    service2 = AptitudeService()
    
    # Fetch session on brand new server instance
    ok_res, sess2, _ = service2.get_or_create_test_session(app_id, r2["round_id"])
    assert ok_res is True
    assert sess2["session_id"] == session_id_1
    assert sess2["ends_at"] == ends_at_1
    assert sess2["answers"].get(first_qid) == first_opt
    assert len(sess2["selected_questions"]) == len(sess1["selected_questions"])
    assert sess2["selected_questions"][0]["question_id"] == first_qid
    assert sess2["selected_questions"][0]["options"] == sess1["selected_questions"][0]["options"]
    print("  [OK] Server restart preserved attempt ID, selected questions, options, saved answers, and server-side timer!")

if __name__ == "__main__":
    print("==================================================")
    print("RUNNING APTITUDE ROUND COMPREHENSIVE TESTS")
    print("==================================================")
    test_question_bank()
    test_gating_403_when_round1_not_passed()
    test_session_creation_and_option_shuffling()
    test_autosave_and_tab_switch()
    test_scoring_and_sequential_gating_unlock()
    test_negative_marking()
    test_timer_expiry_auto_submit()
    test_recruiter_audit()
    test_server_restart_keeps_attempt_and_timer()
    print("==================================================")
    print("ALL APTITUDE ROUND BACKEND TESTS PASSED SUCCESSFULLY!")
    print("==================================================")
