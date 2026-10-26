"""
Pipeline Repository - Database access & business logic for hiring pipelines and sequential gating
"""

import logging
import sqlite3
import json
import os
from typing import Optional, Dict, List, Tuple, Any
from datetime import datetime
import uuid

from db.mongo_client import get_collection
from db.pipeline_models import (
    PipelineCollections,
    StandardRoundType,
    RoundStatus,
    OnFailAction,
    ApplicationStatus,
    DEFAULT_ROUNDS_CONFIG
)

logger = logging.getLogger(__name__)


class PipelineRepository:
    """Repository for pipelines, rounds, applications, attempts, and sequential gating with SQLite persistence"""

    def __init__(self, db_path: Optional[str] = None):
        try:
            self.pipelines_col = get_collection(PipelineCollections.PIPELINES)
            self.rounds_col = get_collection(PipelineCollections.PIPELINE_ROUNDS)
            self.apps_col = get_collection(PipelineCollections.CANDIDATE_APPLICATIONS)
            self.attempts_col = get_collection(PipelineCollections.CANDIDATE_ROUND_ATTEMPTS)
            self.scores_col = get_collection(PipelineCollections.ROUND_SCORES)
            self.overrides_col = get_collection(PipelineCollections.PIPELINE_OVERRIDES)
        except Exception as e:
            self.pipelines_col = None
            self.rounds_col = None
            self.apps_col = None
            self.attempts_col = None
            self.scores_col = None
            self.overrides_col = None

        # In-memory storage cache
        self._in_memory_pipelines: Dict[str, Dict] = {}
        self._in_memory_rounds: Dict[str, List[Dict]] = {}
        self._in_memory_apps: Dict[str, Dict] = {}
        self._in_memory_attempts: Dict[str, Dict] = {}
        self._in_memory_scores: Dict[str, Dict] = {}
        self._in_memory_overrides: List[Dict] = []

        # Persistent SQLite storage
        self.db_path = db_path or os.getenv("PIPELINE_DB_PATH") or os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "db", "pipeline.db")
        )
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_sqlite()
        self._load_from_sqlite()

    def _init_sqlite(self):
        """Create SQLite schema if not exists"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS pipelines (
                    pipeline_id TEXT PRIMARY KEY,
                    job_role TEXT,
                    data_json TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
                """)
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS pipeline_rounds (
                    round_id TEXT PRIMARY KEY,
                    pipeline_id TEXT,
                    round_order INTEGER,
                    data_json TEXT
                )
                """)
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS candidate_applications (
                    application_id TEXT PRIMARY KEY,
                    candidate_email TEXT,
                    job_role TEXT,
                    pipeline_id TEXT,
                    data_json TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
                """)
                cursor.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_apps_email_role 
                ON candidate_applications (LOWER(candidate_email), LOWER(job_role))
                """)
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS candidate_round_attempts (
                    attempt_id TEXT PRIMARY KEY,
                    application_id TEXT,
                    round_id TEXT,
                    round_order INTEGER,
                    data_json TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
                """)
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS round_scores (
                    score_id TEXT PRIMARY KEY,
                    attempt_id TEXT,
                    application_id TEXT,
                    round_id TEXT,
                    data_json TEXT,
                    evaluated_at TEXT
                )
                """)
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS pipeline_overrides (
                    override_id TEXT PRIMARY KEY,
                    application_id TEXT,
                    round_id TEXT,
                    data_json TEXT,
                    overridden_at TEXT
                )
                """)
                conn.commit()
        except Exception as e:
            logger.error(f"Error initializing SQLite database at {self.db_path}: {e}")

    def _load_from_sqlite(self):
        """Load persistent records into in-memory mirror cache on startup"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT pipeline_id, data_json FROM pipelines")
                for pid, d_json in cursor.fetchall():
                    self._in_memory_pipelines[pid] = json.loads(d_json)

                cursor.execute("SELECT pipeline_id, data_json FROM pipeline_rounds ORDER BY round_order ASC")
                for pid, d_json in cursor.fetchall():
                    self._in_memory_rounds.setdefault(pid, []).append(json.loads(d_json))

                cursor.execute("SELECT application_id, data_json FROM candidate_applications")
                for aid, d_json in cursor.fetchall():
                    self._in_memory_apps[aid] = json.loads(d_json)

                cursor.execute("SELECT attempt_id, data_json FROM candidate_round_attempts")
                for att_id, d_json in cursor.fetchall():
                    self._in_memory_attempts[att_id] = json.loads(d_json)

                cursor.execute("SELECT score_id, data_json FROM round_scores")
                for sid, d_json in cursor.fetchall():
                    self._in_memory_scores[sid] = json.loads(d_json)

                cursor.execute("SELECT data_json FROM pipeline_overrides")
                for (d_json,) in cursor.fetchall():
                    self._in_memory_overrides.append(json.loads(d_json))
        except Exception as e:
            logger.warning(f"Error loading initial state from SQLite: {e}")

    def _save_application_to_sqlite(self, app_doc: Dict):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO candidate_applications (application_id, candidate_email, job_role, pipeline_id, data_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(application_id) DO UPDATE SET
                    data_json = excluded.data_json,
                    updated_at = excluded.updated_at
                """, (
                    app_doc["application_id"],
                    app_doc.get("candidate_email", "").lower(),
                    app_doc.get("job_role", ""),
                    app_doc.get("pipeline_id", ""),
                    json.dumps(app_doc, default=str),
                    str(app_doc.get("created_at")),
                    str(app_doc.get("updated_at"))
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving application to SQLite: {e}")

    def _save_attempt_to_sqlite(self, attempt_doc: Dict):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO candidate_round_attempts (attempt_id, application_id, round_id, round_order, data_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(attempt_id) DO UPDATE SET
                    data_json = excluded.data_json,
                    updated_at = excluded.updated_at
                """, (
                    attempt_doc["attempt_id"],
                    attempt_doc.get("application_id", ""),
                    attempt_doc.get("round_id", ""),
                    attempt_doc.get("round_order", 0),
                    json.dumps(attempt_doc, default=str),
                    str(attempt_doc.get("created_at")),
                    str(attempt_doc.get("updated_at"))
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving attempt to SQLite: {e}")

    def _save_score_to_sqlite(self, score_doc: Dict):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO round_scores (score_id, attempt_id, application_id, round_id, data_json, evaluated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(score_id) DO UPDATE SET
                    data_json = excluded.data_json
                """, (
                    score_doc["score_id"],
                    score_doc.get("attempt_id", ""),
                    score_doc.get("application_id", ""),
                    score_doc.get("round_id", ""),
                    json.dumps(score_doc, default=str),
                    str(score_doc.get("evaluated_at"))
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving score to SQLite: {e}")

    def _save_pipeline_to_sqlite(self, pipeline_doc: Dict, rounds_list: List[Dict]):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO pipelines (pipeline_id, job_role, data_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(pipeline_id) DO UPDATE SET
                    data_json = excluded.data_json,
                    updated_at = excluded.updated_at
                """, (
                    pipeline_doc["pipeline_id"],
                    pipeline_doc.get("job_role", "").lower(),
                    json.dumps(pipeline_doc, default=str),
                    str(pipeline_doc.get("created_at")),
                    str(pipeline_doc.get("updated_at"))
                ))
                for r in rounds_list:
                    cursor.execute("""
                    INSERT INTO pipeline_rounds (round_id, pipeline_id, round_order, data_json)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(round_id) DO UPDATE SET
                        data_json = excluded.data_json,
                        round_order = excluded.round_order
                    """, (
                        r["round_id"],
                        pipeline_doc["pipeline_id"],
                        r.get("order", 0),
                        json.dumps(r, default=str)
                    ))
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving pipeline to SQLite: {e}")

    def _save_override_to_sqlite(self, override_doc: Dict):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO pipeline_overrides (override_id, application_id, round_id, data_json, overridden_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(override_id) DO UPDATE SET
                    data_json = excluded.data_json
                """, (
                    override_doc["override_id"],
                    override_doc.get("application_id", ""),
                    override_doc.get("round_id", ""),
                    json.dumps(override_doc, default=str),
                    str(override_doc.get("overridden_at"))
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving override to SQLite: {e}")

    def is_mongo_available(self) -> bool:
        return self.pipelines_col is not None

    # ─────────────────────────────────────────────────────────────
    # PIPELINE CONFIGURATION
    # ─────────────────────────────────────────────────────────────

    def get_or_create_default_pipeline(self, job_role: str, use_available_only: bool = False, created_by: str = "recruiter@system.internal") -> Dict[str, Any]:
        """Fetch or create default hiring pipeline for a job role with currently available rounds"""
        role_cleaned = job_role.strip()
        pipeline = self.get_pipeline_by_role(role_cleaned)
        if pipeline:
            return pipeline

        pipeline_id = f"pipe-{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow()

        if use_available_only:
            # Currently available rounds: Resume Screening -> Technical Interview
            target_rounds_config = [
                {
                    "round_type": StandardRoundType.RESUME_SCREENING.value,
                    "title": "Resume Screening",
                    "description": "ATS keyword and semantic role matching against job specifications",
                    "order": 1,
                    "duration_minutes": 15,
                    "cutoff_score": 60.0,
                    "weight": 40.0,
                    "on_fail_action": OnFailAction.REJECT.value,
                    "is_active": True
                },
                {
                    "round_type": StandardRoundType.TECHNICAL_INTERVIEW.value,
                    "title": "Technical Interview",
                    "description": "Live AI Video Interview evaluating architectural depth and system design",
                    "order": 2,
                    "duration_minutes": 30,
                    "cutoff_score": 60.0,
                    "weight": 60.0,
                    "on_fail_action": OnFailAction.REJECT.value,
                    "is_active": True
                }
            ]
            pipeline_desc = f"Default 2-round pipeline with available rounds for {role_cleaned}"
        else:
            target_rounds_config = DEFAULT_ROUNDS_CONFIG
            pipeline_desc = f"Standard calibrated 6-round hiring pipeline for {role_cleaned}"

        pipeline_doc = {
            "pipeline_id": pipeline_id,
            "job_role": role_cleaned,
            "job_id": None,
            "title": f"{role_cleaned} Hiring Pipeline",
            "description": pipeline_desc,
            "is_active": True,
            "total_rounds": len(target_rounds_config),
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
            "metadata": {}
        }

        rounds_list = []
        for r in target_rounds_config:
            round_doc = {
                "round_id": f"rnd-{uuid.uuid4().hex[:8]}",
                "pipeline_id": pipeline_id,
                "round_type": r["round_type"],
                "title": r["title"],
                "description": r["description"],
                "order": r["order"],
                "duration_minutes": r["duration_minutes"],
                "cutoff_score": float(r["cutoff_score"]),
                "borderline_margin": float(r.get("borderline_margin", 10.0)),
                "weight": float(r["weight"]),
                "on_fail_action": r["on_fail_action"],
                "is_active": r["is_active"],
                "created_at": now,
                "updated_at": now,
                "metadata": {}
            }
            rounds_list.append(round_doc)

        if self.is_mongo_available():
            try:
                self.pipelines_col.insert_one(pipeline_doc)
                self.rounds_col.insert_many(rounds_list)
            except Exception as e:
                logger.error(f"Failed to persist default pipeline in MongoDB: {e}")

        # In-memory mirror
        self._in_memory_pipelines[pipeline_id] = pipeline_doc
        self._in_memory_rounds[pipeline_id] = rounds_list
        self._save_pipeline_to_sqlite(pipeline_doc, rounds_list)

        pipeline_doc["rounds"] = rounds_list
        return pipeline_doc

    def get_pipeline_by_role(self, job_role: str) -> Optional[Dict[str, Any]]:
        """Get pipeline with all rounds for a job role"""
        role_cleaned = job_role.strip().lower()

        # Check in-memory cache
        for pid, p in self._in_memory_pipelines.items():
            if p.get("job_role", "").lower() == role_cleaned:
                res = dict(p)
                res["rounds"] = sorted(self._in_memory_rounds.get(pid, []), key=lambda x: x["order"])
                return res

        # Check SQLite
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT pipeline_id, data_json FROM pipelines WHERE LOWER(job_role) = ?", (role_cleaned,))
                row = cursor.fetchone()
                if row:
                    pid, d_json = row
                    p = json.loads(d_json)
                    cursor.execute("SELECT data_json FROM pipeline_rounds WHERE pipeline_id = ? ORDER BY round_order ASC", (pid,))
                    rounds = [json.loads(r[0]) for r in cursor.fetchall()]
                    p["rounds"] = rounds
                    self._in_memory_pipelines[pid] = p
                    self._in_memory_rounds[pid] = rounds
                    return p
        except Exception as e:
            logger.warn(f"Error querying SQLite for pipeline: {e}")

        if self.is_mongo_available():
            try:
                # Case-insensitive search
                p = self.pipelines_col.find_one({"job_role": {"$regex": f"^{role_cleaned}$", "$options": "i"}})
                if p:
                    p.pop("_id", None)
                    rounds = list(self.rounds_col.find({"pipeline_id": p["pipeline_id"]}).sort("order", 1))
                    for r in rounds:
                        r.pop("_id", None)
                    p["rounds"] = rounds
                    return p
            except Exception as e:
                logger.warn(f"Error querying pipeline in MongoDB: {e}")

        return None

    def list_all_pipelines(self) -> List[Dict[str, Any]]:
        """List all configured hiring pipelines"""
        results = []
        if self.is_mongo_available():
            try:
                cursor = self.pipelines_col.find({})
                for p in cursor:
                    p.pop("_id", None)
                    rounds = list(self.rounds_col.find({"pipeline_id": p["pipeline_id"]}).sort("order", 1))
                    for r in rounds:
                        r.pop("_id", None)
                    p["rounds"] = rounds
                    results.append(p)
                if results:
                    return results
            except Exception as e:
                logger.warn(f"Error listing pipelines from MongoDB: {e}")

        # Fallback to memory
        for pid, p in self._in_memory_pipelines.items():
            res = dict(p)
            res["rounds"] = sorted(self._in_memory_rounds.get(pid, []), key=lambda x: x["order"])
            results.append(res)
        return results

    def update_pipeline(self, pipeline_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update pipeline metadata and round configurations"""
        now = datetime.utcnow()
        rounds_data = data.get("rounds", [])

        # Update rounds
        updated_rounds = []
        for idx, r in enumerate(rounds_data, start=1):
            round_id = r.get("round_id") or f"rnd-{uuid.uuid4().hex[:8]}"
            r_doc = {
                "round_id": round_id,
                "pipeline_id": pipeline_id,
                "round_type": r.get("round_type", StandardRoundType.TECHNICAL_INTERVIEW.value),
                "title": r.get("title", f"Round {idx}"),
                "description": r.get("description", ""),
                "order": idx,
                "duration_minutes": int(r.get("duration_minutes", 30)),
                "cutoff_score": float(r.get("cutoff_score", 60.0)),
                "borderline_margin": float(r.get("borderline_margin", 10.0)),
                "weight": float(r.get("weight", 16.6)),
                "on_fail_action": r.get("on_fail_action", OnFailAction.REJECT.value),
                "is_active": bool(r.get("is_active", True)),
                "updated_at": now
            }
            updated_rounds.append(r_doc)

            if self.is_mongo_available():
                try:
                    self.rounds_col.update_one(
                        {"round_id": round_id},
                        {"$set": r_doc},
                        upsert=True
                    )
                except Exception as e:
                    logger.error(f"Error saving round {round_id}: {e}")

        if self.is_mongo_available():
            try:
                self.pipelines_col.update_one(
                    {"pipeline_id": pipeline_id},
                    {"$set": {
                        "title": data.get("title", ""),
                        "description": data.get("description", ""),
                        "total_rounds": len(updated_rounds),
                        "updated_at": now
                    }}
                )
            except Exception as e:
                logger.error(f"Error updating pipeline in MongoDB: {e}")

        # In-memory update
        if pipeline_id in self._in_memory_pipelines:
            self._in_memory_pipelines[pipeline_id]["updated_at"] = now
            if "title" in data:
                self._in_memory_pipelines[pipeline_id]["title"] = data["title"]
        self._in_memory_rounds[pipeline_id] = updated_rounds

        return {
            "pipeline_id": pipeline_id,
            "rounds": updated_rounds
        }

    # ─────────────────────────────────────────────────────────────
    # CANDIDATE APPLICATIONS & PROGRESS STEPPER
    # ─────────────────────────────────────────────────────────────

    def get_or_create_application(
        self,
        candidate_email: str,
        candidate_name: str,
        job_role: str,
        is_simulated: bool = False,
        resume_text: Optional[str] = None,
        resume_file_path: Optional[str] = None,
        resume_file_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch or create candidate's application in the role's pipeline, storing resume metadata separately"""
        pipeline = self.get_or_create_default_pipeline(job_role)
        pipeline_id = pipeline["pipeline_id"]

        meta_update: Dict[str, Any] = {}
        if resume_text:
            meta_update["resume_text"] = resume_text
        if resume_file_path:
            meta_update["resume_file_path"] = resume_file_path
        if resume_file_name:
            meta_update["resume_file_name"] = resume_file_name

        # Check existing application by lowercase trimmed email + job_role
        email_clean = candidate_email.strip().lower()
        role_clean = job_role.strip().lower()
        if self.is_mongo_available():
            try:
                app = self.apps_col.find_one({
                    "candidate_email": email_clean,
                    "job_role": {"$regex": f"^{job_role.strip()}$", "$options": "i"}
                })
                if app:
                    app.pop("_id", None)
                    if meta_update:
                        existing_meta = app.get("metadata", {}) or {}
                        existing_meta.update(meta_update)
                        app["metadata"] = existing_meta
                        self.apps_col.update_one(
                            {"application_id": app["application_id"]},
                            {"$set": {"metadata": existing_meta, "updated_at": datetime.utcnow()}}
                        )
                    return app
            except Exception as e:
                logger.warning(f"Error looking up application in MongoDB: {e}")

        for aid, a in self._in_memory_apps.items():
            if a.get("candidate_email", "").strip().lower() == email_clean and a.get("job_role", "").strip().lower() == role_clean:
                if meta_update:
                    a.setdefault("metadata", {}).update(meta_update)
                    self._save_application_to_sqlite(a)
                return a

        # Check SQLite
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT data_json FROM candidate_applications WHERE LOWER(candidate_email) = ? AND LOWER(job_role) = ?",
                    (email_clean, role_clean)
                )
                row = cursor.fetchone()
                if row:
                    app = json.loads(row[0])
                    if meta_update:
                        app.setdefault("metadata", {}).update(meta_update)
                        self._save_application_to_sqlite(app)
                    self._in_memory_apps[app["application_id"]] = app
                    return app
        except Exception as e:
            logger.warn(f"Error querying SQLite for application by email and role: {e}")

        # Create new application
        app_id = f"app-{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow()
        app_doc = {
            "application_id": app_id,
            "candidate_email": email_clean,
            "candidate_name": candidate_name.strip(),
            "job_role": job_role.strip(),
            "pipeline_id": pipeline_id,
            "current_round_order": 1,
            "status": ApplicationStatus.IN_PIPELINE.value,
            "status_message": "Application started. Round 1 unlocked.",
            "total_weighted_score": 0.0,
            "is_simulated": is_simulated,
            "created_at": now,
            "updated_at": now,
            "metadata": meta_update
        }

        if self.is_mongo_available():
            try:
                self.apps_col.insert_one(app_doc)
            except Exception as e:
                logger.error(f"Error persisting application in MongoDB: {e}")

        self._in_memory_apps[app_id] = app_doc
        self._save_application_to_sqlite(app_doc)
        return app_doc

    def get_application(self, application_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve application by ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT data_json FROM candidate_applications WHERE application_id = ?", (application_id,))
                row = cursor.fetchone()
                if row:
                    app = json.loads(row[0])
                    self._in_memory_apps[application_id] = app
                    return app
        except Exception as e:
            logger.warn(f"Error querying SQLite for application {application_id}: {e}")

        if application_id in self._in_memory_apps:
            return self._in_memory_apps[application_id]

        return None

    def get_application_by_email(self, candidate_email: str, job_role: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Retrieve application by candidate email and optional job role"""
        email_clean = candidate_email.strip().lower()
        if self.is_mongo_available():
            try:
                query = {"candidate_email": email_clean}
                if job_role:
                    query["job_role"] = {"$regex": f"^{job_role.strip()}$", "$options": "i"}
                app = self.apps_col.find_one(query)
                if app:
                    app.pop("_id", None)
                    return app
            except Exception as e:
                logger.warn(f"Error finding application by email: {e}")

        for aid, a in self._in_memory_apps.items():
            if a.get("candidate_email", "").strip().lower() == email_clean:
                if not job_role or a.get("job_role", "").strip().lower() == job_role.strip().lower():
                    return a

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                if job_role:
                    cursor.execute(
                        "SELECT data_json FROM candidate_applications WHERE LOWER(candidate_email) = ? AND LOWER(job_role) = ?",
                        (email_clean, job_role.strip().lower())
                    )
                else:
                    cursor.execute(
                        "SELECT data_json FROM candidate_applications WHERE LOWER(candidate_email) = ?",
                        (email_clean,)
                    )
                row = cursor.fetchone()
                if row:
                    app = json.loads(row[0])
                    self._in_memory_apps[app["application_id"]] = app
                    return app
        except Exception as e:
            logger.warn(f"Error querying SQLite for application by email: {e}")

        return None

    def get_candidate_stepper_progress(self, application_id: str, is_recruiter: bool = False) -> Optional[Dict[str, Any]]:
        """
        Build complete Candidate Progress Stepper structure:
        Evaluates sequential gating for each round in order (passed, current/unlocked, locked, failed).
        Hides model name and evaluation method from candidate views (is_recruiter=False).
        """
        app = self.get_application(application_id)
        if not app:
            return None

        pipeline_id = app["pipeline_id"]
        # Fetch rounds
        rounds = []
        if self.is_mongo_available():
            try:
                cursor = self.rounds_col.find({"pipeline_id": pipeline_id}).sort("order", 1)
                for r in cursor:
                    r.pop("_id", None)
                    rounds.append(r)
            except Exception as e:
                logger.warn(f"Error fetching rounds from MongoDB: {e}")

        if not rounds:
            rounds = sorted(self._in_memory_rounds.get(pipeline_id, []), key=lambda x: x["order"])

        # Fetch candidate attempts
        attempts = self.get_attempts_for_application(application_id)
        attempts_by_round_id = {}
        for att in attempts:
            attempts_by_round_id[att["round_id"]] = att

        # Calculate sequential gating status for every round
        stepper_rounds = []
        previous_round_passed = True  # Round 1 is always unlocked initially

        for r in rounds:
            round_id = r["round_id"]
            order = r["order"]
            attempt = attempts_by_round_id.get(round_id)

            status = RoundStatus.LOCKED.value
            score_data = None
            is_simulated = False

            if attempt:
                status = attempt.get("status", RoundStatus.IN_PROGRESS.value)
                raw_details = attempt.get("details") or {}
                if not is_recruiter and raw_details:
                    # Sanitize candidate view: hide model name and show "AI-assisted screening"
                    details_copy = dict(raw_details)
                    details_copy["evaluation_method"] = "AI-assisted screening"
                    details_copy["model"] = None
                else:
                    details_copy = raw_details

                score_data = {
                    "score": attempt.get("score"),
                    "passed": attempt.get("passed"),
                    "cutoff": r.get("cutoff_score", 60.0),
                    "feedback": attempt.get("feedback"),
                    "details": details_copy,
                    "started_at": attempt.get("started_at"),
                    "ended_at": attempt.get("ended_at")
                }
                is_simulated = attempt.get("is_simulated", False)

                # Determine if previous round allowed continuation
                if attempt.get("status") == RoundStatus.PASSED.value:
                    previous_round_passed = True
                else:
                    previous_round_passed = False
            else:
                # No attempt yet
                if previous_round_passed and app.get("status") == ApplicationStatus.IN_PIPELINE.value:
                    status = RoundStatus.UNLOCKED.value
                else:
                    status = RoundStatus.LOCKED.value
                previous_round_passed = False

            stepper_rounds.append({
                "round_id": round_id,
                "order": order,
                "round_type": r["round_type"],
                "title": r["title"],
                "description": r["description"],
                "duration_minutes": r["duration_minutes"],
                "cutoff_score": r["cutoff_score"],
                "borderline_margin": r.get("borderline_margin", 10.0),
                "weight": r["weight"],
                "on_fail_action": r["on_fail_action"],
                "is_active": r["is_active"],
                "status": status,
                "score_data": score_data,
                "is_simulated": is_simulated,
                "attempt_id": attempt.get("attempt_id") if attempt else None
            })

        return {
            "application": app,
            "rounds": stepper_rounds,
            "overall_status": app.get("status"),
            "status_message": app.get("status_message"),
            "current_round_order": app.get("current_round_order", 1),
            "total_weighted_score": app.get("total_weighted_score", 0.0)
        }

    # ─────────────────────────────────────────────────────────────
    # SEQUENTIAL GATING VALIDATION (BACKEND ENFORCED)
    # ─────────────────────────────────────────────────────────────

    def validate_can_start_round(self, application_id: str, round_id: str) -> Tuple[bool, Optional[str], Optional[Dict]]:
        """
        BACKEND-ENFORCED SEQUENTIAL GATING:
        Returns:
            (can_start: bool, error_reason: Optional[str], round_doc: Optional[Dict])
        """
        app = self.get_application(application_id)
        if not app:
            return False, "Candidate application not found", None

        # If application was explicitly rejected
        if app.get("status") == ApplicationStatus.NOT_SELECTED.value:
            return False, f"Application not active: {app.get('status_message', 'Candidate not selected')}", None

        if app.get("status") == ApplicationStatus.ON_HOLD.value:
            return False, f"Application on hold: {app.get('status_message', 'Awaiting recruiter review')}", None

        # Fetch round definition
        pipeline_id = app["pipeline_id"]
        round_doc = self.get_round_by_id(pipeline_id, round_id)
        if not round_doc:
            return False, f"Round {round_id} does not exist in pipeline", None

        if not round_doc.get("is_active", True):
            return False, f"Round '{round_doc.get('title')}' is currently inactive", None

        target_order = round_doc["order"]

        # Check existing attempts for this round
        existing_attempt = self.get_attempt_for_round(application_id, round_id)
        if existing_attempt:
            # If already passed or failed without retake
            att_status = existing_attempt.get("status")
            if att_status in [RoundStatus.PASSED.value, RoundStatus.COMPLETED.value]:
                return False, f"Round {target_order} ({round_doc.get('title')}) already completed with score {existing_attempt.get('score', 0)}/100.", round_doc

            if att_status == RoundStatus.FAILED.value and not existing_attempt.get("retake_allowed", False):
                return False, f"Round {target_order} did not meet cutoff and retakes are locked. Recruiter override required.", round_doc

            if att_status == RoundStatus.IN_PROGRESS.value:
                # Candidate can resume in-progress attempt
                return True, None, round_doc

        # If Round 1: always allowed to start first
        if target_order == 1:
            return True, None, round_doc

        # If Round N (N > 1): ENFORCE PREVIOUS ROUND PASSED
        prev_round = self.get_round_by_order(pipeline_id, target_order - 1)
        if not prev_round:
            return False, f"Preceding round {target_order - 1} configuration not found", None

        prev_attempt = self.get_attempt_for_round(application_id, prev_round["round_id"])
        if not prev_attempt or prev_attempt.get("status") != RoundStatus.PASSED.value:
            return (
                False,
                f"Sequential Gating Violation: Round {target_order - 1} ('{prev_round.get('title')}') must be PASSED before starting Round {target_order} ('{round_doc.get('title')}').",
                round_doc
            )

        return True, None, round_doc

    def start_round_attempt(
        self,
        application_id: str,
        round_id: str,
        is_simulated: bool = False,
        interview_id: Optional[str] = None
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Start or resume an attempt for a round after verifying sequential gating
        """
        # Idempotent check: if already passed or completed, return existing attempt
        existing = self.get_attempt_for_round(application_id, round_id)
        if existing and existing.get("status") in [RoundStatus.PASSED.value, RoundStatus.COMPLETED.value]:
            return True, existing, None

        can_start, reason, round_doc = self.validate_can_start_round(application_id, round_id)
        if not can_start:
            return False, None, reason

        logger.info(f"[BACKEND TRACE - PipelineRepo.start_round_attempt] Starting attempt for app={application_id}, round={round_id}, round_order={round_doc.get('order') if round_doc else None}")

        app = self.get_application(application_id)
        now = datetime.utcnow()

        if existing:
            # If retake allowed or resuming
            attempt_number = existing.get("attempt_number", 1)
            if existing.get("status") == RoundStatus.FAILED.value and existing.get("retake_allowed"):
                attempt_number += 1

            update_data = {
                "status": RoundStatus.IN_PROGRESS.value,
                "attempt_number": attempt_number,
                "retake_allowed": False,
                "is_simulated": is_simulated,
                "started_at": existing.get("started_at") or now,
                "updated_at": now
            }
            if interview_id:
                update_data["interview_id"] = interview_id

            if self.is_mongo_available():
                try:
                    self.attempts_col.update_one(
                        {"attempt_id": existing["attempt_id"]},
                        {"$set": update_data}
                    )
                except Exception as e:
                    logger.error(f"Error updating attempt in MongoDB: {e}")

            existing.update(update_data)
            self._save_attempt_to_sqlite(existing)
            return True, existing, None

        # Create brand-new attempt
        attempt_id = f"att-{uuid.uuid4().hex[:8]}"
        attempt_doc = {
            "attempt_id": attempt_id,
            "application_id": application_id,
            "candidate_email": app["candidate_email"],
            "round_id": round_id,
            "round_type": round_doc["round_type"],
            "round_order": round_doc["order"],
            "attempt_number": 1,
            "status": RoundStatus.IN_PROGRESS.value,
            "score": None,
            "passed": None,
            "is_simulated": is_simulated,
            "retake_allowed": False,
            "interview_id": interview_id,
            "started_at": now,
            "ended_at": None,
            "created_at": now,
            "updated_at": now,
            "metadata": {}
        }

        if self.is_mongo_available():
            try:
                self.attempts_col.insert_one(attempt_doc)
            except Exception as e:
                logger.error(f"Error inserting attempt in MongoDB: {e}")

        self._in_memory_attempts[attempt_id] = attempt_doc
        self._save_attempt_to_sqlite(attempt_doc)
        return True, attempt_doc, None

    # ─────────────────────────────────────────────────────────────
    # NORMALIZED SCORING INTERFACE (0-100, pass/fail, feedback)
    # ─────────────────────────────────────────────────────────────

    def submit_normalized_score(
        self,
        attempt_id: str,
        score: float,
        feedback: str,
        details: Optional[Dict[str, Any]] = None,
        is_simulated: bool = False,
        allow_simulated_pass: bool = True
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Record normalized round score { score: 0-100, passed: bool, feedback, details }
        and evaluate sequential gating cutoff.
        """
        attempt = self.get_attempt_by_id(attempt_id)
        if not attempt:
            return False, None, f"Attempt {attempt_id} not found"

        application_id = attempt["application_id"]
        app = self.get_application(application_id)
        if not app:
            return False, None, "Application not found"

        round_doc = self.get_round_by_id(app["pipeline_id"], attempt["round_id"])
        if not round_doc:
            return False, None, "Round configuration not found"

        cutoff = float(round_doc.get("cutoff_score", 60.0))
        normalized_score = max(0.0, min(100.0, float(score)))

        # Idempotent check: if already passed with a recorded score, return current result
        if attempt.get("status") == RoundStatus.PASSED.value and attempt.get("score") is not None:
            return True, {
                "score": attempt.get("score"),
                "passed": True,
                "cutoff": cutoff,
                "feedback": attempt.get("feedback") or feedback or "Round previously passed",
                "details": attempt.get("details") or details or {},
                "attempt_status": RoundStatus.PASSED.value,
                "application_status": app.get("status"),
                "status_message": app.get("status_message"),
                "is_simulated": attempt.get("is_simulated", False)
            }, None

        # Determine pass status
        meets_cutoff = normalized_score >= cutoff

        # Simulation policy: if simulated and not allowed to pass real pipelines, flag accordingly
        if is_simulated and not allow_simulated_pass:
            passed = False
            sim_notice = " [SIMULATED: Passed threshold but real promotion disabled by system config]"
            feedback += sim_notice
        else:
            passed = meets_cutoff

        now = datetime.utcnow()
        score_id = f"scr-{uuid.uuid4().hex[:8]}"

        score_doc = {
            "score_id": score_id,
            "attempt_id": attempt_id,
            "application_id": application_id,
            "round_id": attempt["round_id"],
            "round_type": attempt["round_type"],
            "score": round(normalized_score, 1),
            "passed": passed,
            "cutoff": cutoff,
            "feedback": feedback,
            "details": details or {},
            "is_simulated": is_simulated,
            "evaluated_at": now,
            "metadata": {}
        }

        # Update attempt
        attempt_status = RoundStatus.PASSED.value if passed else RoundStatus.FAILED.value
        attempt_update = {
            "status": attempt_status,
            "score": round(normalized_score, 1),
            "passed": passed,
            "feedback": feedback,
            "details": details or {},
            "is_simulated": is_simulated,
            "ended_at": now,
            "updated_at": now
        }

        # Update application state
        round_order = round_doc["order"]
        app_update: Dict[str, Any] = {"updated_at": now}

        if passed:
            # Unlock next round
            next_round = self.get_round_by_order(app["pipeline_id"], round_order + 1)
            if next_round:
                app_update["current_round_order"] = max(app.get("current_round_order", 1), round_order + 1)
                app_update["status"] = ApplicationStatus.IN_PIPELINE.value
                app_update["status_message"] = f"Passed Round {round_order} ({round_doc.get('title')}). Round {round_order + 1} unlocked."
            else:
                # All rounds finished!
                app_update["status"] = ApplicationStatus.QUALIFIED.value
                app_update["status_message"] = "Congratulations! All pipeline rounds completed successfully."
        else:
            # Failed cutoff
            borderline_margin = float(round_doc.get("borderline_margin", 10.0))
            is_borderline = (cutoff - borderline_margin) <= normalized_score < cutoff
            on_fail_action = round_doc.get("on_fail_action", OnFailAction.REJECT.value)

            if is_borderline or on_fail_action == OnFailAction.HOLD.value:
                app_update["status"] = ApplicationStatus.ON_HOLD.value
                app_update["status_message"] = "Your application is under review"
                attempt_update["status"] = "on_hold"
            else:
                app_update["status"] = ApplicationStatus.NOT_SELECTED.value
                app_update["status_message"] = f"Not selected for the next round. Score: {normalized_score}/100 (Cutoff: {cutoff})."

        # Update in Mongo or Memory
        if self.is_mongo_available():
            try:
                self.scores_col.insert_one(score_doc)
                self.attempts_col.update_one({"attempt_id": attempt_id}, {"$set": attempt_update})
                self.apps_col.update_one({"application_id": application_id}, {"$set": app_update})
            except Exception as e:
                logger.error(f"Error persisting score in MongoDB: {e}")

        self._in_memory_scores[score_id] = score_doc
        attempt.update(attempt_update)
        app.update(app_update)
        self._save_score_to_sqlite(score_doc)
        self._save_attempt_to_sqlite(attempt)
        self._save_application_to_sqlite(app)

        return True, {
            "score": normalized_score,
            "passed": passed,
            "cutoff": cutoff,
            "feedback": feedback,
            "details": details or {},
            "attempt_status": attempt_status,
            "application_status": app.get("status"),
            "status_message": app.get("status_message"),
            "is_simulated": is_simulated
        }, None

    # ─────────────────────────────────────────────────────────────
    # RECRUITER OVERRIDE (Promote, Allow Retake, Reject)
    # ─────────────────────────────────────────────────────────────

    def apply_recruiter_override(
        self,
        application_id: str,
        round_id: str,
        action: str,
        reason: str,
        recruiter_name: str = "Alex Morgan"
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Recruiter manual override:
        - promote: Force-passes current round and unlocks next round
        - allow_retake: Resets round attempt status to unlocked allowing a new attempt
        - reject: Manually marks application as not selected
        """
        app = self.get_application(application_id)
        if not app:
            return False, None, "Application not found"

        round_doc = self.get_round_by_id(app["pipeline_id"], round_id)
        if not round_doc:
            return False, None, "Round not found"

        now = datetime.utcnow()
        override_id = f"ovr-{uuid.uuid4().hex[:8]}"
        prev_status = app.get("status", ApplicationStatus.IN_PIPELINE.value)
        round_order = round_doc["order"]

        attempt = self.get_attempt_for_round(application_id, round_id)

        if action == "promote":
            # Force pass the round
            if attempt:
                self.attempts_col.update_one(
                    {"attempt_id": attempt["attempt_id"]},
                    {"$set": {"status": RoundStatus.PASSED.value, "passed": True, "updated_at": now}}
                ) if self.is_mongo_available() else attempt.update({"status": RoundStatus.PASSED.value, "passed": True})

            next_round = self.get_round_by_order(app["pipeline_id"], round_order + 1)
            new_status = ApplicationStatus.IN_PIPELINE.value if next_round else ApplicationStatus.QUALIFIED.value
            status_msg = f"Promoted by recruiter ({recruiter_name}): {reason}. Next round unlocked."

            app_update = {
                "status": new_status,
                "current_round_order": round_order + 1 if next_round else round_order,
                "status_message": status_msg,
                "updated_at": now
            }

        elif action == "allow_retake":
            # Reset attempt so candidate can re-enter
            if attempt:
                self.attempts_col.update_one(
                    {"attempt_id": attempt["attempt_id"]},
                    {"$set": {"status": RoundStatus.UNLOCKED.value, "retake_allowed": True, "updated_at": now}}
                ) if self.is_mongo_available() else attempt.update({"status": RoundStatus.UNLOCKED.value, "retake_allowed": True})

            new_status = ApplicationStatus.IN_PIPELINE.value
            status_msg = f"Retake authorized by recruiter ({recruiter_name}): {reason}."
            app_update = {
                "status": new_status,
                "status_message": status_msg,
                "updated_at": now
            }

        elif action == "reject":
            new_status = ApplicationStatus.NOT_SELECTED.value
            status_msg = f"Candidate rejected by recruiter ({recruiter_name}): {reason}."
            app_update = {
                "status": new_status,
                "status_message": status_msg,
                "updated_at": now
            }
        else:
            return False, None, f"Unsupported override action: {action}"

        # Record override audit entry
        override_doc = {
            "override_id": override_id,
            "application_id": application_id,
            "round_id": round_id,
            "candidate_email": app["candidate_email"],
            "action": action,
            "reason": reason,
            "overridden_by": recruiter_name,
            "overridden_at": now,
            "previous_status": prev_status,
            "new_status": new_status,
            "metadata": {}
        }

        if self.is_mongo_available():
            try:
                self.overrides_col.insert_one(override_doc)
                self.apps_col.update_one({"application_id": application_id}, {"$set": app_update})
            except Exception as e:
                logger.error(f"Error persisting override: {e}")

        self._in_memory_overrides.append(override_doc)
        app.update(app_update)
        if attempt:
            self._save_attempt_to_sqlite(attempt)
        self._save_application_to_sqlite(app)
        self._save_override_to_sqlite(override_doc)

        return True, {
            "override_id": override_id,
            "action": action,
            "new_status": new_status,
            "status_message": status_msg,
            "overridden_by": recruiter_name,
            "overridden_at": now.isoformat()
        }, None

    # ─────────────────────────────────────────────────────────────
    # INTERNAL QUERY HELPERS
    # ─────────────────────────────────────────────────────────────

    def get_round_by_id(self, pipeline_id: str, round_id: str) -> Optional[Dict[str, Any]]:
        if self.is_mongo_available():
            try:
                r = self.rounds_col.find_one({"round_id": round_id, "pipeline_id": pipeline_id})
                if r:
                    r.pop("_id", None)
                    return r
            except Exception as e:
                logger.warn(f"Error finding round {round_id}: {e}")

        rounds = self._in_memory_rounds.get(pipeline_id, [])
        for r in rounds:
            if r["round_id"] == round_id:
                return r

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT data_json FROM pipeline_rounds WHERE round_id = ?", (round_id,))
                row = cursor.fetchone()
                if row:
                    return json.loads(row[0])
        except Exception as e:
            logger.warn(f"Error querying SQLite for round {round_id}: {e}")

        return None

    def get_round_by_order(self, pipeline_id: str, order: int) -> Optional[Dict[str, Any]]:
        if self.is_mongo_available():
            try:
                r = self.rounds_col.find_one({"pipeline_id": pipeline_id, "order": order})
                if r:
                    r.pop("_id", None)
                    return r
            except Exception as e:
                logger.warn(f"Error finding round order {order}: {e}")

        rounds = self._in_memory_rounds.get(pipeline_id, [])
        for r in rounds:
            if r["order"] == order:
                return r

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT data_json FROM pipeline_rounds WHERE pipeline_id = ? AND round_order = ?",
                    (pipeline_id, order)
                )
                row = cursor.fetchone()
                if row:
                    return json.loads(row[0])
        except Exception as e:
            logger.warn(f"Error querying SQLite for round order {order}: {e}")

    def get_round_by_type(self, pipeline_id: str, round_type: str) -> Optional[Dict[str, Any]]:
        rounds = self._in_memory_rounds.get(pipeline_id, [])
        for r in rounds:
            if r.get("round_type") == round_type:
                return r

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT data_json FROM pipeline_rounds WHERE pipeline_id = ?", (pipeline_id,))
                rows = cursor.fetchall()
                for row in rows:
                    r = json.loads(row[0])
                    if r.get("round_type") == round_type:
                        return r
        except Exception as e:
            logger.warning(f"Error querying SQLite for round type {round_type}: {e}")

        return None

    def get_attempts_for_application(self, application_id: str) -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT data_json FROM candidate_round_attempts WHERE application_id = ? ORDER BY round_order ASC",
                    (application_id,)
                )
                rows = cursor.fetchall()
                if rows:
                    res = []
                    for (d_json,) in rows:
                        att = json.loads(d_json)
                        self._in_memory_attempts[att["attempt_id"]] = att
                        res.append(att)
                    return res
        except Exception as e:
            logger.warn(f"Error querying SQLite for attempts: {e}")

        mem = [a for a in self._in_memory_attempts.values() if a.get("application_id") == application_id]
        if mem:
            return sorted(mem, key=lambda x: x.get("round_order", 0))

        return []

    def get_attempt_for_round(self, application_id: str, round_id: str) -> Optional[Dict[str, Any]]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT data_json FROM candidate_round_attempts WHERE application_id = ? AND round_id = ? ORDER BY created_at DESC LIMIT 1",
                    (application_id, round_id)
                )
                row = cursor.fetchone()
                if row:
                    att = json.loads(row[0])
                    self._in_memory_attempts[att["attempt_id"]] = att
                    return att
        except Exception as e:
            logger.warn(f"Error querying SQLite for attempt: {e}")

        for a in self._in_memory_attempts.values():
            if a.get("application_id") == application_id and a.get("round_id") == round_id:
                return a

        return None

    def get_attempt_by_id(self, attempt_id: str) -> Optional[Dict[str, Any]]:
        if self.is_mongo_available():
            try:
                a = self.attempts_col.find_one({"attempt_id": attempt_id})
                if a:
                    a.pop("_id", None)
                    return a
            except Exception as e:
                logger.warn(f"Error finding attempt: {e}")

        if attempt_id in self._in_memory_attempts:
            return self._in_memory_attempts[attempt_id]

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT data_json FROM candidate_round_attempts WHERE attempt_id = ?", (attempt_id,))
                row = cursor.fetchone()
                if row:
                    att = json.loads(row[0])
                    self._in_memory_attempts[attempt_id] = att
                    return att
        except Exception as e:
            logger.warn(f"Error querying SQLite for attempt: {e}")

        return None
