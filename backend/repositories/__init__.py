"""
Repository Layer - Data Access Layer for MongoDB

This package contains repository classes for each feature/functionality.
Repositories handle all database operations for their respective domains.
"""

try:
    from .user_repository import UserRepository
except ImportError:
    UserRepository = None

try:
    from .resume_repository import ResumeRepository
    from .job_repository import JobRepository
    from .candidate_repository import CandidateRepository
    from .analysis_repository import AnalysisRepository
    from .interview_repository import InterviewRepository
    from .email_repository import EmailRepository
    from .qa_repository import QARepository
except ImportError:
    ResumeRepository = None
    JobRepository = None
    CandidateRepository = None
    AnalysisRepository = None
    InterviewRepository = None
    EmailRepository = None
    QARepository = None

from .pipeline_repository import PipelineRepository

__all__ = [
    'UserRepository',
    'ResumeRepository',
    'JobRepository',
    'CandidateRepository',
    'AnalysisRepository',
    'InterviewRepository',
    'EmailRepository',
    'QARepository',
    'PipelineRepository'
]

