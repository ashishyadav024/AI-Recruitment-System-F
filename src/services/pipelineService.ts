/**
 * Pipeline Service - Frontend API client and persistent store for multi-round hiring pipelines
 */

import { FASTAPI_BASE_URL } from '../config/api';
import {
  PipelineConfig,
  RoundConfig,
  CandidateApplication,
  CandidateRoundAttempt,
  CandidateStepperProgress,
  NormalizedScore,
  StandardRoundType,
  RoundStatus,
  OnFailAction,
  ApplicationStatus,
  StepperRoundItem,
  PipelineOverride,
  AptitudeConfig,
  AptitudeTestSession,
  AptitudeResult
} from '../types/pipeline';

const PIPELINES_STORAGE_KEY = 'ai_recruitment_pipelines_v1';
const APPLICATIONS_STORAGE_KEY = 'ai_recruitment_applications_v1';
const ATTEMPTS_STORAGE_KEY = 'ai_recruitment_attempts_v1';
const OVERRIDES_STORAGE_KEY = 'ai_recruitment_overrides_v1';

// Default pipeline template with currently available rounds only (Resume Screening -> Technical Interview)
export const createDefaultAvailableRounds = (pipelineId: string): RoundConfig[] => [
  {
    round_id: `${pipelineId}-r1`,
    round_type: 'resume_screening',
    title: 'Resume Screening',
    description: 'ATS keyword and semantic role matching against job specifications',
    order: 1,
    duration_minutes: 15,
    cutoff_score: 60,
    weight: 40,
    on_fail_action: 'reject',
    is_active: true
  },
  {
    round_id: `${pipelineId}-r2`,
    round_type: 'technical_interview',
    title: 'Technical Interview',
    description: 'Live AI Video Interview evaluating architectural depth and system design',
    order: 2,
    duration_minutes: 30,
    cutoff_score: 60,
    weight: 60,
    on_fail_action: 'reject',
    is_active: true
  }
];

// Standard calibrated 6-round hiring template
export const createDefaultRounds = (pipelineId: string): RoundConfig[] => [
  {
    round_id: `${pipelineId}-r1`,
    round_type: 'resume_screening',
    title: 'Resume Screening',
    description: 'ATS keyword and semantic role matching against job specifications',
    order: 1,
    duration_minutes: 15,
    cutoff_score: 60,
    weight: 10,
    on_fail_action: 'reject',
    is_active: true
  },
  {
    round_id: `${pipelineId}-r2`,
    round_type: 'aptitude_test',
    title: 'Aptitude Test',
    description: 'Analytical reasoning, quantitative problem solving, and logical competency',
    order: 2,
    duration_minutes: 30,
    cutoff_score: 60,
    weight: 15,
    on_fail_action: 'reject',
    is_active: true
  },
  {
    round_id: `${pipelineId}-r3`,
    round_type: 'coding_round',
    title: 'Coding Round',
    description: 'Algorithmic challenges, data structures, and production-grade implementation',
    order: 3,
    duration_minutes: 45,
    cutoff_score: 60,
    weight: 25,
    on_fail_action: 'hold',
    is_active: true
  },
  {
    round_id: `${pipelineId}-r4`,
    round_type: 'group_discussion',
    title: 'Group Discussion',
    description: 'Peer communication, structured debate, consensus building, and clarity',
    order: 4,
    duration_minutes: 25,
    cutoff_score: 60,
    weight: 15,
    on_fail_action: 'hold',
    is_active: true
  },
  {
    round_id: `${pipelineId}-r5`,
    round_type: 'technical_interview',
    title: 'Technical Interview',
    description: 'Live AI Video Interview evaluating architectural depth and system design',
    order: 5,
    duration_minutes: 30,
    cutoff_score: 60,
    weight: 25,
    on_fail_action: 'reject',
    is_active: true
  },
  {
    round_id: `${pipelineId}-r6`,
    round_type: 'hr_interview',
    title: 'HR Interview',
    description: 'Cultural alignment, compensation expectations, work philosophy, and team fit',
    order: 6,
    duration_minutes: 20,
    cutoff_score: 60,
    weight: 10,
    on_fail_action: 'hold',
    is_active: true
  }
];

const INITIAL_PIPELINES: Record<string, PipelineConfig> = {
  'machine-learning-engineer': {
    pipeline_id: 'pipe-mle-01',
    job_role: 'Machine Learning Engineer',
    title: 'ML Engineering Track',
    description: 'Calibrated 6-round hiring track for Machine Learning & AI Engineers',
    is_active: true,
    total_rounds: 6,
    rounds: createDefaultRounds('pipe-mle-01')
  },
  'frontend-developer': {
    pipeline_id: 'pipe-fe-02',
    job_role: 'Frontend Developer',
    title: 'Frontend Engineering Track',
    description: 'Calibrated hiring track for React, TypeScript, and modern UI engineering',
    is_active: true,
    total_rounds: 6,
    rounds: createDefaultRounds('pipe-fe-02')
  },
  'backend-engineer': {
    pipeline_id: 'pipe-be-03',
    job_role: 'Backend Engineer',
    title: 'Backend Systems Track',
    description: 'Calibrated hiring track for distributed systems, microservices, and databases',
    is_active: true,
    total_rounds: 6,
    rounds: createDefaultRounds('pipe-be-03')
  },
  'data-analyst': {
    pipeline_id: 'pipe-da-04',
    job_role: 'Data Analyst',
    title: 'Data Intelligence Track',
    description: 'Calibrated hiring track for SQL, cohort analytics, and data modeling',
    is_active: true,
    total_rounds: 6,
    rounds: createDefaultRounds('pipe-da-04')
  }
};

// Seed sample applications for recruiter dashboard
const INITIAL_APPLICATIONS: CandidateApplication[] = [
  {
    application_id: 'app-cand-1',
    candidate_email: 'aarav.sharma@example.com',
    candidate_name: 'Aarav Sharma',
    job_role: 'Machine Learning Engineer',
    pipeline_id: 'pipe-mle-01',
    current_round_order: 5,
    status: 'in_pipeline',
    status_message: 'Passed Coding Round. Technical Interview (Round 5) unlocked.',
    total_weighted_score: 82,
    is_simulated: false,
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  },
  {
    application_id: 'app-cand-2',
    candidate_email: 'priya.m@techstudio.dev',
    candidate_name: 'Priya Mehta',
    job_role: 'Frontend Developer',
    pipeline_id: 'pipe-fe-02',
    current_round_order: 6,
    status: 'in_pipeline',
    status_message: 'Passed Technical Interview (Score 91/100). HR Interview (Round 6) unlocked.',
    total_weighted_score: 91,
    is_simulated: false,
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  },
  {
    application_id: 'app-cand-3',
    candidate_email: 'rohan.v@cloudscale.io',
    candidate_name: 'Rohan Verma',
    job_role: 'Backend Engineer',
    pipeline_id: 'pipe-be-03',
    current_round_order: 3,
    status: 'in_pipeline',
    status_message: 'Aptitude Test passed. Coding Round (Round 3) unlocked.',
    total_weighted_score: 74,
    is_simulated: false,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    application_id: 'app-cand-4',
    candidate_email: 'ananya.s@analytics.org',
    candidate_name: 'Ananya Singh',
    job_role: 'Data Analyst',
    pipeline_id: 'pipe-da-04',
    current_round_order: 4,
    status: 'on_hold',
    status_message: 'On hold at Coding Round (Score 55 < Cutoff 60). Awaiting recruiter review.',
    total_weighted_score: 68,
    is_simulated: false,
    created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString()
  }
];

class PipelineService {
  private getPipelinesStore(): Record<string, PipelineConfig> {
    try {
      const raw = localStorage.getItem(PIPELINES_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return INITIAL_PIPELINES;
  }

  private savePipelinesStore(data: Record<string, PipelineConfig>) {
    try {
      localStorage.setItem(PIPELINES_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  private getAppsStore(): Record<string, CandidateApplication> {
    try {
      const raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    const map: Record<string, CandidateApplication> = {};
    INITIAL_APPLICATIONS.forEach(a => { map[a.application_id] = a; });
    return map;
  }

  private saveAppsStore(data: Record<string, CandidateApplication>) {
    try {
      localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  private getAttemptsStore(): Record<string, CandidateRoundAttempt> {
    try {
      const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {};
  }

  private saveAttemptsStore(data: Record<string, CandidateRoundAttempt>) {
    try {
      localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  private getOverridesStore(): PipelineOverride[] {
    try {
      const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  }

  private saveOverridesStore(data: PipelineOverride[]) {
    try {
      localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  // Normalize role key
  private normalizeRoleKey(role: string): string {
    return role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  /**
   * Fetch pipeline for a job role (FastAPI backend with offline local store fallback)
   */
  async getPipelineByRole(jobRole: string): Promise<PipelineConfig> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${FASTAPI_BASE_URL}/api/pipelines/${encodeURIComponent(jobRole)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.pipeline) {
          return body.pipeline;
        }
      }
    } catch {
      // Fallback to local store
    }

    const key = this.normalizeRoleKey(jobRole);
    const store = this.getPipelinesStore();
    if (store[key]) {
      return store[key];
    }

    // Create fresh default pipeline with currently available rounds
    const newId = `pipe-${Date.now().toString(36)}`;
    const newPipeline: PipelineConfig = {
      pipeline_id: newId,
      job_role: jobRole,
      title: `${jobRole} Hiring Pipeline`,
      description: `Default pipeline with currently available rounds for ${jobRole}`,
      is_active: true,
      total_rounds: 2,
      rounds: createDefaultAvailableRounds(newId)
    };
    store[key] = newPipeline;
    this.savePipelinesStore(store);
    return newPipeline;
  }

  /**
   * Save / update a pipeline configuration
   */
  async savePipeline(pipeline: PipelineConfig): Promise<PipelineConfig> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/pipelines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pipeline)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          // Sync with local
        }
      }
    } catch {
      // ignore
    }

    const key = this.normalizeRoleKey(pipeline.job_role);
    const store = this.getPipelinesStore();
    store[key] = {
      ...pipeline,
      updated_at: new Date().toISOString()
    };
    this.savePipelinesStore(store);
    return store[key];
  }

  /**
   * Get or create candidate application
   */
  async getOrCreateApplication(
    candidateEmail: string,
    candidateName: string,
    jobRole: string,
    isSimulated = false,
    resumeText?: string,
    resumeFilePath?: string,
    resumeFileName?: string
  ): Promise<CandidateApplication> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${FASTAPI_BASE_URL}/api/candidate-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_email: candidateEmail,
          candidate_name: candidateName,
          job_role: jobRole,
          is_simulated: isSimulated,
          resume_text: resumeText,
          resume_file_path: resumeFilePath,
          resume_file_name: resumeFileName
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.application) {
          const apps = this.getAppsStore();
          apps[body.application.application_id] = body.application;
          this.saveAppsStore(apps);
          return body.application;
        }
      }
    } catch {
      // Local fallback
    }

    const apps = this.getAppsStore();
    const emailNorm = candidateEmail.trim().toLowerCase();
    const existing = Object.values(apps).find(
      a => a.candidate_email.toLowerCase() === emailNorm && a.job_role.toLowerCase() === jobRole.toLowerCase()
    );
    if (existing) {
      if (resumeText || resumeFilePath) {
        existing.metadata = {
          ...(existing.metadata || {}),
          ...(resumeText ? { resume_text: resumeText } : {}),
          ...(resumeFilePath ? { resume_file_path: resumeFilePath } : {}),
          ...(resumeFileName ? { resume_file_name: resumeFileName } : {})
        };
        this.saveAppsStore(apps);
      }
      return existing;
    }

    const pipeline = await this.getPipelineByRole(jobRole);
    const appId = `app-${Date.now().toString(36)}`;
    const newApp: CandidateApplication = {
      application_id: appId,
      candidate_email: candidateEmail,
      candidate_name: candidateName,
      job_role: jobRole,
      pipeline_id: pipeline.pipeline_id,
      current_round_order: 1,
      status: 'in_pipeline',
      status_message: 'Application started. Round 1 (Resume Screening) unlocked.',
      total_weighted_score: 0,
      is_simulated: isSimulated,
      metadata: {
        ...(resumeText ? { resume_text: resumeText } : {}),
        ...(resumeFilePath ? { resume_file_path: resumeFilePath } : {}),
        ...(resumeFileName ? { resume_file_name: resumeFileName } : {})
      },
      created_at: new Date().toISOString()
    };
    apps[appId] = newApp;
    this.saveAppsStore(apps);
    return newApp;
  }

  /**
   * Restore Candidate Application from Backend by Email & Role
   */
  async restoreApplication(
    candidateEmail: string,
    jobRole?: string
  ): Promise<{
    success: boolean;
    application?: CandidateApplication;
    data?: CandidateStepperProgress;
    error?: string;
  }> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/candidate-applications/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_email: candidateEmail, job_role: jobRole })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.application) {
          const apps = this.getAppsStore();
          apps[body.application.application_id] = body.application;
          this.saveAppsStore(apps);
          return {
            success: true,
            application: body.application,
            data: body.data
          };
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errData.detail || 'Application not found on server'
        };
      }
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Network error restoring application'
      };
    }
    return { success: false, error: 'Failed to restore application' };
  }

  /**
   * Retrieve Candidate Progress Stepper (Server-backed + Local Fallback)
   * Enforces sequential gating: Round 1 unlocked, Round N unlocked ONLY IF Round N-1 is passed!
   */
  async getStepperProgress(applicationId: string, isRecruiter: boolean = false): Promise<CandidateStepperProgress> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${FASTAPI_BASE_URL}/api/candidate-applications/${applicationId}/status?is_recruiter=${isRecruiter ? 'true' : 'false'}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          if (body.data.application) {
            const apps = this.getAppsStore();
            apps[body.data.application.application_id] = body.data.application;
            this.saveAppsStore(apps);
          }
          return body.data;
        }
      }
    } catch {
      // Local fallback
    }

    const apps = this.getAppsStore();
    const app = apps[applicationId];
    if (!app) {
      throw new Error(`Application ${applicationId} not found`);
    }

    const pipeline = await this.getPipelineByRole(app.job_role);
    const attempts = this.getAttemptsStore();
    const appAttempts = Object.values(attempts).filter(a => a.application_id === applicationId);
    const attemptsByRound = new Map<string, CandidateRoundAttempt>();
    appAttempts.forEach(att => attemptsByRound.set(att.round_id, att));

    let prevPassed = true;
    const stepperRounds: StepperRoundItem[] = pipeline.rounds
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(r => {
        const attempt = attemptsByRound.get(r.round_id);
        let status: RoundStatus = 'locked';

        if (attempt) {
          status = attempt.status;
          if (attempt.status === 'passed') {
            prevPassed = true;
          } else {
            prevPassed = false;
          }
        } else {
          if (prevPassed && app.status === 'in_pipeline') {
            status = 'unlocked';
          } else {
            status = 'locked';
          }
          prevPassed = false;
        }

        return {
          ...r,
          status,
          attempt_id: attempt?.attempt_id,
          score_data: attempt?.score !== undefined && attempt.score !== null ? {
            score: attempt.score,
            passed: attempt.passed,
            cutoff: r.cutoff_score,
            started_at: attempt.started_at,
            ended_at: attempt.ended_at
          } : null,
          is_simulated: attempt?.is_simulated || app.is_simulated
        };
      });

    return {
      application: app,
      rounds: stepperRounds,
      overall_status: app.status,
      status_message: app.status_message,
      current_round_order: app.current_round_order,
      total_weighted_score: app.total_weighted_score
    };
  }

  /**
   * Validate whether candidate is authorized to start a specific round (Sequential Gating)
   */
  async validateCanStartRound(
    applicationId: string,
    roundId: string
  ): Promise<{ can_start: boolean; reason?: string; notFound?: boolean; round?: any }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${FASTAPI_BASE_URL}/api/candidate-applications/${applicationId}/rounds/${roundId}/validate`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return {
          can_start: data.can_start,
          reason: data.reason,
          round: data.round
        };
      } else if (res.status === 404) {
        return {
          can_start: false,
          notFound: true,
          reason: "Candidate application not found."
        };
      } else if (res.status === 403) {
        const err = await res.json().catch(() => ({}));
        return {
          can_start: false,
          reason: err.detail || "Sequential gating violation: Previous round must be passed first."
        };
      }
    } catch {
      // Local fallback check
    }

    const apps = this.getAppsStore();
    const app = apps[applicationId];
    if (!app) {
      return { can_start: false, notFound: true, reason: "Candidate application not found." };
    }

    const pipeline = await this.getPipelineByRole(app.job_role);
    const round = pipeline.rounds.find(r => r.round_id === roundId);
    if (!round) {
      return { can_start: false, reason: "Round not found in pipeline." };
    }

    if (round.order === 1) {
      return { can_start: true, round };
    }

    // Check all previous rounds
    const prevRounds = pipeline.rounds.filter(r => r.order < round.order);
    const attempts = this.getAttemptsStore();
    for (const prev of prevRounds) {
      const prevAttempt = Object.values(attempts).find(
        a => a.application_id === applicationId && a.round_id === prev.round_id
      );
      if (!prevAttempt || prevAttempt.status !== 'passed') {
        return {
          can_start: false,
          reason: `Round ${prev.order} (${prev.title}) must be passed before accessing Round ${round.order} (${round.title}).`,
          round
        };
      }
    }

    return { can_start: true, round };
  }

  /**
   * Start Round Attempt with Sequential Gating Validation
   * Returns error if candidate attempts to bypass previous round!
   */
  async startRoundAttempt(
    applicationId: string,
    roundId: string,
    isSimulated = false,
    interviewId?: string
  ): Promise<{
    success: boolean;
    attempt?: CandidateRoundAttempt;
    error?: string;
    status?: string;
    message?: string;
    round?: any;
  }> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/candidate-applications/${applicationId}/rounds/${roundId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_simulated: isSimulated, interview_id: interviewId })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errData.detail || `Server returned ${res.status}: Gating check failed.`
        };
      }
      const data = await res.json();
      if (data.status === 'coming_soon') {
        return {
          success: true,
          status: 'coming_soon',
          message: data.message || 'Round is unlocked but not available yet',
          round: data.round
        };
      }
      if (data.success && data.attempt) {
        const attempts = this.getAttemptsStore();
        attempts[data.attempt.attempt_id] = data.attempt;
        this.saveAttemptsStore(attempts);
        return { success: true, attempt: data.attempt, round: data.round };
      }
    } catch {
      // Local sequential gating enforcement
    }

    const apps = this.getAppsStore();
    const app = apps[applicationId];
    if (!app) return { success: false, error: 'Application not found' };

    const pipeline = await this.getPipelineByRole(app.job_role);
    const round = pipeline.rounds.find(r => r.round_id === roundId);
    if (!round) return { success: false, error: 'Round not found in pipeline' };

    // Sequential Gating Check
    if (round.order > 1) {
      const prevRound = pipeline.rounds.find(r => r.order === round.order - 1);
      const attempts = this.getAttemptsStore();
      const prevAttempt = Object.values(attempts).find(
        a => a.application_id === applicationId && a.round_id === prevRound?.round_id
      );
      if (!prevAttempt || prevAttempt.status !== 'passed') {
        return {
          success: false,
          error: `Sequential Gating Violation: Round ${round.order - 1} (${prevRound?.title}) must be passed before accessing Round ${round.order} (${round.title}).`
        };
      }
    }

    const attempts = this.getAttemptsStore();
    const existing = Object.values(attempts).find(
      a => a.application_id === applicationId && a.round_id === roundId
    );

    if (existing) {
      if (existing.status === 'passed') {
        return { success: false, error: `Round ${round.order} has already been completed and passed.` };
      }
      if (existing.status === 'failed' && !existing.retake_allowed) {
        return { success: false, error: `Round ${round.order} failed cutoff and retake is locked. Recruiter override required.` };
      }
      existing.status = 'in_progress';
      existing.is_simulated = isSimulated;
      if (interviewId) existing.interview_id = interviewId;
      this.saveAttemptsStore(attempts);
      return { success: true, attempt: existing };
    }

    const attId = `att-${Date.now().toString(36)}`;
    const newAttempt: CandidateRoundAttempt = {
      attempt_id: attId,
      application_id: applicationId,
      candidate_email: app.candidate_email,
      round_id: roundId,
      round_type: round.round_type,
      round_order: round.order,
      attempt_number: 1,
      status: 'in_progress',
      is_simulated: isSimulated,
      retake_allowed: false,
      interview_id: interviewId,
      started_at: new Date().toISOString()
    };
    attempts[attId] = newAttempt;
    this.saveAttemptsStore(attempts);
    return { success: true, attempt: newAttempt };
  }

  /**
   * Submit Normalized Score (0-100) and unlock next round if cutoff passed
   */
  async submitNormalizedScore(
    attemptId: string,
    score: number,
    feedback: string,
    details?: Record<string, any>,
    isSimulated = false,
    appId?: string,
    roundId?: string
  ): Promise<{ success: boolean; result?: any; stepper?: CandidateProgressResponse; error?: string }> {
    const attempts = this.getAttemptsStore();
    const attempt = attempts[attemptId];
    const targetAppId = attempt?.application_id || appId || details?.application_id;
    const targetRoundId = attempt?.round_id || roundId || details?.round_id;

    if (!targetAppId || !targetRoundId) {
      if (!attempt) return { success: false, error: 'Attempt not found' };
    }

    // Step B Guard: Prevent client-side score submission for Round 1 (Resume Screening)
    if (attempt?.round_order === 1 || attempt?.round_type === 'resume_screening' || details?.round_type === 'resume_screening') {
      return {
        success: false,
        error: 'Client-side score submission for Round 1 (Resume Screening) is prohibited. Resume evaluation must be performed server-side via pipelineService.screenApplication()'
      };
    }

    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/candidate-applications/${targetAppId}/rounds/${targetRoundId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          feedback,
          details,
          is_simulated: isSimulated
        })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          // If server returned updated stepper, sync local stores and return immediately!
          if (body.data) {
            const apps = this.getAppsStore();
            if (apps[targetAppId] && body.data.application) {
              apps[targetAppId] = { ...apps[targetAppId], ...body.data.application };
              this.saveAppsStore(apps);
            }
            if (attempt) {
              attempt.score = Math.round(score);
              attempt.passed = body.result?.passed ?? (score >= (body.result?.cutoff ?? 60));
              attempt.status = attempt.passed ? 'passed' : 'failed';
              attempts[attemptId] = attempt;
              this.saveAttemptsStore(attempts);
            }
            return {
              success: true,
              result: body.result,
              stepper: body.data
            };
          }
        }
      }
    } catch {
      // Local fallback
    }

    const apps = this.getAppsStore();
    const app = targetAppId ? apps[targetAppId] : null;
    if (!app) return { success: false, error: 'Application not found' };

    const pipeline = await this.getPipelineByRole(app.job_role);
    const round = pipeline.rounds.find(r => r.round_id === targetRoundId);
    const cutoff = round?.cutoff_score || 60;
    const passed = score >= cutoff;

    if (attempt) {
      attempt.score = Math.round(score);
      attempt.passed = passed;
      attempt.status = passed ? 'passed' : 'failed';
      attempt.ended_at = new Date().toISOString();
      attempt.is_simulated = isSimulated;
      this.saveAttemptsStore(attempts);
    }

    if (passed) {
      const nextRound = pipeline.rounds.find(r => r.order === (round?.order || 0) + 1);
      if (nextRound) {
        app.current_round_order = Math.max(app.current_round_order || 1, nextRound.order);
        app.status = 'in_pipeline';
        app.status_message = `Passed Round ${round?.order} (${round?.title}). Round ${nextRound.order} unlocked.`;
      } else {
        app.status = 'qualified';
        app.status_message = 'All 6 pipeline rounds successfully completed!';
      }
    } else {
      if (round?.on_fail_action === 'hold') {
        app.status = 'on_hold';
        app.status_message = `On hold for manual review at Round ${round?.order} (${round?.title}). Score: ${score}/100.`;
      } else {
        app.status = 'not_selected';
        app.status_message = `Not selected at Round ${round?.order} (${round?.title}). Score: ${score}/100 (Cutoff: ${cutoff}).`;
      }
    }

    // Update cumulative weighted score
    app.total_weighted_score = Math.round((app.total_weighted_score + score) / 2);
    this.saveAppsStore(apps);

    const updatedStepper = await this.getStepperProgress(app.application_id);

    return {
      success: true,
      result: {
        score,
        passed,
        cutoff,
        status: passed ? 'passed' : 'failed',
        application_status: app.status
      },
      stepper: updatedStepper || undefined
    };
  }

  /**
   * Recruiter Override: promote, allow retake, or reject with audit log
   */
  async applyRecruiterOverride(
    applicationId: string,
    roundId: string,
    action: 'promote' | 'allow_retake' | 'reject',
    reason: string,
    recruiterName = 'Alex Morgan'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/candidate-applications/${applicationId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_id: roundId,
          action,
          reason,
          recruiter_name: recruiterName
        })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          // Success from backend
        }
      }
    } catch {
      // Local fallback
    }

    const apps = this.getAppsStore();
    const app = apps[applicationId];
    if (!app) return { success: false, error: 'Application not found' };

    const pipeline = await this.getPipelineByRole(app.job_role);
    const round = pipeline.rounds.find(r => r.round_id === roundId);
    if (!round) return { success: false, error: 'Round not found' };

    const attempts = this.getAttemptsStore();
    const attempt = Object.values(attempts).find(
      a => a.application_id === applicationId && a.round_id === roundId
    );

    if (action === 'promote') {
      if (attempt) {
        attempt.status = 'passed';
        attempt.passed = true;
      }
      const nextRound = pipeline.rounds.find(r => r.order === round.order + 1);
      app.status = 'in_pipeline';
      if (nextRound) {
        app.current_round_order = nextRound.order;
        app.status_message = `Promoted by recruiter (${recruiterName}): ${reason}. Round ${nextRound.order} unlocked.`;
      } else {
        app.status = 'qualified';
        app.status_message = `Promoted by recruiter (${recruiterName}): Complete!`;
      }
    } else if (action === 'allow_retake') {
      if (attempt) {
        attempt.status = 'unlocked';
        attempt.retake_allowed = true;
      }
      app.status = 'in_pipeline';
      app.status_message = `Retake authorized by recruiter (${recruiterName}): ${reason}.`;
    } else if (action === 'reject') {
      app.status = 'not_selected';
      app.status_message = `Candidate rejected by recruiter (${recruiterName}): ${reason}.`;
    }

    this.saveAppsStore(apps);
    if (attempt) this.saveAttemptsStore(attempts);

    // Save audit log
    const overrides = this.getOverridesStore();
    overrides.unshift({
      override_id: `ovr-${Date.now().toString(36)}`,
      application_id: applicationId,
      round_id: roundId,
      candidate_email: app.candidate_email,
      action,
      reason,
      overridden_by: recruiterName,
      overridden_at: new Date().toISOString()
    });
    this.saveOverridesStore(overrides);

    return { success: true };
  }

  /**
   * List all tracked applications
   */
  listAllApplications(): CandidateApplication[] {
    const apps = this.getAppsStore();
    return Object.values(apps);
  }

  /**
   * List all recruiter overrides
   */
  listOverrides(): PipelineOverride[] {
    return this.getOverridesStore();
  }

  // ─────────────────────────────────────────────────────────────
  // Round 2 Aptitude Test API Endpoints
  // ─────────────────────────────────────────────────────────────

  async getAptitudeConfig(jobRole: string = 'default'): Promise<AptitudeConfig | null> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/aptitude/config?job_role=${encodeURIComponent(jobRole)}`);
      if (res.ok) {
        const data = await res.json();
        return data.config;
      }
    } catch (e) {
      console.warn('Could not fetch aptitude config from backend:', e);
    }
    return null;
  }

  async getAptitudeStats(): Promise<{ total_questions: number; by_section: Record<string, number>; by_difficulty: Record<string, number> } | null> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/aptitude/questions/stats`);
      if (res.ok) {
        const data = await res.json();
        return data.data || data.stats;
      }
    } catch (e) {
      console.warn('Could not fetch question bank stats:', e);
    }
    return null;
  }

  async updateAptitudeConfig(config: AptitudeConfig): Promise<{ success: boolean; config?: AptitudeConfig; error?: string }> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/aptitude/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Failed to save config' };
      }
      return { success: true, config: data.config };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error saving config' };
    }
  }

  async startAptitudeTest(
    applicationId: string,
    roundId?: string,
    allowRetake: boolean = false,
    confirmedInstructions: boolean = true
  ): Promise<{ success: boolean; session?: AptitudeTestSession; error?: string; isForbidden?: boolean }> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/aptitude/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          round_id: roundId,
          allow_retake: allowRetake,
          confirmed_instructions: confirmedInstructions
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Could not start aptitude test session',
          isForbidden: res.status === 403
        };
      }
      return { success: true, session: data.session };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error starting aptitude test' };
    }
  }

  async getAptitudeSession(applicationId: string, roundId?: string): Promise<{ success: boolean; session?: AptitudeTestSession; error?: string; isForbidden?: boolean }> {
    try {
      const url = `${FASTAPI_BASE_URL}/api/aptitude/session/${encodeURIComponent(applicationId)}${roundId ? `?round_id=${encodeURIComponent(roundId)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Could not retrieve aptitude session',
          isForbidden: res.status === 403
        };
      }
      return { success: true, session: data.session };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error fetching session' };
    }
  }

  async autosaveAptitudeAnswer(applicationId: string, questionId: string, selectedOption: string | null): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/aptitude/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          question_id: questionId,
          selected_option: selectedOption
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Failed to autosave answer' };
      }
      return { success: true, data: data.data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error autosaving answer' };
    }
  }

  async toggleAptitudeReview(applicationId: string, questionId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/aptitude/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, question_id: questionId })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Failed to toggle review flag' };
      }
      return { success: true, data: data.data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error toggling review' };
    }
  }

  async logAptitudeTabSwitch(applicationId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/aptitude/tab-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Failed to log tab switch' };
      }
      return { success: true, data: data.data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error logging tab switch' };
    }
  }

  async submitAptitudeTest(applicationId: string, roundId?: string): Promise<{ success: boolean; result?: AptitudeResult; error?: string; isForbidden?: boolean }> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/aptitude/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, round_id: roundId })
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Failed to submit aptitude test',
          isForbidden: res.status === 403
        };
      }
      return { success: true, result: data.result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error submitting test' };
    }
  }

  async getAptitudeRecruiterAudit(applicationId: string): Promise<{ success: boolean; audit?: any; error?: string }> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/aptitude/recruiter/candidate/${encodeURIComponent(applicationId)}`);
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Audit data not found' };
      }
      return { success: true, audit: data.audit };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error fetching audit' };
    }
  }

  /**
   * Step B: Trigger server-side ATS resume screening using LLM and strict evidence verification.
   * Score is computed ONLY on the server.
   */
  async screenApplication(
    applicationId: string,
    jobRole?: string,
    allowKeywordFallback: boolean = false,
    isRecruiter: boolean = false
  ): Promise<{
    success: boolean;
    score?: number;
    passed?: boolean;
    cutoff?: number;
    is_borderline?: boolean;
    borderline_margin?: number;
    evaluation_method?: string;
    model?: string;
    status?: string;
    message?: string;
    rejection_message?: any;
    on_hold_message?: any;
    matched_skills?: string[];
    missing_skills?: string[];
    matched_details?: Array<{ skill: string; category: string; status: string; evidence_quote?: string; verified: boolean }>;
    missing_details?: Array<{ skill: string; category: string; status: string; dropped_reason?: string; unverified_quote?: string }>;
    score_breakdown?: any;
    stepper?: any;
    flagged?: boolean;
    error?: string;
  }> {
    try {
      const url = `${FASTAPI_BASE_URL}/api/applications/${encodeURIComponent(applicationId)}/screen?is_recruiter=${isRecruiter ? 'true' : 'false'}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_role: jobRole,
          allow_keyword_fallback: allowKeywordFallback
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'ATS screening evaluation failed on server'
        };
      }
      return data;
    } catch (e: any) {
      return {
        success: false,
        error: e.message || 'Network error triggering resume screening'
      };
    }
  }

  /**
   * Get role requirements & job description (LLM generated or recruiter defined)
   */
  async getRoleRequirements(jobRole: string): Promise<{
    success: boolean;
    requirements?: {
      role_id: string;
      job_role: string;
      job_description: string;
      must_have_skills: string[];
      nice_to_have_skills: string[];
      experience_expectations: string;
      updated_at: string;
    };
    error?: string;
  }> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/role-requirements/${encodeURIComponent(jobRole)}`);
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Failed to fetch role requirements' };
      }
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error fetching role requirements' };
    }
  }

  /**
   * Save recruiter-modified role requirements & job description
   */
  async saveRoleRequirements(
    jobRole: string,
    requirements: {
      job_description?: string;
      must_have_skills: string[];
      nice_to_have_skills: string[];
      experience_expectations?: string;
    }
  ): Promise<{ success: boolean; message?: string; requirements?: any; error?: string }> {
    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/api/role-requirements/${encodeURIComponent(jobRole)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requirements)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Failed to save role requirements' };
      }
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error saving role requirements' };
    }
  }
}

export const pipelineService = new PipelineService();
