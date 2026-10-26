"""
Database Models & Schemas for Multi-Round Hiring Pipeline

Collections:
- pipelines: Pipeline definition per job role
- pipeline_rounds: Individual round specifications within a pipeline
- candidate_applications: Candidate's progression through a job's pipeline
- candidate_round_attempts: Attempt records per round with sequential gating & attempt numbers
- round_scores: Normalized scoring interface (0-100, pass/fail, rubric details)
- pipeline_overrides: Audit log for recruiter manual promotion, retake, or rejection
"""

from datetime import datetime
from typing import Dict, List, Any, Optional
from enum import Enum


class StandardRoundType(str, Enum):
    """Standard hiring round types"""
    RESUME_SCREENING = "resume_screening"
    APTITUDE_TEST = "aptitude_test"
    CODING_ROUND = "coding_round"
    GROUP_DISCUSSION = "group_discussion"
    TECHNICAL_INTERVIEW = "technical_interview"
    HR_INTERVIEW = "hr_interview"


class RoundStatus(str, Enum):
    """Sequential gating round status"""
    LOCKED = "locked"
    UNLOCKED = "unlocked"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PASSED = "passed"
    FAILED = "failed"


class OnFailAction(str, Enum):
    """Action to take when candidate does not meet round cutoff score"""
    REJECT = "reject"  # Automatically set application status to "Not selected at Round X"
    HOLD = "hold"      # Put application "On hold" for recruiter review


class ApplicationStatus(str, Enum):
    """Candidate application pipeline state"""
    IN_PIPELINE = "in_pipeline"
    QUALIFIED = "qualified"
    NOT_SELECTED = "not_selected"
    ON_HOLD = "on_hold"


# Collection: pipelines
PIPELINES_SCHEMA = {
    "pipeline_id": str,          # Unique pipeline ID
    "job_role": str,             # e.g. "Machine Learning Engineer"
    "job_id": Optional[str],     # Reference to job_descriptions
    "title": str,                # Display title e.g. "Standard Engineering Track"
    "description": str,
    "is_active": bool,
    "total_rounds": int,
    "created_by": str,
    "created_at": datetime,
    "updated_at": datetime,
    "metadata": Dict[str, Any]
}

# Collection: pipeline_rounds
PIPELINE_ROUNDS_SCHEMA = {
    "round_id": str,             # Unique round ID
    "pipeline_id": str,          # Reference to pipelines
    "round_type": str,           # StandardRoundType
    "title": str,                # e.g. "Technical Interview (AI Live Room)"
    "description": str,
    "order": int,                # 1-based sequential order
    "duration_minutes": int,     # Time limit
    "cutoff_score": float,       # Cutoff out of 100 (Default: 60.0)
    "weight": float,             # Weight percentage in cumulative score (0-100)
    "on_fail_action": str,       # OnFailAction: "reject" or "hold"
    "is_active": bool,           # Enabled or disabled by recruiter
    "created_at": datetime,
    "updated_at": datetime,
    "metadata": Dict[str, Any]
}

# Collection: candidate_applications
CANDIDATE_APPLICATIONS_SCHEMA = {
    "application_id": str,       # Unique application ID
    "candidate_email": str,
    "candidate_name": str,
    "job_role": str,
    "pipeline_id": str,
    "current_round_order": int,  # Current active round (1-based)
    "status": str,               # ApplicationStatus: in_pipeline, qualified, not_selected, on_hold
    "status_message": str,       # Descriptive human-readable status
    "total_weighted_score": float,
    "is_simulated": bool,        # True if created in test/demo simulation
    "created_at": datetime,
    "updated_at": datetime,
    "metadata": Dict[str, Any]
}

# Collection: candidate_round_attempts
CANDIDATE_ROUND_ATTEMPTS_SCHEMA = {
    "attempt_id": str,           # Unique attempt ID
    "application_id": str,       # Reference to candidate_applications
    "candidate_email": str,
    "round_id": str,             # Reference to pipeline_rounds
    "round_type": str,
    "round_order": int,
    "attempt_number": int,       # 1-based attempt sequence
    "status": str,               # RoundStatus: locked, unlocked, in_progress, completed, passed, failed
    "score": Optional[float],    # Normalized score (0-100)
    "passed": Optional[bool],    # True if score >= cutoff or overridden
    "is_simulated": bool,        # True if interactive simulation
    "retake_allowed": bool,      # True if recruiter explicitly enabled retake
    "interview_id": Optional[str], # Reference to interviews if technical_interview
    "started_at": Optional[datetime],
    "ended_at": Optional[datetime],
    "created_at": datetime,
    "updated_at": datetime,
    "metadata": Dict[str, Any]
}

# Collection: round_scores (Normalized Scoring Interface)
ROUND_SCORES_SCHEMA = {
    "score_id": str,             # Unique score ID
    "attempt_id": str,           # Reference to candidate_round_attempts
    "application_id": str,
    "round_id": str,
    "round_type": str,
    "score": float,              # Normalized score 0-100
    "passed": bool,              # score >= cutoff
    "cutoff": float,
    "feedback": str,             # Synthesized evaluation summary
    "details": Dict[str, Any],   # Detailed rubric breakdown, questions, dimensions
    "is_simulated": bool,        # True if simulated
    "evaluated_at": datetime,
    "metadata": Dict[str, Any]
}

# Collection: pipeline_overrides (Audit Log)
PIPELINE_OVERRIDES_SCHEMA = {
    "override_id": str,
    "application_id": str,
    "round_id": str,
    "candidate_email": str,
    "action": str,               # "promote", "allow_retake", "reject"
    "reason": str,
    "overridden_by": str,        # Recruiter email or name
    "overridden_at": datetime,
    "previous_status": str,
    "new_status": str,
    "metadata": Dict[str, Any]
}


class PipelineCollections:
    """Collection name constants for pipeline system"""
    PIPELINES = "pipelines"
    PIPELINE_ROUNDS = "pipeline_rounds"
    CANDIDATE_APPLICATIONS = "candidate_applications"
    CANDIDATE_ROUND_ATTEMPTS = "candidate_round_attempts"
    ROUND_SCORES = "round_scores"
    PIPELINE_OVERRIDES = "pipeline_overrides"


# Default 6-round pipeline configuration
DEFAULT_ROUNDS_CONFIG = [
    {
        "round_type": StandardRoundType.RESUME_SCREENING.value,
        "title": "Resume Screening",
        "description": "ATS keyword and semantic role matching against job specifications",
        "order": 1,
        "duration_minutes": 15,
        "cutoff_score": 60.0,
        "borderline_margin": 10.0,
        "weight": 10.0,
        "on_fail_action": OnFailAction.REJECT.value,
        "is_active": True
    },
    {
        "round_type": StandardRoundType.APTITUDE_TEST.value,
        "title": "Aptitude Test",
        "description": "Analytical reasoning, quantitative problem solving, and logical competency",
        "order": 2,
        "duration_minutes": 30,
        "cutoff_score": 60.0,
        "weight": 15.0,
        "on_fail_action": OnFailAction.REJECT.value,
        "is_active": True
    },
    {
        "round_type": StandardRoundType.CODING_ROUND.value,
        "title": "Coding Round",
        "description": "Algorithmic challenges, data structures, and production-grade implementation",
        "order": 3,
        "duration_minutes": 45,
        "cutoff_score": 60.0,
        "weight": 25.0,
        "on_fail_action": OnFailAction.HOLD.value,
        "is_active": True
    },
    {
        "round_type": StandardRoundType.GROUP_DISCUSSION.value,
        "title": "Group Discussion",
        "description": "Peer communication, structured debate, consensus building, and clarity",
        "order": 4,
        "duration_minutes": 25,
        "cutoff_score": 60.0,
        "weight": 15.0,
        "on_fail_action": OnFailAction.HOLD.value,
        "is_active": True
    },
    {
        "round_type": StandardRoundType.TECHNICAL_INTERVIEW.value,
        "title": "Technical Interview",
        "description": "Live AI Video Interview evaluating architectural depth and real-world system design",
        "order": 5,
        "duration_minutes": 30,
        "cutoff_score": 60.0,
        "weight": 25.0,
        "on_fail_action": OnFailAction.REJECT.value,
        "is_active": True
    },
    {
        "round_type": StandardRoundType.HR_INTERVIEW.value,
        "title": "HR Interview",
        "description": "Cultural alignment, compensation expectations, work philosophy, and team fit",
        "order": 6,
        "duration_minutes": 20,
        "cutoff_score": 60.0,
        "weight": 10.0,
        "on_fail_action": OnFailAction.HOLD.value,
        "is_active": True
    }
]
