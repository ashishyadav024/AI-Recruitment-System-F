"""
Automated Verification for ATS Automatic Round & Sequential Flow
"""
import sys
import os
from pathlib import Path
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import repositories.pipeline_repository as pr
from db.pipeline_models import RoundStatus, ApplicationStatus, OnFailAction

def test_ats_flow():
    print("=" * 70)
    print("Testing ATS Automatic Resume Screening Flow & Sequential Gating")
    print("=" * 70)

    repo = pr.PipelineRepository()

    # 1. Pipeline initialization
    role = "Frontend Developer"
    pipeline = repo.get_or_create_default_pipeline(role)
    assert pipeline is not None
    assert len(pipeline["rounds"]) == 6
    round1 = pipeline["rounds"][0]
    round2 = pipeline["rounds"][1]
    assert round1["round_type"] == "resume_screening"
    assert round2["round_type"] == "aptitude_test"
    print("✓ Pipeline initialized with Round 1 (Resume Screening) & Round 2 (Aptitude Test)")

    # 2. Application creation with extracted resume text
    resume_text = (
        "Senior Frontend Engineer with 5+ years of experience specializing in React, "
        "TypeScript, HTML5, CSS3, Tailwind CSS, and responsive UI design. Led frontend architecture "
        "for cloud analytics platform utilizing Redux Toolkit and Zustand for complex state management. "
        "Implemented component libraries and design systems in collaboration with UX designers using Figma. "
        "Extensive experience with web performance optimization, reducing Core Web Vitals LCP by 40%. "
        "Wrote comprehensive unit and integration tests using Vitest, Jest, and React Testing Library. "
        "Proficient with modern build tools including Vite, Webpack, npm, Git, and automated CI/CD pipelines."
    )
    email = "devika.test@techstudio.dev"
    name = "Devika Sharma"
    app = repo.get_or_create_application(
        candidate_email=email,
        candidate_name=name,
        job_role=role,
        resume_text=resume_text
    )
    app_id = app["application_id"]
    print(f"✓ Application created: {app_id}")

    # 3. Verify server-side gating: Cannot start Round 2 before Round 1
    can_start, reason, _ = repo.validate_can_start_round(app_id, round2["round_id"])
    assert not can_start
    print(f"✓ Server gating verified: Direct start of Round 2 blocked ('{reason}')")

    # 4. Simulate automatic ATS match pass (score 88% >= cutoff 60%)
    ok, attempt, _ = repo.start_round_attempt(app_id, round1["round_id"], is_simulated=False)
    assert ok
    att_id = attempt["attempt_id"]

    matched_skills = [
        "React", "JavaScript / TypeScript", "HTML5 & Modern CSS",
        "State Management", "UI / UX & Design Systems", "Testing & QA", "Modern Build Tools"
    ]
    missing_skills = ["Web Performance & CWV"]

    ok, score_doc, _ = repo.submit_normalized_score(
        attempt_id=att_id,
        score=88.0,
        feedback="ATS match score: 88%. Met 60% cutoff.",
        details={
            "round_type": "resume_screening",
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "match_score": 88.0,
            "cutoff": 60.0
        },
        is_simulated=False,
        allow_simulated_pass=True
    )
    assert ok
    print("✓ ATS normalized score recorded (88% >= 60%)")

    # 5. Verify Round 2 is unlocked
    stepper = repo.get_candidate_stepper_progress(app_id)
    r1_stepper = stepper["rounds"][0]
    r2_stepper = stepper["rounds"][1]
    assert r1_stepper["status"] == RoundStatus.PASSED.value
    assert r2_stepper["status"] == RoundStatus.UNLOCKED.value
    assert stepper["overall_status"] == ApplicationStatus.IN_PIPELINE.value
    print("✓ Round 1 is PASSED and Round 2 is UNLOCKED!")

    # 6. Verify candidate CAN now start Round 2
    can_start_r2, _, _ = repo.validate_can_start_round(app_id, round2["round_id"])
    assert can_start_r2
    print("✓ Candidate can now start Round 2 (Aptitude Test)")

    # 7. Test failure flow (score < cutoff with on_fail_action == 'reject')
    fail_email = "failing.candidate@techstudio.dev"
    fail_app = repo.get_or_create_application(
        candidate_email=fail_email,
        candidate_name="Alex LowScore",
        job_role=role,
        resume_text="Unrelated experience..."
    )
    fail_app_id = fail_app["application_id"]
    _, fail_att, _ = repo.start_round_attempt(fail_app_id, round1["round_id"], is_simulated=False)
    repo.submit_normalized_score(
        attempt_id=fail_att["attempt_id"],
        score=35.0,
        feedback="ATS score 35% below cutoff 60%",
        details={"matched_skills": [], "missing_skills": ["React", "TypeScript"]},
        is_simulated=False
    )
    fail_stepper = repo.get_candidate_stepper_progress(fail_app_id)
    assert fail_stepper["rounds"][0]["status"] == RoundStatus.FAILED.value
    assert fail_stepper["rounds"][1]["status"] == RoundStatus.LOCKED.value
    assert fail_stepper["overall_status"] == ApplicationStatus.NOT_SELECTED.value
    print("✓ Failure flow verified: Round 1 FAILED, Round 2 remains LOCKED, status is NOT_SELECTED")

    print("\n✓ ALL ATS AUTOMATIC ROUND & GATING TESTS PASSED!")

if __name__ == "__main__":
    test_ats_flow()
