# Comprehensive LLM Usage & Codebase Reality Audit

**Project:** AI Recruitment System  
**Audit Date:** 2026-10-26  
**Auditor:** Automated Code Intelligence Audit  
**Scope:** Frontend (`src/`), Backend (`backend/`), Configuration & Manifests  
**Verdict Summary:** The core multi-round candidate pipeline (Rounds 1–4) and dashboard analytics currently use **ZERO LLM calls**. Questions, answer checking, ATS screening, and scoring are **100% hardcoded, rule-based, or simulated**. A real Groq LLM integration exists in backend agent files for live interviews, but in practical execution it is bypassed or falls back to hardcoded client-side simulation because no API keys or live MongoDB connections are present.

---

## SECTION 1: SEARCH THE WHOLE REPO

### 1.1 LLM Providers & SDKs
Searched for: `openai`, `anthropic`, `claude`, `gemini`, `google.generativeai`, `genai`, `groq`, `mistral`, `ollama`, `huggingface`, `langchain`, `langgraph`, `litellm`, `together`, `cohere`.

| Provider / SDK | Status in Codebase | File & Evidence |
| :--- | :--- | :--- |
| **OpenAI** | **Not Found** | No references found in `src/` or `backend/`. |
| **Anthropic / Claude** | **Not Found** | No references found in `src/` or `backend/`. |
| **Google Gemini / genai** | **Not Found** | No references found in project source code. |
| **Mistral / Ollama / Together / Cohere** | **Not Found** | No references found in `src/` or `backend/`. |
| **Groq (Python SDK)** | **Installed & Implemented** | [backend/requirements.txt:8](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/requirements.txt#L8), [backend/main.py:94-99](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/main.py#L94-L99), [backend/langgraph_agents/interview_conductor_agent.py:132](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/langgraph_agents/interview_conductor_agent.py#L132). |
| **Groq (JS SDK: `groq-sdk`)** | **Installed but Dead Code** | [package.json:63](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/package.json#L63), [src/services/intentDetection.ts:1-12](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/intentDetection.ts#L1-L12). Instantiated with `dangerouslyAllowBrowser: true`, but never actually called anywhere in the file or project. |
| **LangGraph / LangChain** | **Partially Used in Backend** | [backend/requirements.txt:10-18](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/requirements.txt#L10-L18). Imported in `backend/langgraph_agents/`, but unused by the multi-round candidate pipeline. |
| **sentence-transformers** | **Installed but Never Imported** | In [backend/requirements.txt:13](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/requirements.txt#L13). Zero occurrences of `sentence_transformers` across all `.py` files. |
| **faiss-cpu** | **Installed but Never Imported** | In [backend/requirements.txt:12](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/requirements.txt#L12). Zero occurrences of `faiss` across all `.py` files. |
| **langchain-community** | **Installed but Never Imported** | In [backend/requirements.txt:11](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/requirements.txt#L11). Zero occurrences across all `.py` files. |

### 1.2 Environment Variables & Key Management
- **Presence of `.env`**: Searches for `.env` files confirmed that **no `.env` file exists on disk** in the repository. Only [backend/.env.template](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/.env.template) is present.
- **`.gitignore` Status**: Properly ignored in [.gitignore:37-40](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/.gitignore#L37-L40):
  ```gitignore
  .env
  .env.local
  .env.*
  backend/.env
  ```
- **Hardcoded Secrets**: No active secret tokens are hardcoded. However, placeholder dummy strings are hardcoded as fallbacks:
  - [backend/main.py:94](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/main.py#L94): `default_groq_key = os.getenv('GROQ_API_KEY') or 'gsk_mock_key_for_dev'`
  - [backend/app.py:68](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/app.py#L68): `groq_api_key = "your_groq_api_key_here"`
  - [src/services/intentDetection.ts:10](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/intentDetection.ts#L10): `apiKey: groqApiKey || 'dummy_placeholder_key'`

### 1.3 Direct LLM Calls from Frontend
- **Finding**: There are **no active LLM API calls executed directly from the browser**.
- **Evidence**: While [src/services/intentDetection.ts](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/intentDetection.ts#L9-L12) instantiates `new Groq({ dangerouslyAllowBrowser: true })`, lines 58–174 implement `detectIntent()` using pure `String.prototype.includes()` string matching. The `groq` instance is unused dead code. No API keys are leaked into production client bundles.

---

## SECTION 2: ROUND-BY-ROUND EVIDENCE TABLE

| Round | Content / Question Source | Question Count & Location | Answer Evaluation Method | Score Calculation | Feedback & Result Generation | LLM Call Present? | Simulation / Fallback Mode | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Round 1: ATS Resume Screening** | Fixed dictionary of hardcoded role profiles | 4 roles with 8 fixed skill categories each in [ApplicationOverview.tsx:69-110](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components/pipeline/ApplicationOverview.tsx#L69-L110) | Case-insensitive regex / `includes()` substring search in browser | `(matchedSkills.length / totalSkills) * 100` | Static conditional ternary strings based on cutoff | **NO** | Client-side only; never contacts backend AI agents | **RULE-BASED** |
| **Round 2: Aptitude Test** | Static JSON file seeded into SQLite table | Exactly 45 questions in [backend/data/aptitude_questions.json](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/data/aptitude_questions.json) | Exact string equality comparison against stored key | `(raw_points / max_points) * 100` with optional negative penalty | Formatted f-string: `"Candidate achieved {score}% (Cutoff: {cutoff}%)"` | **NO** | None; pure database retrieval and arithmetic | **HARDCODED / RULE-BASED** |
| **Round 3: Coding Round** | None | 0 questions; type enum only | None | None | None | **NO** | Returns `coming_soon` notice dialog | **NOT IMPLEMENTED** |
| **Round 4: Group Discussion** | None | 0 questions; type enum only | None | None | None | **NO** | Recruiter manual override modal with score slider | **SIMULATED** |
| **Round 5: Technical Interview** | Hardcoded array of 4 question templates in [interviewService.ts:107-124](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/interviewService.ts#L107-L124) *(Simulation mode)* | 4 static questions with string interpolation for name/role | Word count checks + 20-word technical keyword list matching in [interviewService.ts:131-144](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/interviewService.ts#L131-L144) | Base 8.4 + bonuses/penalties clamped to [7.2, 9.8] | Fixed pre-written strings from array in [interviewService.ts:147-170](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/interviewService.ts#L147-L170) | **NO in active UI flow** *(Backend agent code exists but crashes without env key & MongoDB)* | Yes; default fallback activated on 1.2s timeout or missing backend key | **SIMULATED (UI) / CONDITIONAL (Backend)** |
| **Round 6: HR Interview** | None | 0 questions; type enum only | None | None | None | **NO** | Recruiter manual override modal with score slider | **SIMULATED** |
| **Recruiter Dashboard & Scorecards** | Static mock array [RecruiterDashboard.tsx:44-110](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components1/RecruiterDashboard.tsx#L44-L110) | 5 dummy candidates (Aarav, Priya, Rohan, Ananya, Kabir) | None | Hardcoded numbers (82, 91, 0, 76, 88) | Static JSX text (e.g. `"68% of candidates demonstrated concise reasoning"`) | **NO** | 100% hardcoded mock data | **HARDCODED** |

---

## DETAILED FINDINGS BY ROUND

### Round 1: Resume Screening (ATS)
- **Claim:** Uses "semantic matching" and "advanced machine learning models" to extract and match skills.
- **Evidence:**
  In [src/components/pipeline/ApplicationOverview.tsx:141-155](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components/pipeline/ApplicationOverview.tsx#L141-L155):
  ```typescript
  const isMatched = skill.keywords.some((keyword) => {
    if (keyword.length <= 3) {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      return regex.test(normalizedText);
    }
    return normalizedText.includes(keyword.toLowerCase());
  });
  ```
- **Finding:** No embeddings, vector databases, or LLM calls are involved. `sentence-transformers` and `faiss-cpu` in `requirements.txt` are never imported. Skill lists are hardcoded per role in [ApplicationOverview.tsx:69-110](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components/pipeline/ApplicationOverview.tsx#L69-L110).
- **Verdict:** **RULE-BASED (String Substring Match)**

---

### Round 2: Aptitude Test
- **Claim:** Adaptive, AI-calibrated analytical assessment.
- **Evidence:**
  In [backend/services/aptitude_service.py:829-839](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/services/aptitude_service.py#L829-L839):
  ```python
  elif cand_ans.strip() == correct_ans.strip():
      correct_count += 1
      section_stats[sec]["correct"] += 1
      raw_points += 1.0
      audit_status = "correct"
  else:
      incorrect_count += 1
      section_stats[sec]["incorrect"] += 1
      if negative_marking_enabled:
          raw_points -= penalty
  ```
- **Finding:** All 45 questions, options, and explanations originate from the static JSON file [backend/data/aptitude_questions.json](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/data/aptitude_questions.json). Scoring is exact string equality against the stored answer.
- **Verdict:** **HARDCODED QUESTION BANK / ARITHMETIC SCORING**

---

### Round 5: Technical Interview (Video Interview)
- **Claim:** Real-time conversational AI interviewer evaluating 5 competency dimensions.
- **Evidence in Frontend Simulation Mode:**
  In [src/services/interviewService.ts:127-145](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/interviewService.ts#L127-L145):
  ```typescript
  let baseScore = 8.4;
  if (wordCount > 25) baseScore += 0.5;
  if (wordCount > 50) baseScore += 0.4;
  if (wordCount < 8) baseScore -= 1.2;

  const techKeywords = ["state", "hook", "component", "render", "api", "cache", "async", ...];
  const matched = techKeywords.filter(k => lower.includes(k));
  if (matched.length >= 2) baseScore += 0.4;
  const overall = Math.min(9.8, Math.max(7.2, Number(baseScore.toFixed(1))));
  ```
  In [src/services/interviewService.ts:192-209](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/interviewService.ts#L192-L209):
  ```typescript
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);
  // If backend does not respond within 1.2s or fails:
  console.info("FastAPI backend (Port 8001) not detected. Initiating interactive AI simulation interview session.");
  ```
- **Evidence in Backend Agent Mode:**
  In [backend/langgraph_agents/interview_conductor_agent.py:132-159](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/langgraph_agents/interview_conductor_agent.py#L132-L159):
  ```python
  self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
  self.mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
  ```
- **Finding:** A backend Groq LangGraph agent implementation does exist in `backend/langgraph_agents/interview_conductor_agent.py`. However, because `GROQ_API_KEY` is not set by default and MongoDB Atlas is not running locally, calling this endpoint throws an exception. The frontend handles this with a tight 1.2s timeout, seamlessly falling back to `evaluateSimulatedAnswer()` and 4 hardcoded questions.
- **Verdict:** **SIMULATED IN PRACTICE (Fallback) / REAL LLM IMPLEMENTED BUT INOPERATIVE WITHOUT EXTERNAL CREDENTIALS (Backend)**

---

### Dashboard & Analytics
- **Claim:** Live candidate directory, aggregate analytics, and AI scorecards.
- **Evidence:**
  In [src/components1/RecruiterDashboard.tsx:44-57](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components1/RecruiterDashboard.tsx#L44-L57):
  ```typescript
  const INITIAL_CANDIDATES: CandidateRecord[] = [
    {
      id: "cand-1",
      name: "Aarav Sharma",
      role: "Machine Learning Engineer",
      status: "Completed",
      score: 82,
      skills: ["Python", "Machine Learning", "FastAPI", "Docker", "PyTorch"],
      ...
  ```
  In [src/components1/RecruiterDashboard.tsx:1383](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components1/RecruiterDashboard.tsx#L1383):
  ```typescript
  <p>68% of candidates demonstrated concise reasoning in architectural trade-off questions.</p>
  ```
- **Finding:** All candidate records, scores, completion rates, and insight summaries shown on the default dashboard view are static mock data.
- **Verdict:** **HARDCODED DEMO DATA**

---

## SECTION 3: CLAIMS VS REALITY

| Claim in UI / Landing / README | Code Location | Reality in Codebase | Verdict |
| :--- | :--- | :--- | :--- |
| *"Advanced machine learning models analyze resumes"* | [Index.tsx:443](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/pages/Index.tsx#L443) | Substring search (`includes()`) against 8 static skill categories per role in [ApplicationOverview.tsx:147](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components/pipeline/ApplicationOverview.tsx#L147). | **FALSE (Rule-Based Keyword Matching)** |
| *"Nobody writes questions manually... The AI does all of it"* | [README.md:70](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/README.md#L70) | Aptitude has 45 human-written JSON questions; Interview simulation has 4 human-written template strings. | **FALSE** |
| *"AI Interview Conductor with Groq Engine"* | [VideoInterview.tsx:695](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components1/VideoInterview.tsx#L695) | Defaults to `simulatedSessions` in `interviewService.ts` with 4 fixed questions and word-count scoring. | **MISLEADING (Simulated in UI)** |
| *"Calibrated rubrics across 5 competency dimensions"* | [interviewService.ts:172-177](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/interviewService.ts#L172-L177) | Fixed math offsets added to base score: `technical_score = overall`, `completeness = overall + 0.2`, `relevance = overall + 0.3`. | **FALSE (Mathematical Simulation)** |
| *"Blind to demographic factors / bias-free"* | [Index.tsx:1105](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/pages/Index.tsx#L1105) | ATS does not explicitly scrub names, emails, or personal details before matching. | **PARTIALLY TRUE (Deterministic keyword matching only)** |
| *"Real-time analytics"* | [RecruiterDashboard.tsx:1383](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components1/RecruiterDashboard.tsx#L1383) | Hardcoded strings in TSX layout. | **FALSE (Static Mock Text)** |

---

## SECTION 4: WHAT IS NEEDED TO INTRODUCE REAL LLM CAPABILITIES

To convert this system from rule-based/simulated to real LLM-backed workflows, the following changes are required:

### Round 1: ATS Resume Screening
- **(a) Question / Requirement Generation:** Dynamically generate required competencies and semantic rubrics from raw job descriptions using structured JSON output.
- **(b) Answer Review & Scoring:** Replace `evaluateResumeATS` with a backend route calling Groq/Gemini to perform semantic extraction with citation of resume evidence.
- **(c) Feedback Generation:** Produce personalized gap analysis and strengths based on the comparison.
- **Existing Reusable Code:** [backend/langgraph_agents/resume_analysis_agent.py](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/langgraph_agents/resume_analysis_agent.py).
- **Risks:** Hallucinated skill attribution, prompt injection via hidden white-text resumes, API cost on long resumes, latency.

### Round 2: Aptitude Test
- **(a) Question Generation:** Use LLM with few-shot prompts to generate domain-specific logical/quantitative MCQs.
- **(b) Answer Review:** For MCQs, keep deterministic grading! **Do not use an LLM to check A/B/C/D answers** (LLMs can hallucinate math and fail simple logic).
- **(c) Feedback Generation:** Use an LLM only to generate remedial explanations for missed concepts.
- **Risks:** Flawed math question generation where no option is correct or multiple options are correct.

### Round 3: Coding Round
- **(a) Problem Generation:** Curate problems or use an LLM with strict schemas to generate algorithmic challenges with input/output constraints.
- **(b) Answer Review:** **Never use an LLM as the primary code test runner.** Use a sandboxed code execution environment (Docker / isolate / Pyodide) to run test cases. Use the LLM only for code quality, time/space complexity analysis, and readability review.
- **(c) Feedback Generation:** LLM generates suggestions for code refactoring and optimization.
- **Risks:** Remote code execution security vulnerabilities, infinite loops, high timeout rates.

### Round 5: Technical Interview
- **(a) Question Generation:** Activate the existing backend [question_generator_agent.py](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/langgraph_agents/question_generator_agent.py) with valid API credentials.
- **(b) Answer Review:** Ensure backend evaluation runs within 2–3 seconds and remove the premature 1.2s frontend abort timeout in `interviewService.ts`.
- **(c) Feedback Generation:** Generate rubric scores with chain-of-thought evaluation.
- **Risks:** Hallucinated scoring, API rate limits mid-interview, high latency breaking conversational flow, prompt injection via candidate speech.

---

## SECTION 5: SUMMARY

### One-Paragraph Reality Summary
The AI Recruitment System is currently an **expertly crafted, high-fidelity deterministic application** rather than an autonomous AI platform. Across the candidate-facing multi-round pipeline, Round 1 (Resume Screening) relies on substring keyword matching against hardcoded lists; Round 2 (Aptitude) relies on 45 static JSON questions with arithmetic grading; Round 3 (Coding) is not implemented; and Round 5 (Technical Interview) in practice falls back to 4 hardcoded questions with length/keyword heuristic scoring. Backend Groq LLM agent implementations exist in the repository, but they are completely bypassed in default operation due to missing API keys and client-side simulation fallbacks.

### Capability vs Status Scorecard

| Capability | Current Status | Primary Implementation |
| :--- | :--- | :--- |
| **Question Generation (Aptitude)** | **HARDCODED** | Static JSON file ([backend/data/aptitude_questions.json](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/data/aptitude_questions.json)) |
| **Question Generation (Interview)** | **SIMULATED** | 4 static templates in [interviewService.ts:103-125](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/interviewService.ts#L103-L125) |
| **Answer Evaluation (Aptitude)** | **RULE-BASED** | Exact string comparison in [aptitude_service.py:829](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/services/aptitude_service.py#L829) |
| **Answer Evaluation (Interview)** | **SIMULATED** | Word count & keyword heuristics in [interviewService.ts:127-145](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/interviewService.ts#L127-L145) |
| **Result & Score Generation** | **RULE-BASED** | Arithmetic ratios and clamped formulas |
| **Resume ATS Analysis** | **RULE-BASED** | `includes()` keyword matching in [ApplicationOverview.tsx:147](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components/pipeline/ApplicationOverview.tsx#L147) |
| **Coding Round** | **NOT IMPLEMENTED** | Placeholder UI only |
| **Recruiter Analytics** | **HARDCODED** | Static mock candidates & strings in [RecruiterDashboard.tsx](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components1/RecruiterDashboard.tsx) |

---

### Top 10 Files to Verify Findings

1. [src/components/pipeline/ApplicationOverview.tsx#L69-L160](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components/pipeline/ApplicationOverview.tsx#L69-L160) — Hardcoded `ROLE_SKILL_PROFILES` and `evaluateResumeATS` string matching.
2. [src/services/interviewService.ts#L103-L183](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/interviewService.ts#L103-L183) — 4 hardcoded simulated interview questions and keyword-heuristic evaluation.
3. [src/services/interviewService.ts#L192-L215](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/interviewService.ts#L192-L215) — 1.2s timeout fallback directly activating simulation mode.
4. [backend/data/aptitude_questions.json#L1-L50](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/data/aptitude_questions.json#L1-L50) — Static bank of 45 pre-written aptitude MCQs.
5. [backend/services/aptitude_service.py#L820-L865](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/services/aptitude_service.py#L820-L865) — Exact string match answer checking and arithmetic normalized scoring.
6. [src/services/intentDetection.ts#L1-L15](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/services/intentDetection.ts#L1-L15) — Unused `Groq` client instantiation in frontend.
7. [backend/main.py#L93-L100](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/main.py#L93-L100) — Groq client initialization falling back to dummy key `'gsk_mock_key_for_dev'`.
8. [backend/langgraph_agents/interview_conductor_agent.py#L131-L160](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/langgraph_agents/interview_conductor_agent.py#L131-L160) — Real Groq LLM agent requiring unconfigured API key and MongoDB instance.
9. [src/components1/RecruiterDashboard.tsx#L44-L110](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/src/components1/RecruiterDashboard.tsx#L44-L110) — Hardcoded `INITIAL_CANDIDATES` mock data.
10. [backend/requirements.txt#L10-L18](file:///c:/Users/ACER/OneDrive/Desktop/AI-Recruitment-System/backend/requirements.txt#L10-L18) — Unused packages (`sentence-transformers`, `faiss-cpu`) that are never imported in the codebase.
