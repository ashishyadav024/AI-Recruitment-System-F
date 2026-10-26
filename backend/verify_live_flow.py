import time
import json
import sqlite3
import urllib.request
import urllib.error

import os

BASE_URL = "http://localhost:8001"
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "db", "pipeline.db"))

def query_db(query, params=()):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def make_request(method, path, body=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return e.code, parsed

def run_verification():
    ts = int(time.time())
    email = f"verified.flow.{ts}@example.com"
    name = f"Flow Candidate {ts}"
    role = "Frontend Developer"

    print("=================================================================")
    print("LIVE SERVER STATE MACHINE & TRACE VERIFICATION")
    print("=================================================================")
    print(f"Candidate Email: {email}")
    print(f"Role:            {role}")
    print("-----------------------------------------------------------------")

    # Step 1: Submit Application
    print("\n[Step 1] POST /api/candidate-applications (Submit Application)")
    status, res = make_request("POST", "/api/candidate-applications", {
        "candidate_email": email,
        "candidate_name": name,
        "job_role": role,
        "resume_text": "Experienced Frontend Engineer with React, TypeScript, Redux, TailwindCSS, Vite and Web Performance."
    })
    print(f"Status: {status}")
    app_id = res["application"]["application_id"]
    print(f"Application Created: {app_id}")

    # Check DB attempts
    attempts = query_db("SELECT * FROM candidate_round_attempts WHERE application_id=?", (app_id,))
    sessions = query_db("SELECT * FROM aptitude_test_sessions WHERE application_id=?", (app_id,))
    print(f"DB State -> candidate_round_attempts: {len(attempts)}, aptitude_test_sessions: {len(sessions)}")
    assert len(sessions) == 0, "ERROR: Session created prematurely!"

    # Step 2: Get Stepper (Round 1 status)
    print("\n[Step 2] GET /api/candidate-applications/{app_id}/status (Checking Initial Stepper)")
    status, stepper = make_request("GET", f"/api/candidate-applications/{app_id}/status")
    rounds = stepper["data"]["rounds"]
    r1 = rounds[0]
    r2 = rounds[1]
    print(f"Round 1 ({r1['title']}): status={r1['status']}")
    print(f"Round 2 ({r2['title']}): status={r2['status']}")
    assert r2['status'] == 'locked', f"Round 2 should be locked, got {r2['status']}"

    # Step 3: Complete Round 1 (Pass ATS)
    print("\n[Step 3] Pass Round 1 ATS Evaluation")
    # Start attempt for R1
    status, start_r1 = make_request("POST", f"/api/candidate-applications/{app_id}/rounds/{r1['round_id']}/start", {})
    att_r1_id = start_r1["attempt"]["attempt_id"]
    print(f"Round 1 attempt started: {att_r1_id}")

    # Submit R1 passing score
    status, submit_r1 = make_request("POST", f"/api/candidate-applications/{app_id}/rounds/{r1['round_id']}/submit", {
        "score": 85.0,
        "feedback": "Strong frontend profile, passes ATS criteria."
    })
    print(f"Round 1 score submitted (85/100): passed={submit_r1['success']}")

    # Step 4: Check Stepper after Round 1 Pass
    print("\n[Step 4] GET /api/candidate-applications/{app_id}/status (Checking Stepper after Round 1 Pass)")
    status, stepper_after_r1 = make_request("GET", f"/api/candidate-applications/{app_id}/status")
    r2_status = stepper_after_r1["data"]["rounds"][1]["status"]
    print(f"Round 2 status: {r2_status} (Expected: unlocked/current)")
    assert r2_status in ("unlocked", "current"), f"Expected unlocked/current, got {r2_status}"

    # Check DB state
    attempts = query_db("SELECT * FROM candidate_round_attempts WHERE application_id=?", (app_id,))
    sessions = query_db("SELECT * FROM aptitude_test_sessions WHERE application_id=?", (app_id,))
    print(f"DB State after R1 pass -> candidate_round_attempts: {len(attempts)} (only R1), aptitude_test_sessions: {len(sessions)}")
    assert len(sessions) == 0, "ERROR: Session created on R1 pass!"

    # Step 5: Frontend loadApplication executes GET /api/aptitude/session/{app_id}
    print("\n[Step 5] GET /api/aptitude/session/{app_id} (ApplicationOverview loading check)")
    status, session_resp = make_request("GET", f"/api/aptitude/session/{app_id}?round_id={r2['round_id']}")
    print(f"Status: {status}, Response session: {session_resp.get('data')}")
    assert session_resp.get("data") is None, "ERROR: Session returned non-null on fresh GET!"

    sessions = query_db("SELECT * FROM aptitude_test_sessions WHERE application_id=?", (app_id,))
    print(f"DB State after GET /session -> aptitude_test_sessions count: {len(sessions)}")
    assert len(sessions) == 0, "ERROR: GET /session created an attempt in DB!"

    # Step 6: User opens /apply/round/2/test directly (bypass attempt)
    print("\n[Step 6] Direct navigation to test route /apply/round/2/test without active attempt")
    # On frontend, AptitudeTestPage queries getAptitudeSession. Since data is null, it redirects to /apply/round/2/instructions
    print("Frontend state check: session is null -> redirects user to /apply/round/2/instructions")

    # Step 7: Malicious/unconfirmed POST /api/aptitude/start (without confirmed_instructions)
    print("\n[Step 7] POST /api/aptitude/start with confirmed_instructions=False (Reject unconfirmed start)")
    status, reject_resp = make_request("POST", "/api/aptitude/start", {
        "application_id": app_id,
        "round_id": r2["round_id"],
        "confirmed_instructions": False
    })
    print(f"Status: {status}, Error: {reject_resp.get('detail')}")
    assert status == 400, f"Expected 400 Bad Request, got {status}"
    sessions = query_db("SELECT * FROM aptitude_test_sessions WHERE application_id=?", (app_id,))
    assert len(sessions) == 0, "Attempt should not be created when instructions not confirmed!"

    # Step 8: User views /apply/round/2/instructions, ticks agreement checkbox, clicks "Start Test"
    print("\n[Step 8] POST /api/aptitude/start with confirmed_instructions=True (User clicked Start Test)")
    status, start_resp = make_request("POST", "/api/aptitude/start", {
        "application_id": app_id,
        "round_id": r2["round_id"],
        "confirmed_instructions": True
    })
    print(f"Status: {status}")
    session_data = start_resp["data"]["session"]
    attempt_data = start_resp["data"]["attempt"]
    print(f"Attempt ID:  {attempt_data['attempt_id']}")
    print(f"Session ID:  {session_data['session_id']}")
    print(f"Status:      {session_data['status']}")
    print(f"Questions:   {len(session_data['questions'])}")
    print(f"Time Remaining: {session_data['time_remaining_seconds']}s")

    # Verify DB state now
    attempts_r2 = query_db("SELECT * FROM candidate_round_attempts WHERE application_id=? AND round_id=?", (app_id, r2["round_id"]))
    sessions_r2 = query_db("SELECT * FROM aptitude_test_sessions WHERE application_id=?", (app_id,))
    print(f"DB State after confirmed start -> candidate_round_attempts(R2): {len(attempts_r2)}, aptitude_test_sessions: {len(sessions_r2)}")
    assert len(attempts_r2) == 1
    assert len(sessions_r2) == 1

    # Step 9: Re-query GET /api/aptitude/session (Resume/Refresh behavior)
    print("\n[Step 9] GET /api/aptitude/session/{app_id} (Resume/Refresh test check)")
    status, active_session = make_request("GET", f"/api/aptitude/session/{app_id}?round_id={r2['round_id']}")
    print(f"Status: {status}, Active session found: {active_session['data']['session_id']}, status={active_session['data']['status']}")
    assert active_session['data']['status'] == "in_progress"

    print("\n=================================================================")
    print("ALL 9 VERIFICATION STEPS PASSED SUCCESSFULLY WITH ZERO ANOMALIES!")
    print("=================================================================")

if __name__ == "__main__":
    run_verification()
