import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Lock,
  PlayCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { pipelineService } from '@/services/pipelineService';
import {
  CandidateStepperProgress,
  StepperRoundItem,
  RoundStatus
} from '@/types/pipeline';

interface CandidateProgressStepperProps {
  progress?: CandidateStepperProgress;
  applicationId?: string;
  compact?: boolean;
  onStartRound?: (round: StepperRoundItem) => void;
  showAdminOverrides?: boolean;
  onOverrideAction?: (roundId: string, action: 'promote' | 'allow_retake' | 'reject') => void;
}

const getRoundIcon = (type: string) => {
  switch (type) {
    case 'resume_screening':
      return 'description';
    case 'aptitude_test':
      return 'quiz';
    case 'coding_round':
      return 'terminal';
    case 'group_discussion':
      return 'groups';
    case 'technical_interview':
      return 'videocam';
    case 'hr_interview':
      return 'psychology';
    default:
      return 'check_circle';
  }
};

export const CandidateProgressStepper: React.FC<CandidateProgressStepperProps> = ({
  progress: initialProgress,
  applicationId,
  compact = false,
  onStartRound,
  showAdminOverrides = false,
  onOverrideAction
}) => {
  const navigate = useNavigate();
  const [loadedProgress, setLoadedProgress] = React.useState<CandidateStepperProgress | null>(initialProgress || null);
  const [loading, setLoading] = React.useState<boolean>(!initialProgress && !!applicationId);
  const [noticeRound, setNoticeRound] = React.useState<StepperRoundItem | null>(null);

  React.useEffect(() => {
    if (initialProgress) {
      setLoadedProgress(initialProgress);
      return;
    }
    if (applicationId) {
      setLoading(true);
      pipelineService.getStepperProgress(applicationId)
        .then((p) => {
          if (p) setLoadedProgress(p);
        })
        .finally(() => setLoading(false));
    }
  }, [initialProgress, applicationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 text-xs text-slate-500">
        Loading pipeline progression...
      </div>
    );
  }

  if (!loadedProgress) {
    return null;
  }

  const { application, rounds, overall_status, status_message } = loadedProgress;

  const handleStart = (round: StepperRoundItem) => {
    if (onStartRound) {
      onStartRound(round);
      return;
    }

    if (round.round_type === 'technical_interview') {
      navigate(`/interview/${encodeURIComponent(application.candidate_name)}`, {
        state: {
          candidateName: application.candidate_name,
          candidateEmail: application.candidate_email,
          jobTitle: application.job_role,
          applicationId: application.application_id,
          roundId: round.round_id,
          attemptId: round.attempt_id
        }
      });
    } else {
      setNoticeRound(round);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col gap-6">
      {noticeRound && (
        <div className="p-3.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">ℹ</span>
            <div>
              <p className="font-semibold">Round {noticeRound.order}: {noticeRound.title} — Coming Soon</p>
              <p className="mt-0.5 text-blue-800 dark:text-blue-300">
                This round module is currently in preparation. Please check back soon or proceed with active rounds.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNoticeRound(null)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-semibold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Candidate Hiring Progression
            </h3>
            <Badge
              variant="outline"
              className={`text-[11px] font-mono font-semibold px-2 py-0.5 ${
                overall_status === 'qualified'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : overall_status === 'not_selected'
                  ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                  : overall_status === 'on_hold'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              }`}
            >
              {overall_status === 'qualified' && 'Qualified • Complete'}
              {overall_status === 'not_selected' && 'Not Selected'}
              {overall_status === 'on_hold' && 'On Hold (Review)'}
              {overall_status === 'in_pipeline' && `Round ${progress.current_round_order} of 6`}
            </Badge>

            {application.is_simulated && (
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800" title="Simulated attempt: demo mode">
                SIMULATED
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Candidate: <span className="font-semibold text-slate-700 dark:text-slate-200">{application.candidate_name}</span> ({application.candidate_email}) • Role: <span className="font-semibold text-slate-700 dark:text-slate-200">{application.job_role}</span>
          </p>
        </div>

        {/* Status Message Banner */}
        <div className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
          <span className="truncate max-w-xs">{status_message}</span>
        </div>
      </div>

      {/* Sequential Stepper Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {rounds.map((round) => {
          const isPassed = round.status === 'passed';
          const isFailed = round.status === 'failed';
          const isCurrent = round.status === 'unlocked' || round.status === 'in_progress';
          const isLocked = round.status === 'locked';

          return (
            <div
              key={round.round_id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 relative ${
                isPassed
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 shadow-2xs'
                  : isFailed
                  ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-800/80'
                  : isCurrent
                  ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-600 ring-1 ring-blue-500/30 shadow-xs'
                  : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70'
              }`}
            >
              {/* Top row: Order pill & Status indicator */}
              <div className="flex items-center justify-between gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                  isPassed
                    ? 'bg-emerald-600 text-white'
                    : isFailed
                    ? 'bg-red-600 text-white'
                    : isCurrent
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}>
                  {round.order}
                </span>

                <div className="flex items-center gap-1">
                  {round.is_simulated && (
                    <span className="text-[9px] font-mono px-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                      SIM
                    </span>
                  )}
                  {isPassed && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                    </span>
                  )}
                  {isFailed && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                      <XCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 animate-pulse">
                      <PlayCircle className="w-3.5 h-3.5" /> Active
                    </span>
                  )}
                  {isLocked && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <Lock className="w-3.5 h-3.5" /> Locked
                    </span>
                  )}
                </div>
              </div>

              {/* Round Details */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-700 dark:text-blue-400">
                    {getRoundIcon(round.round_type)}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {round.title}
                  </h4>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                  {round.description}
                </p>
              </div>

              {/* Parameters & Telemetry */}
              <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[10px] flex flex-col gap-1">
                <div className="flex justify-between text-slate-500 dark:text-slate-400 font-mono">
                  <span>Duration:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{round.duration_minutes}m</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400 font-mono">
                  <span>Cutoff:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{round.cutoff_score}%</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400 font-mono">
                  <span>Weight:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{round.weight}%</span>
                </div>
                {round.score_data?.score !== undefined && (
                  <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-700 font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Score:</span>
                    <span className={round.score_data.passed ? "text-emerald-600 dark:text-emerald-400 font-mono" : "text-red-600 dark:text-red-400 font-mono"}>
                      {round.score_data.score}/100
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div>
                {isPassed && (
                  <div className="text-[10px] text-center text-emerald-700 dark:text-emerald-400 font-medium py-1">
                    ✓ Requirement Met
                  </div>
                )}
                {isFailed && (
                  <div className="text-[10px] text-center text-red-600 dark:text-red-400 font-medium py-1">
                    Cutoff not met ({round.score_data?.score || 0} &lt; {round.cutoff_score})
                  </div>
                )}
                {isCurrent && (
                  <Button
                    size="sm"
                    onClick={() => handleStart(round)}
                    className="w-full h-7 text-xs bg-blue-700 hover:bg-blue-800 text-white font-medium flex items-center justify-center gap-1 shadow-xs rounded-md"
                  >
                    <span>Start Round</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
                {isLocked && (
                  <div className="text-[10px] text-center text-slate-400 py-1 flex items-center justify-center gap-1 font-mono">
                    <Lock className="w-3 h-3" /> Complete R{round.order - 1}
                  </div>
                )}

                {/* Recruiter override actions if enabled */}
                {showAdminOverrides && onOverrideAction && (
                  <div className="flex items-center gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-800 mt-1">
                    <button
                      onClick={() => onOverrideAction(round.round_id, 'promote')}
                      title="Promote / Force-Pass Round"
                      className="flex-1 text-[9px] py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded hover:bg-emerald-200 transition-colors font-medium text-center"
                    >
                      Promote
                    </button>
                    <button
                      onClick={() => onOverrideAction(round.round_id, 'allow_retake')}
                      title="Allow Candidate Retake"
                      className="flex-1 text-[9px] py-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 transition-colors font-medium text-center"
                    >
                      Retake
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
