"""
Aptitude Test Service
Manages question bank seeding, session creation, question randomization & option shuffling,
server-side timer enforcement, autosaving, tab switch logging, negative marking,
and normalized score evaluation integrated with sequential pipeline gating.
"""

import json
import logging
import os
import random
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from repositories.pipeline_repository import PipelineRepository

logger = logging.getLogger(__name__)

SEED_FILE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "data", "aptitude_questions.json")
)


class AptitudeService:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.getenv("PIPELINE_DB_PATH") or os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "db", "pipeline.db")
        )
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.pipeline_repo = PipelineRepository(db_path=self.db_path)
        self._init_sqlite()
        self._seed_questions_if_needed()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_sqlite(self):
        """Create tables for aptitude questions, configurations, and test sessions"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS aptitude_questions (
                    question_id TEXT PRIMARY KEY,
                    section TEXT NOT NULL,
                    difficulty TEXT NOT NULL,
                    question_text TEXT NOT NULL,
                    options_json TEXT NOT NULL,
                    correct_answer TEXT NOT NULL,
                    explanation TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS aptitude_configs (
                    config_id TEXT PRIMARY KEY,
                    job_role TEXT DEFAULT 'default',
                    quant_count INTEGER DEFAULT 5,
                    logic_count INTEGER DEFAULT 5,
                    verbal_count INTEGER DEFAULT 5,
                    difficulty_mix TEXT DEFAULT 'balanced',
                    duration_minutes INTEGER DEFAULT 30,
                    cutoff_score REAL DEFAULT 60.0,
                    negative_marking INTEGER DEFAULT 0,
                    negative_penalty REAL DEFAULT 0.25,
                    tab_switch_limit INTEGER DEFAULT 3,
                    updated_at TEXT NOT NULL
                )
                """)

                cursor.execute("""
                CREATE TABLE IF NOT EXISTS aptitude_test_sessions (
                    session_id TEXT PRIMARY KEY,
                    application_id TEXT NOT NULL,
                    round_id TEXT NOT NULL,
                    attempt_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    ends_at TEXT NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    negative_marking INTEGER DEFAULT 0,
                    negative_penalty REAL DEFAULT 0.25,
                    tab_switches INTEGER DEFAULT 0,
                    selected_questions_json TEXT NOT NULL,
                    question_keys_json TEXT NOT NULL,
                    answers_json TEXT NOT NULL,
                    marked_review_json TEXT NOT NULL,
                    result_json TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """)
                conn.commit()
        except Exception as e:
            logger.error(f"Error initializing Aptitude SQLite tables: {e}")

    def _seed_questions_if_needed(self):
        """Load 45+ questions from seed file if database table is empty or has fewer questions"""
        try:
            if not os.path.exists(SEED_FILE_PATH):
                logger.warning(f"Aptitude seed file not found at {SEED_FILE_PATH}")
                return

            with open(SEED_FILE_PATH, "r", encoding="utf-8") as f:
                questions = json.load(f)

            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) as count FROM aptitude_questions")
                row = cursor.fetchone()
                existing_count = row["count"] if row else 0

                if existing_count < len(questions):
                    logger.info(f"Seeding {len(questions)} aptitude questions into SQLite...")
                    now_str = datetime.now(timezone.utc).isoformat()
                    for q in questions:
                        cursor.execute("""
                        INSERT INTO aptitude_questions (
                            question_id, section, difficulty, question_text,
                            options_json, correct_answer, explanation, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(question_id) DO UPDATE SET
                            section=excluded.section,
                            difficulty=excluded.difficulty,
                            question_text=excluded.question_text,
                            options_json=excluded.options_json,
                            correct_answer=excluded.correct_answer,
                            explanation=excluded.explanation
                        """, (
                            q["question_id"],
                            q["section"],
                            q["difficulty"],
                            q["question_text"],
                            json.dumps(q["options"]),
                            q["correct_answer"],
                            q["explanation"],
                            now_str
                        ))
                    conn.commit()
                    logger.info("Aptitude question bank seeded successfully.")
        except Exception as e:
            logger.error(f"Error seeding aptitude questions: {e}")

    def get_all_questions_count(self) -> Dict[str, Any]:
        """Return total questions and breakdown by section and difficulty"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT section, difficulty, COUNT(*) as cnt FROM aptitude_questions GROUP BY section, difficulty")
            rows = cursor.fetchall()
            breakdown: Dict[str, Dict[str, int]] = {}
            total = 0
            for r in rows:
                sec = r["section"]
                diff = r["difficulty"]
                cnt = r["cnt"]
                breakdown.setdefault(sec, {})[diff] = cnt
                total += cnt
            return {"total_questions": total, "breakdown": breakdown}

    def get_config(self, job_role: str = "default") -> Dict[str, Any]:
        """Fetch recruiter configuration for aptitude round"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM aptitude_configs WHERE job_role = ?", (job_role,))
            row = cursor.fetchone()
            if not row and job_role != "default":
                cursor.execute("SELECT * FROM aptitude_configs WHERE job_role = 'default'")
                row = cursor.fetchone()

            if row:
                return {
                    "config_id": row["config_id"],
                    "job_role": row["job_role"],
                    "quant_count": row["quant_count"],
                    "logic_count": row["logic_count"],
                    "verbal_count": row["verbal_count"],
                    "total_questions": row["quant_count"] + row["logic_count"] + row["verbal_count"],
                    "difficulty_mix": row["difficulty_mix"],
                    "duration_minutes": row["duration_minutes"],
                    "cutoff_score": row["cutoff_score"],
                    "negative_marking": bool(row["negative_marking"]),
                    "negative_penalty": row["negative_penalty"],
                    "tab_switch_limit": row["tab_switch_limit"],
                    "updated_at": row["updated_at"]
                }

        # Default configuration if not yet saved
        return {
            "config_id": "cfg-default",
            "job_role": job_role,
            "quant_count": 5,
            "logic_count": 5,
            "verbal_count": 5,
            "total_questions": 15,
            "difficulty_mix": "balanced",
            "duration_minutes": 30,
            "cutoff_score": 60.0,
            "negative_marking": False,
            "negative_penalty": 0.25,
            "tab_switch_limit": 3,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

    def update_config(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save or update recruiter aptitude settings"""
        job_role = config_data.get("job_role", "default")
        quant = max(1, min(15, int(config_data.get("quant_count", 5))))
        logic = max(1, min(15, int(config_data.get("logic_count", 5))))
        verbal = max(1, min(15, int(config_data.get("verbal_count", 5))))
        duration = max(5, min(120, int(config_data.get("duration_minutes", 30))))
        cutoff = max(10.0, min(95.0, float(config_data.get("cutoff_score", 60.0))))
        neg_mark = 1 if config_data.get("negative_marking") else 0
        neg_penalty = max(0.0, min(1.0, float(config_data.get("negative_penalty", 0.25))))
        tab_limit = max(1, min(20, int(config_data.get("tab_switch_limit", 3))))
        diff_mix = str(config_data.get("difficulty_mix", "balanced"))
        now_str = datetime.now(timezone.utc).isoformat()
        cfg_id = config_data.get("config_id") or f"cfg-{job_role.lower().replace(' ', '-')}"

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO aptitude_configs (
                config_id, job_role, quant_count, logic_count, verbal_count,
                difficulty_mix, duration_minutes, cutoff_score, negative_marking,
                negative_penalty, tab_switch_limit, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(config_id) DO UPDATE SET
                quant_count=excluded.quant_count,
                logic_count=excluded.logic_count,
                verbal_count=excluded.verbal_count,
                difficulty_mix=excluded.difficulty_mix,
                duration_minutes=excluded.duration_minutes,
                cutoff_score=excluded.cutoff_score,
                negative_marking=excluded.negative_marking,
                negative_penalty=excluded.negative_penalty,
                tab_switch_limit=excluded.tab_switch_limit,
                updated_at=excluded.updated_at
            """, (
                cfg_id, job_role, quant, logic, verbal,
                diff_mix, duration, cutoff, neg_mark,
                neg_penalty, tab_limit, now_str
            ))
            conn.commit()

        return self.get_config(job_role)

    def _verify_round1_passed(self, application_id: str, round_id: Optional[str] = None) -> Tuple[bool, Optional[str], Optional[Dict]]:
        """
        GATING SECURITY CHECK:
        Verifies on backend that candidate's Round 1 (Resume Screening) is passed
        and candidate is authorized to access Round 2.
        """
        app = self.pipeline_repo.get_application(application_id)
        if not app:
            return False, "Candidate application not found", None

        # Discover round_id for aptitude test if not supplied
        pipeline_id = app.get("pipeline_id")
        target_round = None
        if round_id:
            target_round = self.pipeline_repo.get_round_by_id(pipeline_id, round_id)
        if not target_round:
            target_round = self.pipeline_repo.get_round_by_type(pipeline_id, "aptitude_test")

        if not target_round:
            return False, "Aptitude round configuration not found for pipeline", None

        can_start, reason, round_doc = self.pipeline_repo.validate_can_start_round(
            application_id, target_round["round_id"]
        )
        if not can_start:
            # If an aptitude session already exists, candidate already passed gating and is reading their test/result
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT session_id FROM aptitude_test_sessions WHERE application_id = ? AND round_id = ? LIMIT 1",
                    (application_id, target_round["round_id"]),
                )
                if cursor.fetchone():
                    return True, None, target_round

            return False, reason or "Sequential gating violation: Round 1 (Resume Screening) must be passed before Round 2.", target_round

        return True, None, target_round

    def get_test_session(
        self, application_id: str, round_id: Optional[str] = None
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Get current test session status and server-side timer.
        READ-ONLY & IDEMPOTENT:
        - Verifies Round 1 passed.
        - If active session exists, calculates remaining server timer.
        - If timer expired, auto-submits on server and returns completed result.
        - If no session exists yet, returns (True, None, None) WITHOUT creating an attempt or starting a timer.
        """
        ok_gating, gate_err, round_doc = self._verify_round1_passed(application_id, round_id)
        if not ok_gating or not round_doc:
            return False, None, gate_err or "Sequential gating check failed"

        actual_round_id = round_doc["round_id"]

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM aptitude_test_sessions WHERE application_id = ? AND round_id = ? ORDER BY created_at DESC LIMIT 1",
                (application_id, actual_round_id),
            )
            existing_row = cursor.fetchone()

        if not existing_row:
            logger.info(f"[BACKEND TRACE - AptitudeService.get_test_session] No session row in DB for app {application_id}. Returning (True, None, None).")
            return True, None, None

        logger.info(f"[BACKEND TRACE - AptitudeService.get_test_session] Found existing session row in DB for app {application_id}: status={existing_row['status']}")

        now = datetime.now(timezone.utc)
        sess = dict(existing_row)
        sess["answers"] = json.loads(sess["answers_json"])
        sess["marked_review"] = json.loads(sess["marked_review_json"])
        sess["selected_questions"] = json.loads(sess["selected_questions_json"])
        if sess.get("result_json"):
            sess["result"] = json.loads(sess["result_json"])

        ends_at = datetime.fromisoformat(sess["ends_at"])
        remaining_seconds = max(0, int((ends_at - now).total_seconds()))
        sess["remaining_seconds"] = remaining_seconds

        # If already completed
        if sess["status"] == "completed":
            return True, self._sanitize_candidate_session(sess), None

        # If in progress but time has expired
        if remaining_seconds <= 0:
            logger.info(f"Session {sess['session_id']} timer expired on GET. Auto-submitting...")
            ok_sub, result, sub_err = self.submit_test(
                application_id=application_id,
                round_id=actual_round_id,
                is_auto_submit=True
            )
            if ok_sub and result:
                sess["status"] = "completed"
                sess["result"] = result
                sess["remaining_seconds"] = 0
                return True, self._sanitize_candidate_session(sess), None

        return True, self._sanitize_candidate_session(sess), None

    def get_or_create_test_session(
        self, application_id: str, round_id: Optional[str] = None, allow_retake: bool = False, confirmed_instructions: bool = True
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Backwards compatibility alias for start_test_session"""
        return self.start_test_session(application_id, round_id, allow_retake, confirmed_instructions)

    def start_test_session(
        self,
        application_id: str,
        round_id: Optional[str] = None,
        allow_retake: bool = False,
        confirmed_instructions: bool = False
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Start or resume candidate aptitude test session.
        - Verifies Round 1 passed (returns False, None, error if not).
        - If active session exists, resumes same questions and calculates remaining server timer.
        - If creating a fresh session, confirmed_instructions must be True.
        - Shuffles options on start and stores them so refreshes remain identical.
        - NEVER sends correct answers or explanations to the candidate.
        """
        # 1. Gating verification
        ok_gating, gate_err, round_doc = self._verify_round1_passed(application_id, round_id)
        if not ok_gating or not round_doc:
            return False, None, gate_err or "Sequential gating check failed"

        actual_round_id = round_doc["round_id"]

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM aptitude_test_sessions WHERE application_id = ? AND round_id = ? ORDER BY created_at DESC LIMIT 1",
                (application_id, actual_round_id),
            )
            existing_row = cursor.fetchone()

        now = datetime.now(timezone.utc)

        # 2. Check if existing session exists
        if existing_row:
            sess = dict(existing_row)
            sess["answers"] = json.loads(sess["answers_json"])
            sess["marked_review"] = json.loads(sess["marked_review_json"])
            sess["selected_questions"] = json.loads(sess["selected_questions_json"])
            if sess.get("result_json"):
                sess["result"] = json.loads(sess["result_json"])

            ends_at = datetime.fromisoformat(sess["ends_at"])
            remaining_seconds = max(0, int((ends_at - now).total_seconds()))
            sess["remaining_seconds"] = remaining_seconds

            # If already completed and retake is not explicitly authorized
            if sess["status"] == "completed":
                if not allow_retake:
                    # Return completed session
                    return True, self._sanitize_candidate_session(sess), None
                # If retake allowed, fall through to create new attempt

            # If in progress but time has expired
            elif remaining_seconds <= 0:
                logger.info(f"Session {sess['session_id']} timer expired on resume. Auto-submitting...")
                ok_sub, result, sub_err = self.submit_test(
                    application_id=application_id,
                    round_id=actual_round_id,
                    is_auto_submit=True
                )
                if ok_sub and result:
                    sess["status"] = "completed"
                    sess["result"] = result
                    sess["remaining_seconds"] = 0
                    return True, self._sanitize_candidate_session(sess), None

            # Active session resumed
            return True, self._sanitize_candidate_session(sess), None

        # 3. Create fresh session - Requires explicit instructions confirmation
        if not confirmed_instructions:
            logger.warning(f"[BACKEND GATING] Blocked start_test_session for app {application_id}: instructions not confirmed.")
            return False, None, "Instructions confirmation required to initialize test attempt (confirmed_instructions=true required)"

        # Ensure attempt is recorded in pipeline repository
        logger.info(f"[BACKEND TRACE - AptitudeService.start_test_session] Creating fresh Round 2 attempt for app {application_id}")
        ok_start, attempt, err_start = self.pipeline_repo.start_round_attempt(
            application_id=application_id,
            round_id=actual_round_id,
            is_simulated=False
        )
        logger.info(f"[BACKEND TRACE - AptitudeService.start_test_session] Attempt created: {attempt.get('attempt_id') if attempt else None}")
        if not ok_start or not attempt:
            # Check if attempt already exists
            existing_att = self.pipeline_repo.get_attempt_for_round(application_id, actual_round_id)
            if existing_att:
                attempt = existing_att
            else:
                return False, None, err_start or "Failed to start round attempt in pipeline repository"

        # Load recruiter settings for round
        app = self.pipeline_repo.get_application(application_id)
        job_role = app.get("job_role", "default") if app else "default"
        config = self.get_config(job_role)

        # Duration in minutes
        duration_mins = int(round_doc.get("duration_minutes", config.get("duration_minutes", 30)))

        # Question selection
        quant_cnt = config.get("quant_count", 5)
        logic_cnt = config.get("logic_count", 5)
        verbal_cnt = config.get("verbal_count", 5)

        selected_questions, question_keys = self._select_questions_for_attempt(
            quant_count=quant_cnt,
            logic_count=logic_cnt,
            verbal_count=verbal_cnt,
            difficulty_mix=config.get("difficulty_mix", "balanced")
        )

        session_id = f"apt-sess-{uuid.uuid4().hex[:10]}"
        started_at = now
        ends_at = started_at + timedelta(minutes=duration_mins)

        session_record = {
            "session_id": session_id,
            "application_id": application_id,
            "round_id": actual_round_id,
            "attempt_id": attempt["attempt_id"],
            "status": "in_progress",
            "started_at": started_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "duration_minutes": duration_mins,
            "negative_marking": 1 if config.get("negative_marking") else 0,
            "negative_penalty": float(config.get("negative_penalty", 0.25)),
            "tab_switches": 0,
            "selected_questions_json": json.dumps(selected_questions),
            "question_keys_json": json.dumps(question_keys),
            "answers_json": json.dumps({}),
            "marked_review_json": json.dumps([]),
            "result_json": None,
            "created_at": started_at.isoformat(),
            "updated_at": started_at.isoformat()
        }

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO aptitude_test_sessions (
                session_id, application_id, round_id, attempt_id, status,
                started_at, ends_at, duration_minutes, negative_marking,
                negative_penalty, tab_switches, selected_questions_json,
                question_keys_json, answers_json, marked_review_json,
                result_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session_record["session_id"],
                session_record["application_id"],
                session_record["round_id"],
                session_record["attempt_id"],
                session_record["status"],
                session_record["started_at"],
                session_record["ends_at"],
                session_record["duration_minutes"],
                session_record["negative_marking"],
                session_record["negative_penalty"],
                session_record["tab_switches"],
                session_record["selected_questions_json"],
                session_record["question_keys_json"],
                session_record["answers_json"],
                session_record["marked_review_json"],
                session_record["result_json"],
                session_record["created_at"],
                session_record["updated_at"]
            ))
            conn.commit()

        session_record["answers"] = {}
        session_record["marked_review"] = []
        session_record["selected_questions"] = selected_questions
        session_record["remaining_seconds"] = duration_mins * 60

        return True, self._sanitize_candidate_session(session_record), None

    def _select_questions_for_attempt(
        self, quant_count: int, logic_count: int, verbal_count: int, difficulty_mix: str = "balanced"
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
        """
        Randomly select required number of questions per section,
        shuffle option orders, and return:
        1. sanitized question list (no correct answer, no explanation)
        2. question key dictionary for backend-only grading
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM aptitude_questions")
            rows = cursor.fetchall()

        all_by_section: Dict[str, List[Dict[str, Any]]] = {
            "Quantitative Aptitude": [],
            "Logical Reasoning": [],
            "Verbal Ability": []
        }

        for r in rows:
            q_dict = {
                "question_id": r["question_id"],
                "section": r["section"],
                "difficulty": r["difficulty"],
                "question_text": r["question_text"],
                "options": json.loads(r["options_json"]),
                "correct_answer": r["correct_answer"],
                "explanation": r["explanation"]
            }
            if q_dict["section"] in all_by_section:
                all_by_section[q_dict["section"]].append(q_dict)

        counts = {
            "Quantitative Aptitude": quant_count,
            "Logical Reasoning": logic_count,
            "Verbal Ability": verbal_count
        }

        selected_candidates: List[Dict[str, Any]] = []
        question_keys: Dict[str, Dict[str, Any]] = {}

        for section_name, target_count in counts.items():
            pool = all_by_section.get(section_name, [])
            if not pool:
                continue

            # Shuffle candidates in pool
            random.shuffle(pool)
            chosen = pool[:target_count]

            for item in chosen:
                # Store key for server-side grading
                question_keys[item["question_id"]] = {
                    "question_id": item["question_id"],
                    "section": item["section"],
                    "difficulty": item["difficulty"],
                    "correct_answer": item["correct_answer"],
                    "explanation": item["explanation"],
                    "question_text": item["question_text"]
                }

                # Shuffle options for candidate presentation
                shuffled_opts = list(item["options"])
                random.shuffle(shuffled_opts)

                # Public sanitized question representation
                selected_candidates.append({
                    "question_id": item["question_id"],
                    "section": item["section"],
                    "difficulty": item["difficulty"],
                    "question_text": item["question_text"],
                    "options": shuffled_opts
                })

        return selected_candidates, question_keys

    def _sanitize_candidate_session(self, sess: Dict[str, Any]) -> Dict[str, Any]:
        """Strip sensitive answer keys from candidate payload"""
        return {
            "session_id": sess.get("session_id"),
            "application_id": sess.get("application_id"),
            "round_id": sess.get("round_id"),
            "attempt_id": sess.get("attempt_id"),
            "status": sess.get("status"),
            "started_at": sess.get("started_at"),
            "ends_at": sess.get("ends_at"),
            "duration_minutes": sess.get("duration_minutes"),
            "remaining_seconds": sess.get("remaining_seconds", 0),
            "negative_marking": bool(sess.get("negative_marking")),
            "negative_penalty": sess.get("negative_penalty", 0.25),
            "tab_switches": sess.get("tab_switches", 0),
            "selected_questions": sess.get("selected_questions", []),
            "answers": sess.get("answers", {}),
            "marked_review": sess.get("marked_review", []),
            "result": sess.get("result")
        }

    def autosave_answer(
        self, application_id: str, question_id: str, selected_option: Optional[str]
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Autosave single answer selection during test attempt"""
        ok_gating, gate_err, _ = self._verify_round1_passed(application_id)
        if not ok_gating:
            return False, None, gate_err

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM aptitude_test_sessions WHERE application_id = ? AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1",
                (application_id,)
            )
            row = cursor.fetchone()
            if not row:
                return False, None, "No active test session in progress"

            sess = dict(row)
            ends_at = datetime.fromisoformat(sess["ends_at"])
            now = datetime.now(timezone.utc)
            remaining_seconds = max(0, int((ends_at - now).total_seconds()))

            if remaining_seconds <= 0:
                logger.info(f"Auto-saving on expired session {sess['session_id']}. Auto-submitting...")
                ok_sub, result, _ = self.submit_test(application_id, is_auto_submit=True)
                return True, {"expired": True, "result": result, "remaining_seconds": 0}, None

            answers = json.loads(sess["answers_json"])
            if selected_option is None:
                answers.pop(question_id, None)
            else:
                answers[question_id] = selected_option

            now_str = now.isoformat()
            cursor.execute(
                "UPDATE aptitude_test_sessions SET answers_json = ?, updated_at = ? WHERE session_id = ?",
                (json.dumps(answers), now_str, sess["session_id"])
            )
            conn.commit()

        return True, {
            "saved": True,
            "question_id": question_id,
            "selected_option": selected_option,
            "total_answered": len(answers),
            "remaining_seconds": remaining_seconds
        }, None

    def toggle_mark_for_review(
        self, application_id: str, question_id: str
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Add or remove question from review list"""
        ok_gating, gate_err, _ = self._verify_round1_passed(application_id)
        if not ok_gating:
            return False, None, gate_err

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM aptitude_test_sessions WHERE application_id = ? AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1",
                (application_id,)
            )
            row = cursor.fetchone()
            if not row:
                return False, None, "No active test session"

            sess = dict(row)
            marked = json.loads(sess["marked_review_json"])
            if question_id in marked:
                marked.remove(question_id)
                is_marked = False
            else:
                marked.append(question_id)
                is_marked = True

            now_str = datetime.now(timezone.utc).isoformat()
            cursor.execute(
                "UPDATE aptitude_test_sessions SET marked_review_json = ?, updated_at = ? WHERE session_id = ?",
                (json.dumps(marked), now_str, sess["session_id"])
            )
            conn.commit()

        return True, {"question_id": question_id, "is_marked": is_marked, "marked_review": marked}, None

    def log_tab_switch(self, application_id: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Log a non-invasive tab switch warning event"""
        ok_gating, gate_err, _ = self._verify_round1_passed(application_id)
        if not ok_gating:
            return False, None, gate_err

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM aptitude_test_sessions WHERE application_id = ? AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1",
                (application_id,)
            )
            row = cursor.fetchone()
            if not row:
                return False, None, "No active test session"

            sess = dict(row)
            tab_switches = sess["tab_switches"] + 1
            now_str = datetime.now(timezone.utc).isoformat()
            cursor.execute(
                "UPDATE aptitude_test_sessions SET tab_switches = ?, updated_at = ? WHERE session_id = ?",
                (tab_switches, now_str, sess["session_id"])
            )
            conn.commit()

        # Recruiter threshold check
        app = self.pipeline_repo.get_application(application_id)
        job_role = app.get("job_role", "default") if app else "default"
        cfg = self.get_config(job_role)
        limit = cfg.get("tab_switch_limit", 3)

        return True, {
            "tab_switches": tab_switches,
            "tab_switch_limit": limit,
            "warning": tab_switches >= limit,
            "message": f"Tab switch detected (#{tab_switches}). Please keep your focus on the test window."
        }, None

    def submit_test(
        self, application_id: str, round_id: Optional[str] = None, is_auto_submit: bool = False
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Grade completed test session:
        - Calculates section-wise and overall scores (0-100).
        - Applies negative marking penalty if enabled.
        - Compares against round cutoff.
        - Submits normalized score to pipeline_repo to unlock Round 3 on pass.
        - Marks session as completed and persists details in SQLite.
        """
        ok_gating, gate_err, round_doc = self._verify_round1_passed(application_id, round_id)
        if not ok_gating or not round_doc:
            return False, None, gate_err or "Sequential gating check failed"

        actual_round_id = round_doc["round_id"]

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM aptitude_test_sessions WHERE application_id = ? AND round_id = ? ORDER BY created_at DESC LIMIT 1",
                (application_id, actual_round_id)
            )
            row = cursor.fetchone()
            if not row:
                return False, None, "No aptitude test session found for this application"

            sess = dict(row)

        # If already completed, return existing graded result
        if sess["status"] == "completed" and sess.get("result_json"):
            return True, json.loads(sess["result_json"]), None

        question_keys = json.loads(sess["question_keys_json"])
        answers = json.loads(sess["answers_json"])
        selected_questions = json.loads(sess["selected_questions_json"])

        negative_marking_enabled = bool(sess["negative_marking"])
        penalty = float(sess.get("negative_penalty", 0.25))

        # Evaluation metrics
        total_questions = len(selected_questions)
        correct_count = 0
        incorrect_count = 0
        unattempted_count = 0

        section_stats: Dict[str, Dict[str, Any]] = {
            "Quantitative Aptitude": {"total": 0, "correct": 0, "incorrect": 0, "unattempted": 0, "score": 0.0},
            "Logical Reasoning": {"total": 0, "correct": 0, "incorrect": 0, "unattempted": 0, "score": 0.0},
            "Verbal Ability": {"total": 0, "correct": 0, "incorrect": 0, "unattempted": 0, "score": 0.0}
        }

        question_audit: List[Dict[str, Any]] = []

        raw_points = 0.0
        max_points = float(total_questions)

        for q in selected_questions:
            qid = q["question_id"]
            key = question_keys.get(qid, {})
            sec = q.get("section", "General")
            correct_ans = key.get("correct_answer", "")
            explanation = key.get("explanation", "")

            if sec not in section_stats:
                section_stats[sec] = {"total": 0, "correct": 0, "incorrect": 0, "unattempted": 0, "score": 0.0}

            section_stats[sec]["total"] += 1
            cand_ans = answers.get(qid)

            if not cand_ans:
                unattempted_count += 1
                section_stats[sec]["unattempted"] += 1
                audit_status = "skipped"
            elif cand_ans.strip() == correct_ans.strip():
                correct_count += 1
                section_stats[sec]["correct"] += 1
                raw_points += 1.0
                audit_status = "correct"
            else:
                incorrect_count += 1
                section_stats[sec]["incorrect"] += 1
                audit_status = "incorrect"
                if negative_marking_enabled:
                    raw_points -= penalty

            question_audit.append({
                "question_id": qid,
                "section": sec,
                "difficulty": q.get("difficulty", "medium"),
                "question_text": q.get("question_text", ""),
                "candidate_answer": cand_ans,
                "correct_answer": correct_ans,
                "is_correct": (cand_ans == correct_ans) if cand_ans else False,
                "status": audit_status,
                "explanation": explanation
            })

        # Calculate section scores (0-100)
        for sec, stats in section_stats.items():
            if stats["total"] > 0:
                sec_raw = stats["correct"]
                if negative_marking_enabled:
                    sec_raw -= (stats["incorrect"] * penalty)
                stats["score"] = round(max(0.0, min(100.0, (sec_raw / stats["total"]) * 100)), 1)

        # Total normalized score (0-100)
        final_normalized_score = round(max(0.0, min(100.0, (raw_points / max_points) * 100)), 1) if max_points > 0 else 0.0

        cutoff = float(round_doc.get("cutoff_score", 60.0))
        passed = final_normalized_score >= cutoff

        # Calculate time taken
        now = datetime.now(timezone.utc)
        started_at = datetime.fromisoformat(sess["started_at"])
        time_taken_seconds = min(int((now - started_at).total_seconds()), sess["duration_minutes"] * 60)

        feedback = (
            f"Candidate achieved {final_normalized_score}% (Cutoff: {cutoff}%). "
            f"Correct: {correct_count}/{total_questions}, Incorrect: {incorrect_count}, Skipped: {unattempted_count}."
        )
        if passed:
            feedback += " Strong aptitude foundation demonstrated. Advanced to Round 3."
        else:
            feedback += " Score fell below the passing threshold for this role track."

        details = {
            "round_type": "aptitude_test",
            "section_breakdown": section_stats,
            "total_questions": total_questions,
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "unattempted_count": unattempted_count,
            "negative_marking_applied": negative_marking_enabled,
            "negative_penalty": penalty if negative_marking_enabled else 0.0,
            "tab_switches": sess["tab_switches"],
            "time_taken_seconds": time_taken_seconds,
            "is_auto_submit": is_auto_submit,
            "completed_at": now.isoformat()
        }

        # Submit normalized score into sequential pipeline gating repository
        ok_pipeline, sub_res, pipe_err = self.pipeline_repo.submit_normalized_score(
            attempt_id=sess["attempt_id"],
            score=final_normalized_score,
            feedback=feedback,
            details=details,
            is_simulated=False,
            allow_simulated_pass=True
        )

        if not ok_pipeline:
            logger.warning(f"Could not persist score in pipeline repo: {pipe_err}")

        result_payload = {
            "score": final_normalized_score,
            "passed": passed,
            "cutoff": cutoff,
            "feedback": feedback,
            "details": details,
            "question_audit": question_audit,
            "is_auto_submit": is_auto_submit
        }

        # Persist completed session state in SQLite
        now_str = now.isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE aptitude_test_sessions SET
                status = 'completed',
                result_json = ?,
                updated_at = ?
            WHERE session_id = ?
            """, (json.dumps(result_payload), now_str, sess["session_id"]))
            conn.commit()

        # Fetch updated stepper progression
        stepper = self.pipeline_repo.get_candidate_stepper_progress(application_id)
        result_payload["stepper"] = stepper

        return True, result_payload, None

    def get_recruiter_candidate_audit(self, application_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch full test details for recruiter inspection:
        - Score, section breakdown, time taken, tab switches, and question-by-question candidate answer vs correct answer.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM aptitude_test_sessions WHERE application_id = ? ORDER BY created_at DESC LIMIT 1",
                (application_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None

            sess = dict(row)
            if sess.get("result_json"):
                result = json.loads(sess["result_json"])
                return {
                    "session_id": sess["session_id"],
                    "application_id": sess["application_id"],
                    "status": sess["status"],
                    "duration_minutes": sess["duration_minutes"],
                    "tab_switches": sess["tab_switches"],
                    "started_at": sess["started_at"],
                    "ends_at": sess["ends_at"],
                    "negative_marking": bool(sess["negative_marking"]),
                    "result": result
                }
            return {
                "session_id": sess["session_id"],
                "application_id": sess["application_id"],
                "status": sess["status"],
                "duration_minutes": sess["duration_minutes"],
                "tab_switches": sess["tab_switches"],
                "started_at": sess["started_at"],
                "ends_at": sess["ends_at"],
                "negative_marking": bool(sess["negative_marking"]),
                "in_progress": True
            }
