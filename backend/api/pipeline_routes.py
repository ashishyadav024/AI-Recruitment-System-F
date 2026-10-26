"""
FastAPI Routes for Hiring Pipelines, Sequential Gating, Normalized Scoring & Stepper Progress
"""

import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from repositories.pipeline_repository import PipelineRepository
from services.ats_service import ATSService, RoleRequirementsManager

logger = logging.getLogger(__name__)

pipeline_router = APIRouter(prefix="/api", tags=["Pipelines & Sequential Gating"])
repo = PipelineRepository()
ats_service = ATSService()


# ─────────────────────────────────────────────────────────────
# Pydantic Request Models
# ─────────────────────────────────────────────────────────────

class RoundConfigInput(BaseModel):
    round_id: Optional[str] = None
    round_type: str
    title: str
    description: Optional[str] = ""
    order: int
    duration_minutes: int = 30
    cutoff_score: float = 60.0
    weight: float = 16.6
    on_fail_action: str = "reject"  # "reject" or "hold"
    is_active: bool = True


class PipelineUpdateInput(BaseModel):
    pipeline_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    rounds: List[RoundConfigInput]


class CreateApplicationInput(BaseModel):
    candidate_email: str
    candidate_name: str
    job_role: str
    is_simulated: bool = False
    resume_text: Optional[str] = None
    resume_file_path: Optional[str] = None
    resume_file_name: Optional[str] = None


class StartRoundInput(BaseModel):
    is_simulated: bool = False
    interview_id: Optional[str] = None


class NormalizedScoreInput(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0, description="Normalized score 0-100")
    feedback: str = ""
    details: Optional[Dict[str, Any]] = None
    is_simulated: bool = False
    allow_simulated_pass: bool = True


class RecruiterOverrideInput(BaseModel):
    round_id: str
    action: str  # "promote", "allow_retake", "reject"
    reason: str
    recruiter_name: str = "Alex Morgan"


class RestoreApplicationInput(BaseModel):
    candidate_email: str
    job_role: Optional[str] = None


class ScreenResumeInput(BaseModel):
    job_role: Optional[str] = None
    allow_keyword_fallback: bool = False


class RoleRequirementsInput(BaseModel):
    job_description: Optional[str] = ""
    must_have_skills: List[str]
    nice_to_have_skills: List[str]
    experience_expectations: Optional[str] = ""


# ─────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────

@pipeline_router.get("/pipelines")
async def list_pipelines():
    """List all configured hiring pipelines"""
    return {
        "success": True,
        "pipelines": repo.list_all_pipelines()
    }


@pipeline_router.get("/pipelines/{job_role}")
async def get_pipeline_by_role(job_role: str):
    """Get or auto-initialize standard 6-round hiring pipeline for a job role"""
    pipeline = repo.get_or_create_default_pipeline(job_role)
    return {
        "success": True,
        "pipeline": pipeline
    }


@pipeline_router.post("/pipelines")
async def update_pipeline(payload: PipelineUpdateInput):
    """Save recruiter modifications to pipeline round order, cutoffs, durations, and weights"""
    res = repo.update_pipeline(payload.pipeline_id, payload.dict())
    if not res:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return {
        "success": True,
        "message": "Pipeline configuration updated successfully",
        "data": res
    }


@pipeline_router.post("/candidate-applications")
async def create_candidate_application(payload: CreateApplicationInput):
    """Initialize or fetch candidate application tracking in a job role's pipeline"""
    app = repo.get_or_create_application(
        candidate_email=payload.candidate_email,
        candidate_name=payload.candidate_name,
        job_role=payload.job_role,
        is_simulated=payload.is_simulated,
        resume_text=payload.resume_text,
        resume_file_path=payload.resume_file_path,
        resume_file_name=payload.resume_file_name
    )
    return {
        "success": True,
        "application": app
    }


@pipeline_router.post("/candidate-applications/restore")
async def restore_application(payload: RestoreApplicationInput):
    """Restore candidate application tracking by email and optional role"""
    app = repo.get_application_by_email(payload.candidate_email, payload.job_role)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No application found for {payload.candidate_email}"
        )
    stepper = repo.get_candidate_stepper_progress(app["application_id"])
    return {
        "success": True,
        "application": app,
        "data": stepper
    }


@pipeline_router.get("/candidate-applications/{application_id}/status")
async def get_candidate_stepper_status(application_id: str):
    """
    Candidate Progress Stepper Data:
    Returns the full sequential progression of rounds with statuses:
    passed, current/unlocked, locked, failed.
    """
    stepper = repo.get_candidate_stepper_progress(application_id)
    if not stepper:
        raise HTTPException(status_code=404, detail="Candidate application not found")
    return {
        "success": True,
        "data": stepper
    }


@pipeline_router.get("/candidate-applications/{application_id}/rounds/{round_id}/validate")
async def validate_round(application_id: str, round_id: str):
    """
    Validate whether the candidate is permitted to start a specific round.
    Checks sequential gating rules without creating an attempt.
    """
    app = repo.get_application(application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate application not found"
        )
    can_start, reason, round_doc = repo.validate_can_start_round(application_id, round_id)
    return {
        "success": True,
        "can_start": can_start,
        "reason": reason,
        "round": round_doc
    }


@pipeline_router.post("/candidate-applications/{application_id}/rounds/{round_id}/start")
async def start_round(application_id: str, round_id: str, payload: StartRoundInput):
    """
    BACKEND-ENFORCED SEQUENTIAL GATING:
    Verifies on the server that the candidate has PASSED the previous round.
    Returns HTTP 403 Forbidden if attempting to bypass rounds or start a locked round.
    """
    app = repo.get_application(application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate application not found"
        )

    can_start, reason, round_doc = repo.validate_can_start_round(application_id, round_id)
    if not can_start:
        logger.warning(f"🚫 Gating violation: {reason} (App: {application_id}, Round: {round_id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=reason or "Sequential gating violation: Previous round must be passed first."
        )


    ok, attempt, err = repo.start_round_attempt(
        application_id=application_id,
        round_id=round_id,
        is_simulated=payload.is_simulated,
        interview_id=payload.interview_id
    )

    if not ok:
        raise HTTPException(status_code=400, detail=err or "Could not start round attempt")

    return {
        "success": True,
        "message": f"Round '{round_doc.get('title')}' started successfully",
        "attempt": attempt,
        "round": round_doc
    }


@pipeline_router.post("/candidate-applications/{application_id}/rounds/{round_id}/submit")
async def submit_round_score(application_id: str, round_id: str, payload: NormalizedScoreInput):
    """
    Submit normalized score (0-100) for a round attempt.
    Automatically evaluates cutoff threshold and unlocks next round if passed.
    """
    # Guard: Prevent client-side score submission for Round 1 (Resume Screening)
    app = repo.get_application(application_id)
    if app:
        pipeline = repo.get_pipeline_by_role(app.get("job_role", ""))
        if pipeline:
            round_doc = next((r for r in pipeline.get("rounds", []) if r.get("round_id") == round_id), None)
            if round_doc and (round_doc.get("order") == 1 or round_doc.get("round_type") == "resume_screening"):
                logger.warning(f"🚫 Blocked client-side score submission for Round 1 (App: {application_id})")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Client-side score submission for Round 1 (Resume Screening) is prohibited. Resume evaluation must be performed server-side via POST /api/applications/{application_id}/screen"
                )

    attempt = repo.get_attempt_for_round(application_id, round_id)
    if not attempt:
        # Auto-create attempt if not already started
        ok_start, new_attempt, err_start = repo.start_round_attempt(
            application_id=application_id,
            round_id=round_id,
            is_simulated=payload.is_simulated
        )
        if not ok_start or not new_attempt:
            raise HTTPException(status_code=400, detail=err_start or "No active attempt found and could not start round.")
        attempt = new_attempt

    ok, result, err = repo.submit_normalized_score(
        attempt_id=attempt["attempt_id"],
        score=payload.score,
        feedback=payload.feedback,
        details=payload.details,
        is_simulated=payload.is_simulated,
        allow_simulated_pass=payload.allow_simulated_pass
    )

    if not ok:
        raise HTTPException(status_code=400, detail=err or "Failed to record round score")

    # Fetch updated stepper progression
    stepper = repo.get_candidate_stepper_progress(application_id)

    return {
        "success": True,
        "result": result,
        "data": stepper
    }


@pipeline_router.post("/candidate-applications/{application_id}/override")
async def recruiter_override(application_id: str, payload: RecruiterOverrideInput):
    """
    Recruiter manual action:
    - promote: Force-pass round and unlock next
    - allow_retake: Reset round so candidate can retake
    - reject: Manually terminate application
    """
    ok, result, err = repo.apply_recruiter_override(
        application_id=application_id,
        round_id=payload.round_id,
        action=payload.action,
        reason=payload.reason,
        recruiter_name=payload.recruiter_name
    )

    if not ok:
        raise HTTPException(status_code=400, detail=err or "Failed to apply override")

    return {
        "success": True,
        "message": f"Override '{payload.action}' executed successfully",
        "override": result
    }


# ─────────────────────────────────────────────────────────────
# Step B: LLM Resume Screening & Role Requirements Endpoints
# ─────────────────────────────────────────────────────────────

@pipeline_router.post("/applications/{application_id}/screen")
async def screen_candidate_resume(application_id: str, payload: Optional[ScreenResumeInput] = None):
    """
    POST /api/applications/{application_id}/screen
    Evaluates candidate stored resume text and role strictly on the server using LLM analysis.
    Verifies evidence quotes, flags prompt injection, redacts PII, and deterministically computes score.
    """
    job_role = payload.job_role if payload else None
    allow_keyword = payload.allow_keyword_fallback if payload else False

    try:
        res = ats_service.screen_application(
            application_id=application_id,
            target_role=job_role,
            allow_keyword_fallback=allow_keyword
        )
        return {
            "success": True,
            **res
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error during ATS resume screening for {application_id}: {e}")
        raise HTTPException(status_code=500, detail=f"ATS screening error: {str(e)}")


@pipeline_router.post("/candidate-applications/{application_id}/screen")
async def screen_candidate_resume_alias(application_id: str, payload: Optional[ScreenResumeInput] = None):
    """Alias for candidate application resume screening"""
    return await screen_candidate_resume(application_id, payload)


@pipeline_router.get("/role-requirements")
async def list_role_requirements():
    """List all role descriptions and requirements configured"""
    return {
        "success": True,
        "requirements": ats_service.req_manager.list_all_requirements()
    }


@pipeline_router.get("/role-requirements/{job_role}")
async def get_role_requirements(job_role: str):
    """Get or auto-generate role requirements for a job role"""
    reqs = ats_service.req_manager.get_requirements(job_role, ats_service.llm_client)
    return {
        "success": True,
        "requirements": reqs
    }


@pipeline_router.post("/role-requirements/{job_role}")
async def save_role_requirements(job_role: str, payload: RoleRequirementsInput):
    """Save recruiter customized job description, must-haves, and nice-to-haves"""
    saved = ats_service.req_manager.save_requirements(
        job_role=job_role,
        job_description=payload.job_description or "",
        must_have_skills=payload.must_have_skills,
        nice_to_have_skills=payload.nice_to_have_skills,
        experience_expectations=payload.experience_expectations or ""
    )
    return {
        "success": True,
        "message": f"Requirements updated for '{job_role}'",
        "requirements": saved
    }
