# AI Recruitment System — Project Progress & Modernization Roadmap

**Last Updated:** 2026-10-26  
**Current Branch:** `llm-integration`  
**Working Environment:** Frontend (`http://localhost:3000`), FastAPI Backend (`http://localhost:8001`)

---

## 1. System Technology Stack

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Chakra UI, Lucide Icons, Framer Motion.
- **Backend:** FastAPI (Python 3.13 / Uvicorn on Port 8001), SQLite (`backend/db/pipeline.db`), MongoDB / Motor (optional document store).
- **Audio / STT / TTS:** Web Speech API, Deepgram SDK (TTS), Groq Whisper (STT).
- **Agent Orchestration:** LangGraph, LangChain Core, Groq Python SDK.
- **Database Architecture:**
  - Hybrid persistence: SQLite tables (`pipelines`, `pipeline_rounds`, `candidate_applications`, `candidate_round_attempts`, `round_scores`, `pipeline_overrides`, `aptitude_questions`, `aptitude_configs`, `aptitude_test_sessions`) with MongoDB synchronization when active.

---

## 2. Pipeline Architecture & Sequential Gating

The platform implements a sequential 6-round hiring pipeline with backend-enforced gating:

```
[Round 1: ATS Resume Screening]
       ↓ (Pass: Score ≥ 60.0%)
[Round 2: Aptitude Test]
       ↓ (Pass: Score ≥ 60.0%)
[Round 3: Coding Round]
       ↓ (Pass: Score ≥ 60.0%)
[Round 4: Group Discussion]
       ↓ (Pass: Score ≥ 60.0%)
[Round 5: Technical Video Interview]
       ↓ (Pass: Score ≥ 60.0%)
[Round 6: HR Culture Fit Interview]
```

### Key Gating Rules:
1. **Strict Order Progression:** Round $N$ cannot be started until Round $N-1$ has status `passed` in `candidate_round_attempts`.
2. **Server-Side Verification:** Both backend API routes and `PipelineRepository.validate_can_start_round()` verify gating before creating attempts or starting timers.
3. **Idempotent Instructions Step:** Navigating to instructions does *not* create attempts or start server timers. The attempt is created only upon clicking "Start Round" with `confirmed_instructions=true`.
4. **State-Machine Redirection:** If an `in_progress` attempt exists with remaining time, navigating to instructions automatically redirects into the test environment.
5. **Refresh-Resume:** Refreshing the browser recovers the exact active questions, candidate answers, and remaining server countdown timer.

---

## 3. Current Round Status

### Round 1: Resume Screening (ATS) — `PASSED & FUNCTIONAL (STEP B COMPLETE)`
- **Location:** [backend/services/ats_service.py](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/services/ats_service.py), [backend/api/pipeline_routes.py](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/api/pipeline_routes.py), [src/components/pipeline/ApplicationOverview.tsx](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components/pipeline/ApplicationOverview.tsx), [src/components/pipeline/PipelineBuilder.tsx](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components/pipeline/PipelineBuilder.tsx)
- **Implementation Status:**
  - **Server-Side Scoring Only:** `POST /api/applications/{application_id}/screen` computes ATS scores exclusively on the server. Client-side score submission is guarded and rejected with HTTP 400.
  - **Role Requirements Management:** Recruiter can customize job descriptions, must-have skills, and nice-to-have skills per role via SQLite (`role_requirements` table). Auto-generates structured requirements with LLM if none exist.
  - **LLM Semantic Analysis & Verbatim Quote Verification:** Evaluates skills into `matched`, `partially_matched`, and `missing`. For each match, LLM produces a $\le 15$-word quote which is programmatically verified against the resume text. Matches with fake or missing quotes are dropped to missing.
  - **Deterministic Formula Scoring:** 75% weight on Must-Haves, 25% weight on Nice-To-Haves. LLMs never invent score numbers. Cutoff (60.0%) and gating are strictly preserved.
  - **PII Scrubbing & Fairness:** Names, emails, phones, URLs, photo references, and demographic attributes (age, DOB, gender, marital status) are scrubbed before LLM prompt assembly.
  - **Prompt Injection Defense:** Delimited input with boundary tags and anti-hijacking system instructions. Heuristic scanner flags suspicious instruction override phrases and locks application score at 0% for recruiter review.
  - **Offline & Graceful Fallback:** When LLM is unreachable, applications are placed in `pending_evaluation` status (no fake scoring). Allows recruiter re-run or explicit labeled `keyword_fallback`.
  - **Audit UI & Transparency:** Recruiter candidate view and pipeline page display "Found in resume" with verified quotes, dropped reasons, PII scrubbing stats, and evaluation method badges.
  - **Test Suite:** [backend/test_ats_backend_llm.py](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/test_ats_backend_llm.py) verifies all 6 security, gating, evidence, and scoring rules.

### Round 2: Aptitude Test — `PASSED & FUNCTIONAL`
- **Location:** [backend/services/aptitude_service.py](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/services/aptitude_service.py), [backend/api/aptitude_routes.py](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/api/aptitude_routes.py), [src/components/pipeline/AptitudeInstructionsPage.tsx](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components/pipeline/AptitudeInstructionsPage.tsx), [src/components/pipeline/AptitudeTestPage.tsx](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components/pipeline/AptitudeTestPage.tsx), [src/components/pipeline/AptitudeTestModal.tsx](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components/pipeline/AptitudeTestModal.tsx).
- **Current Implementation:** Bank of 45 calibrated questions seeded in SQLite (`aptitude_questions`). Server-side timer (30 mins), question randomization, option shuffling, real-time autosave, tab-switch logging, exact-match grading, and normalized score submission.

### Round 3: Coding Round — `DESIGNED (PENDING BUILD)`
- Planned architecture: Challenge bank in SQLite, multi-language editor (Python/JavaScript/TypeScript), test case runner console, visible and hidden test case evaluation.

### Rounds 4 & 6: Group Discussion & HR Interview — `PLACEHOLDER`
- Currently open manual recruiter override simulation dialogs with score sliders.

### Round 5: Technical Video Interview — `PARTIALLY IMPLEMENTED (CURRENTLY SIMULATED)`
- Interactive video UI exists in [src/components1/VideoInterview.tsx](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components1/VideoInterview.tsx).
- Currently runs client-side simulation (4 hardcoded questions and keyword-heuristic grading) due to a 1.2s timeout fallback and unconfigured backend keys.

---

## 4. Key Audit Findings (`docs/audit/llm-usage-report.md`)

An evidence-based codebase audit confirmed:
1. **Core Pipeline is Currently 100% Deterministic:** Rounds 1–4, answer checking, and scoring currently use **zero LLM calls**.
2. **ATS Screening is Rule-Based:** Uses substring `includes()` against 8 hardcoded skill categories per role; `sentence-transformers` and `faiss-cpu` in `requirements.txt` are never imported.
3. **Interview Fallback is Active:** Because `GROQ_API_KEY` is not configured in `.env` by default and MongoDB is optional, the frontend falls back to `simulatedSessions` with 4 fixed questions and word-count scoring.
4. **Dashboard Data is Mocked:** `INITIAL_CANDIDATES` in `RecruiterDashboard.tsx` contains 5 static mock records (Aarav, Priya, Rohan, Ananya, Kabir) with pre-baked scores and static string percentages.

---

## 5. Modernization Roadmap: Planned Steps A to F

### Step A: Unified Backend LLM Service & AI Aptitude Integration
- Build a robust `backend/services/llm_service.py` that encapsulates Groq API interactions with structured JSON output, retry policies, rate limit handling, and graceful offline fallbacks.
- Implement AI-assisted dynamic MCQ generation to expand the aptitude question pool while maintaining deterministic exact-match grading for question keys.

### Step B: Backend ATS Resume Screening with LLM Semantic Extraction — `COMPLETED`
- Moved ATS evaluation to dedicated backend endpoint `POST /api/applications/{application_id}/screen`.
- Programmatic quote validation (max 15 words) with hallucination dropping.
- PII scrubbing (contact and demographic removal), anti-prompt injection defense, role requirements management, deterministic 75/25 scoring, and transparent recruiter audit UI.

### Step C: Technical Interview Fix & Live LLM Interview Conductor
- Eliminate the premature 1.2s frontend abort timeout in `src/services/interviewService.ts`.
- Wire `VideoInterview.tsx` to FastAPI endpoints (`/api/interview/start` and `/api/interview/answer`) to use the live Groq `llama-3.3-70b-versatile` conductor agent.
- Implement robust graceful degradation: if Groq rate limits are hit or credentials are not supplied, display a clear, honest UI banner indicating fallback mode.

### Step D: Group Discussion & HR Interview Real Implementations
- Replace the current placeholder score-slider modals for Round 4 and Round 6:
  - **Round 4 (Group Discussion):** Multi-agent peer simulation where AI personas debate an architectural topic with the candidate, scoring peer engagement, consensus building, and clarity.
  - **Round 6 (HR Interview):** Culture fit, career aspirations, and situational scenario assessment.

### Step E: Coding Round (Round 3) Full Implementation
- Build the complete Round 3 workflow:
  - Seed challenge bank in SQLite (`coding_challenges`).
  - `/apply/round/3/instructions` and `/apply/round/3/test` pages.
  - Multi-language IDE editor with syntax highlighting and indentation.
  - Test case runner console with visible samples and anti-cheat hidden test cases.
  - Safe code evaluator and LLM code quality / complexity review.

### Step F: Honesty Cleanup & Live Dashboard Persistence
- Wire `RecruiterDashboard.tsx` to read real candidate records from SQLite/MongoDB instead of the static `INITIAL_CANDIDATES` array.
- Replace hardcoded insight strings with real aggregated metrics (real candidate counts, real pass rates, actual round bottleneck metrics).
- Align landing page and UI copy to accurately reflect current verified platform capabilities.
