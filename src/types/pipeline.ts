/**
 * Multi-Round Hiring Pipeline Type Definitions
 */

export type StandardRoundType =
  | 'resume_screening'
  | 'aptitude_test'
  | 'coding_round'
  | 'group_discussion'
  | 'technical_interview'
  | 'hr_interview';

export type RoundStatus =
  | 'locked'
  | 'unlocked'
  | 'in_progress'
  | 'completed'
  | 'passed'
  | 'failed';

export type OnFailAction = 'reject' | 'hold';

export type ApplicationStatus =
  | 'in_pipeline'
  | 'qualified'
  | 'not_selected'
  | 'on_hold';

export interface RoundConfig {
  round_id: string;
  round_type: StandardRoundType;
  title: string;
  description: string;
  order: number;
  duration_minutes: number;
  cutoff_score: number; // 0-100 (Default: 60)
  weight: number; // percentage in cumulative score
  on_fail_action: OnFailAction;
  is_active: boolean;
}

export interface PipelineConfig {
  pipeline_id: string;
  job_role: string;
  title: string;
  description?: string;
  is_active: boolean;
  total_rounds: number;
  rounds: RoundConfig[];
  created_at?: string;
  updated_at?: string;
}

export interface NormalizedScore {
  score: number; // 0-100
  passed: boolean;
  cutoff: number;
  feedback: string;
  details?: Record<string, any>;
  is_simulated?: boolean;
}

export interface CandidateRoundAttempt {
  attempt_id: string;
  application_id: string;
  candidate_email: string;
  round_id: string;
  round_type: StandardRoundType;
  round_order: number;
  attempt_number: number;
  status: RoundStatus;
  score?: number | null;
  passed?: boolean | null;
  is_simulated: boolean;
  retake_allowed: boolean;
  interview_id?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface CandidateApplication {
  application_id: string;
  candidate_email: string;
  candidate_name: string;
  job_role: string;
  pipeline_id: string;
  current_round_order: number;
  status: ApplicationStatus;
  status_message: string;
  total_weighted_score: number;
  is_simulated: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface StepperRoundItem extends RoundConfig {
  status: RoundStatus;
  attempt_id?: string | null;
  score_data?: {
    score?: number | null;
    passed?: boolean | null;
    cutoff: number;
    started_at?: string | null;
    ended_at?: string | null;
  } | null;
  is_simulated?: boolean;
}

export interface CandidateStepperProgress {
  application: CandidateApplication;
  rounds: StepperRoundItem[];
  overall_status: ApplicationStatus;
  status_message: string;
  current_round_order: number;
  total_weighted_score: number;
}

export interface PipelineOverride {
  override_id: string;
  application_id: string;
  round_id: string;
  candidate_email: string;
  action: 'promote' | 'allow_retake' | 'reject';
  reason: string;
  overridden_by: string;
  overridden_at: string;
  previous_status?: string;
  new_status?: string;
}

export interface AptitudeQuestion {
  question_id: string;
  section: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  options: string[];
}

export interface AptitudeSectionStats {
  total: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
}

export interface AptitudeQuestionAudit {
  question_id: string;
  section: string;
  difficulty: string;
  question_text: string;
  candidate_answer?: string | null;
  correct_answer: string;
  is_correct: boolean;
  status: 'correct' | 'incorrect' | 'skipped';
  explanation: string;
}

export interface AptitudeResult {
  score: number;
  passed: boolean;
  cutoff: number;
  feedback: string;
  details: {
    round_type: string;
    section_breakdown: Record<string, AptitudeSectionStats>;
    total_questions: number;
    correct_count: number;
    incorrect_count: number;
    unattempted_count: number;
    negative_marking_applied: boolean;
    negative_penalty: number;
    tab_switches: number;
    time_taken_seconds: number;
    is_auto_submit?: boolean;
    completed_at?: string;
  };
  question_audit?: AptitudeQuestionAudit[];
  stepper?: CandidateStepperProgress;
}

export interface AptitudeTestSession {
  session_id: string;
  application_id: string;
  round_id: string;
  attempt_id: string;
  status: 'in_progress' | 'completed' | 'expired';
  duration_minutes: number;
  remaining_seconds: number;
  negative_marking: boolean;
  negative_penalty: number;
  tab_switches: number;
  selected_questions: AptitudeQuestion[];
  answers: Record<string, string>;
  marked_review: string[];
  result?: AptitudeResult | null;
}

export interface AptitudeConfig {
  config_id?: string;
  job_role: string;
  quant_count: number;
  logic_count: number;
  verbal_count: number;
  total_questions?: number;
  difficulty_mix: string;
  duration_minutes: number;
  cutoff_score: number;
  negative_marking: boolean;
  negative_penalty: number;
  tab_switch_limit: number;
  updated_at?: string;
}
