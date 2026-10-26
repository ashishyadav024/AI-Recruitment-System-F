"""
FastAPI Routes for Aptitude Test Round
Endpoints for Candidate Assessment, Timer Synchronization, Autosaving,
Anti-Cheat Tab Switch Logging, and Recruiter Pipeline Calibration.
"""

import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from services.aptitude_service import AptitudeService

logger = logging.getLogger(__name__)

aptitude_router = APIRouter(prefix="/api/aptitude", tags=["Round 2 - Aptitude Test"])
service = AptitudeService()


# ─────────────────────────────────────────────────────────────
# Pydantic Request Models
# ─────────────────────────────────────────────────────────────

class StartAptitudeInput(BaseModel):
    application_id: str
    round_id: Optional[str] = None
    allow_retake: bool = False
    confirmed_instructions: bool = False


class AutosaveAnswerInput(BaseModel):
    application_id: str
    question_id: str
    selected_option: Optional[str] = None


class ToggleReviewInput(BaseModel):
    application_id: str
    question_id: str


class TabSwitchInput(BaseModel):
    application_id: str


class SubmitAptitudeInput(BaseModel):
    application_id: str
    round_id: Optional[str] = None


class AptitudeConfigInput(BaseModel):
    config_id: Optional[str] = None
    job_role: str = "default"
    quant_count: int = Field(5, ge=1, le=15)
    logic_count: int = Field(5, ge=1, le=15)
    verbal_count: int = Field(5, ge=1, le=15)
    difficulty_mix: str = "balanced"
    duration_minutes: int = Field(30, ge=5, le=120)
    cutoff_score: float = Field(60.0, ge=10.0, le=95.0)
    negative_marking: bool = False
    negative_penalty: float = Field(0.25, ge=0.0, le=1.0)
    tab_switch_limit: int = Field(3, ge=1, le=20)


# ─────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────

@aptitude_router.get("/questions/stats")
async def get_questions_stats():
    """Get total questions count and distribution across sections and difficulties"""
    return {
        "success": True,
        "data": service.get_all_questions_count()
    }


@aptitude_router.get("/config")
async def get_aptitude_config(job_role: str = Query("default")):
    """Get recruiter configuration for aptitude round"""
    cfg = service.get_config(job_role)
    return {
        "success": True,
        "config": cfg
    }


@aptitude_router.post("/config")
async def update_aptitude_config(payload: AptitudeConfigInput):
    """Save recruiter configuration updates for aptitude round"""
    saved = service.update_config(payload.dict())
    return {
        "success": True,
        "message": "Aptitude configuration saved successfully",
        "config": saved
    }


@aptitude_router.post("/start")
async def start_aptitude_test(payload: StartAptitudeInput):
    """
    Start or resume aptitude test.
    BACKEND GATING: Enforces Round 1 is passed before starting Round 2.
    Returns HTTP 403 Forbidden if candidate has not passed Round 1.
    """
    logger.info(f"[BACKEND TRACE] POST /api/aptitude/start called for app={payload.application_id}, round={payload.round_id}, confirmed_instructions={payload.confirmed_instructions}")
    ok, session_data, err = service.start_test_session(
        application_id=payload.application_id,
        round_id=payload.round_id,
        allow_retake=payload.allow_retake,
        confirmed_instructions=payload.confirmed_instructions
    )

    if not ok:
        if err and "not passed" in err.lower() or "violation" in err.lower() or "locked" in err.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=err
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err or "Unable to start aptitude test session"
        )

    return {
        "success": True,
        "session": session_data
    }


@aptitude_router.get("/session/{application_id}")
async def get_test_session(application_id: str, round_id: Optional[str] = None):
    """
    Get current test session status and server-side timer.
    READ-ONLY: Does NOT create an attempt or start a timer if none exists.
    BACKEND GATING: Enforces Round 1 is passed.
    """
    logger.info(f"[BACKEND TRACE] GET /api/aptitude/session/{application_id} called (round_id={round_id})")
    ok, session_data, err = service.get_test_session(
        application_id=application_id,
        round_id=round_id
    )
    logger.info(f"[BACKEND TRACE] service.get_test_session returned: ok={ok}, has_session={session_data is not None}")

    if not ok:
        if err and ("not passed" in err.lower() or "violation" in err.lower() or "locked" in err.lower()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=err
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err or "Could not retrieve test session"
        )

    return {
        "success": True,
        "session": session_data
    }


@aptitude_router.post("/answer")
async def autosave_answer(payload: AutosaveAnswerInput):
    """
    Autosave candidate answer.
    BACKEND GATING: Enforces Round 1 is passed.
    """
    ok, result, err = service.autosave_answer(
        application_id=payload.application_id,
        question_id=payload.question_id,
        selected_option=payload.selected_option
    )

    if not ok:
        if err and ("not passed" in err.lower() or "violation" in err.lower()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=err
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err or "Failed to autosave answer"
        )

    return {
        "success": True,
        "data": result
    }


@aptitude_router.post("/review")
async def toggle_mark_for_review(payload: ToggleReviewInput):
    """Toggle question flagged for review"""
    ok, result, err = service.toggle_mark_for_review(
        application_id=payload.application_id,
        question_id=payload.question_id
    )

    if not ok:
        if err and ("not passed" in err.lower() or "violation" in err.lower()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=err
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err or "Failed to update review flag")

    return {
        "success": True,
        "data": result
    }


@aptitude_router.post("/tab-switch")
async def log_tab_switch(payload: TabSwitchInput):
    """Log tab switch count during test"""
    ok, result, err = service.log_tab_switch(application_id=payload.application_id)

    if not ok:
        if err and ("not passed" in err.lower() or "violation" in err.lower()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=err
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err or "Failed to log tab switch")

    return {
        "success": True,
        "data": result
    }


@aptitude_router.post("/submit")
async def submit_aptitude_test(payload: SubmitAptitudeInput):
    """
    Grade and submit aptitude test.
    - Compares score against cutoff
    - Updates sequential pipeline gating (unlocks Round 3 on pass)
    - Returns full section breakdown
    """
    ok, result, err = service.submit_test(
        application_id=payload.application_id,
        round_id=payload.round_id,
        is_auto_submit=False
    )

    if not ok:
        if err and ("not passed" in err.lower() or "violation" in err.lower()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=err
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err or "Failed to submit aptitude test"
        )

    return {
        "success": True,
        "result": result
    }


@aptitude_router.get("/recruiter/candidate/{application_id}")
async def get_recruiter_candidate_audit(application_id: str):
    """Recruiter inspection: detailed score, breakdown, time taken, tab switches, and answers audit"""
    audit = service.get_recruiter_candidate_audit(application_id)
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No aptitude assessment records found for this candidate"
        )

    return {
        "success": True,
        "audit": audit
    }
