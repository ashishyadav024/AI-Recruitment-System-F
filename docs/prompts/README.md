# Step Prompts Directory

This directory stores the specific prompt specifications and execution instructions for each planned phase (Steps A through F) of the AI Recruitment System modernization:

- `step-a-llm-service-aptitude.md`: Prompt instructions for building the unified backend LLM service and dynamic AI aptitude question generation.
- `step-b-backend-ats-llm.md`: Prompt instructions for migrating ATS resume screening to a backend semantic LLM evaluation endpoint.
- `step-c-technical-interview-fix.md`: Prompt instructions for wiring the live Groq LLM agent to the video interview room with realistic timeouts and honest fallback indicators.
- `step-d-group-discussion-hr.md`: Prompt instructions for implementing real Group Discussion and HR interview rounds.
- `step-e-coding-round.md`: Prompt instructions for building Round 3 (Coding Round) with multi-language editor and test runner.
- `step-f-dashboard-honesty-cleanup.md`: Prompt instructions for connecting the Recruiter Dashboard to live SQLite/MongoDB data and performing copy alignment.

Each prompt in this directory is versioned and can be referenced directly during project execution.
