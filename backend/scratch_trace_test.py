import urllib.request, json, time, sqlite3

BASE = 'http://localhost:8001'

def check_db(app_id, step_name):
    conn = sqlite3.connect('backend/db/pipeline.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM aptitude_test_sessions WHERE application_id = ?', (app_id,))
    rows = c.fetchall()
    print(f'[{step_name}] aptitude_test_sessions count: {len(rows)}')
    if rows:
        for r in rows:
            print(f'   -> session_id={r["session_id"]}, status={r["status"]}, created_at={r["created_at"]}')
    conn.close()

def req(url, data=None):
    if data:
        r = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    else:
        r = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(r) as res:
            return res.getcode(), json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

email = f'trace_check_{int(time.time())}@example.com'
print('--- STEP 1: Creating application ---')
code, app_res = req(f'{BASE}/api/candidate-applications', {
    'candidate_email': email,
    'candidate_name': 'Trace Candidate',
    'job_role': 'Frontend Developer',
    'resume_text': 'React TypeScript frontend developer with HTML CSS JavaScript experience for 5 years' * 10
})
app_id = app_res['application']['application_id']
check_db(app_id, 'AFTER STEP 1 (create app)')

print('--- STEP 2: Getting stepper ---')
code, status_res = req(f'{BASE}/api/candidate-applications/{app_id}/status')
r1 = status_res['data']['rounds'][0]
r2 = status_res['data']['rounds'][1]
check_db(app_id, 'AFTER STEP 2 (get status)')

print('--- STEP 3: Starting Round 1 attempt ---')
code, start_r1 = req(f'{BASE}/api/candidate-applications/{app_id}/rounds/{r1["round_id"]}/start', {'is_simulated': False})
check_db(app_id, 'AFTER STEP 3 (start R1)')

print('--- STEP 4: Submitting Round 1 score ---')
code, sub_r1 = req(f'{BASE}/api/candidate-applications/{app_id}/rounds/{r1["round_id"]}/submit', {
    'score': 85.0,
    'feedback': 'Passed ATS screening',
    'details': {'matched_skills': ['React', 'TypeScript']}
})
check_db(app_id, 'AFTER STEP 4 (submit R1)')

print('--- STEP 5: Getting stepper after R1 submit ---')
code, status_res2 = req(f'{BASE}/api/candidate-applications/{app_id}/status')
check_db(app_id, 'AFTER STEP 5 (get status after R1 submit)')

print('--- STEP 6: Calling GET /api/aptitude/session ---')
code, sess_res = req(f'{BASE}/api/aptitude/session/{app_id}?round_id={r2["round_id"]}')
print('GET /api/aptitude/session returned:', sess_res['session'] is not None)
check_db(app_id, 'AFTER STEP 6 (GET /session)')
