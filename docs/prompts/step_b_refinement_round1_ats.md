# Step B Refinement: Round 1 (ATS) Result

```markdown
[COMMON RULES]

REFINE THE ROUND 1 (ATS) RESULT. Fix only the points below. Do not change other rounds.

1. STRICTER MATCHING
- Update the screening prompt: mark a requirement "matched" only if the resume text directly shows that specific skill. Related but different skills (for example Git for CI/CD, or HTML for a framework) must be "partial" or "missing". Each match needs its own most relevant evidence quote (max 15 words), and the same generic line must not be reused for unrelated skills
- Add a "partial" status. Partial matches get half credit in the score. The code still verifies that each evidence quote exists in the resume and downgrades the match if not
- Add a test with a resume that mentions Git but not CI/CD, and assert the requirement is not "matched"

2. SCORE TRANSPARENCY
- Show a small "How this score was calculated" section: number of must-have and nice-to-have requirements, the weights, how many were matched, partial, and missing, and the formula result. The numbers must be computed in code. The UI and the stored result must use the same numbers

3. LABELS AND TEXT
- Right box heading: "Not found in resume" instead of "Role requirements not found"
- Rejection message: kind and specific. Show the missing must-have skills and 2-3 suggestions, and avoid the harsh wording "APPLICATION TERMINATED". Use "Not selected for the next round"
- Show the model name and evaluation_method only to recruiters, not to candidates. Candidates see "AI-assisted screening"

4. BORDERLINE CASES
- Add a recruiter setting for Round 1: borderline margin (default 10 points). If the score is below the cutoff but within the margin, the status becomes "On hold for recruiter review" instead of auto-rejection. The candidate sees "Your application is under review". The recruiter can approve or reject from the dashboard, and the action is logged. Scores far below the cutoff still follow the configured auto-reject rule

5. TESTS AND PROOF
- Mocked LLM tests for partial matches, evidence verification, the borderline hold, the score breakdown matching the stored result, and role-based visibility of the model name
- Run a real screening on my test resume and show me the breakdown

Update docs/PROGRESS.md, save this prompt in docs/prompts/, and commit.
```
