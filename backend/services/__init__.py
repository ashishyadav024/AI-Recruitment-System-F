"""
Service Layer - Business Logic Layer

This package contains service classes that use repositories
to implement business logic for each feature.
"""

__all__ = []

def _safe_import():
    services = [
        ('user_service', 'UserService'),
        ('resume_service', 'ResumeService'),
        ('job_service', 'JobService'),
        ('analysis_service', 'AnalysisService'),
        ('candidate_service', 'CandidateService'),
        ('interview_service', 'InterviewService'),
        ('email_service', 'EmailService'),
        ('qa_service', 'QAService'),
        ('firebase_auth_service', 'FirebaseAuthService'),
    ]
    for mod_name, cls_name in services:
        try:
            mod = __import__(f"services.{mod_name}", fromlist=[cls_name])
            globals()[cls_name] = getattr(mod, cls_name)
            __all__.append(cls_name)
        except Exception:
            pass

_safe_import()
