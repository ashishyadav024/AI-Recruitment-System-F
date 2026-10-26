import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Award,
  Layers,
  X,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { pipelineService } from '@/services/pipelineService';
import {
  StepperRoundItem,
  AptitudeTestSession,
  AptitudeQuestion,
  AptitudeResult,
  AptitudeConfig
} from '@/types/pipeline';

interface AptitudeTestModalProps {
  applicationId: string;
  round: StepperRoundItem;
  candidateName: string;
  candidateEmail: string;
  onClose: () => void;
  onComplete: (result?: any) => void;
  isFullRoute?: boolean;
  initialStage?: 'instructions' | 'test' | 'result';
}

export const AptitudeTestModal: React.FC<AptitudeTestModalProps> = ({
  applicationId,
  round,
  candidateName,
  candidateEmail,
  onClose,
  onComplete,
  isFullRoute = false,
  initialStage = 'instructions'
}) => {
  // Modal Stages: 'instructions' | 'test' | 'result'
  const [stage, setStage] = useState<'instructions' | 'test' | 'result'>(initialStage);

  // Test Session State
  const [session, setSession] = useState<AptitudeTestSession | null>(null);
  const [aptitudeConfig, setAptitudeConfig] = useState<AptitudeConfig | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasReadInstructions, setHasReadInstructions] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Question Navigation
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedReview, setMarkedReview] = useState<string[]>([]);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);

  // Timer State (in seconds) - 30 minutes default
  const [timeLeft, setTimeLeft] = useState<number>(round.duration_minutes * 60 || 1800);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Anti-Cheat Tab Switch & Fullscreen State
  const [tabSwitches, setTabSwitches] = useState<number>(0);
  const [tabWarning, setTabWarning] = useState<string | null>(null);
  const [resumeToast, setResumeToast] = useState<string | null>(null);
  const [fullscreenViolation, setFullscreenViolation] = useState<string | null>(null);

  // Submission State
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<AptitudeResult | null>(null);

  // Format MM:SS for countdown timer
  const formatTime = (secs: number) => {
    const mins = Math.floor(Math.max(0, secs) / 60);
    const rem = Math.max(0, secs) % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Section Grouping helper
  const sections = ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'];

  // Check for active in-progress session on initial mount
  useEffect(() => {
    let isMounted = true;
    const checkActiveSession = async () => {
      try {
        console.log("[FRONTEND TRACE - AptitudeTestModal] checkActiveSession querying session for app:", applicationId);
        const [res, cfg] = await Promise.all([
          pipelineService.getAptitudeSession(applicationId, round.round_id),
          pipelineService.getAptitudeConfig()
        ]);
        console.log("[FRONTEND TRACE - AptitudeTestModal] getAptitudeSession response:", res);
        if (isMounted && cfg) {
          setAptitudeConfig(cfg);
        }
        if (isMounted && res.success && res.session) {
          const sess = res.session;
          console.log("[FRONTEND TRACE - AptitudeTestModal] Session found with status:", sess.status);
          setSession(sess);
          setAnswers(sess.answers || {});
          setMarkedReview(sess.marked_review || []);
          setTabSwitches(sess.tab_switches || 0);
          setTimeLeft(sess.remaining_seconds ?? sess.duration_minutes * 60);

          if (sess.status === 'completed' && sess.result) {
            console.log("[FRONTEND TRACE - AptitudeTestModal] Setting stage to 'result'");
            setFinalResult(sess.result);
            setStage('result');
          } else if (sess.status === 'in_progress') {
            console.log("[FRONTEND TRACE - AptitudeTestModal] Setting stage to 'test' (auto-resuming test)!");
            setStage('test');
            const mins = Math.floor(Math.max(0, sess.remaining_seconds || 0) / 60);
            const rem = Math.max(0, sess.remaining_seconds || 0) % 60;
            const timeStr = `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
            setResumeToast(`Test resumed. Time remaining: ${timeStr}`);
            setTimeout(() => {
              if (isMounted) setResumeToast(null);
            }, 6000);
          }
        } else {
          console.log("[FRONTEND TRACE - AptitudeTestModal] No session returned. Staying on 'instructions' stage.");
        }
      } catch (err) {
        console.warn('Could not restore active session on mount:', err);
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };
    checkActiveSession();
    return () => {
      isMounted = false;
    };
  }, [applicationId, round.round_id]);

  // Start Assessment from Instructions
  const handleStartAssessment = async () => {
    if (!hasReadInstructions) return;
    setIsLoadingSession(true);
    setErrorMessage(null);
    try {
      // Browsers only permit fullscreen on user gesture: request on "Start Test" click
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {
        // Continue test without fullscreen if browser does not support or user cancels
      }

      const res = await pipelineService.startAptitudeTest(applicationId, round.round_id, false);
      if (!res.success || !res.session) {
        setErrorMessage(res.error || 'Could not initialize test session. Please ensure Round 1 is passed.');
        setIsLoadingSession(false);
        return;
      }

      setSession(res.session);
      setAnswers(res.session.answers || {});
      setMarkedReview(res.session.marked_review || []);
      setTabSwitches(res.session.tab_switches || 0);
      setTimeLeft(res.session.remaining_seconds || res.session.duration_minutes * 60);

      // If session is already completed, go straight to result view
      if (res.session.status === 'completed' && res.session.result) {
        setFinalResult(res.session.result);
        setStage('result');
      } else {
        setStage('test');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start aptitude session.');
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Server-Synchronized Timer Countdown Effect
  useEffect(() => {
    if (stage !== 'test' || isSubmitting) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-submit when timer expires
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage, isSubmitting]);

  // Anti-Cheat: Tab Switch & Window Blur Detection
  useEffect(() => {
    if (stage !== 'test' || isSubmitting) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        try {
          const logRes = await pipelineService.logAptitudeTabSwitch(applicationId);
          if (logRes.success && logRes.data) {
            const count = logRes.data.tab_switches;
            const limit = logRes.data.tab_switch_limit || 3;
            setTabSwitches(count);
            setTabWarning(
              `Tab switch detected (#${count} of ${limit}). Focus departures are logged for recruiter review.`
            );
            if (count >= limit) {
              handleFinalSubmit(true);
            }
          }
        } catch (e) {
          console.warn('Could not log tab switch event:', e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stage, isSubmitting, applicationId]);

  // Fullscreen Exit Tracking Effect (Non-blocking banner with return button)
  useEffect(() => {
    if (stage !== 'test' || isSubmitting) return;

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement) {
        // Exited fullscreen: count violation and keep questions visible
        try {
          const logRes = await pipelineService.logAptitudeTabSwitch(applicationId);
          if (logRes.success && logRes.data) {
            const count = logRes.data.tab_switches;
            const limit = logRes.data.tab_switch_limit || 3;
            setTabSwitches(count);
            setFullscreenViolation(
              `You exited fullscreen. Please return to fullscreen. Violations: ${count} of ${limit}`
            );
            if (count >= limit) {
              handleFinalSubmit(true);
            }
          }
        } catch (err) {
          console.warn('Failed to log fullscreen exit:', err);
        }
      } else {
        setFullscreenViolation(null);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [stage, isSubmitting, applicationId]);

  // Autosave Answer Selection
  const handleSelectOption = async (option: string) => {
    if (!session || stage !== 'test') return;
    const currentQ = session.selected_questions[currentIndex];
    if (!currentQ) return;

    const currentVal = answers[currentQ.question_id];
    // If clicking same option, allow clearing or keeping
    const newAnswers = { ...answers, [currentQ.question_id]: option };
    setAnswers(newAnswers);
    setSavingQuestionId(currentQ.question_id);

    try {
      const res = await pipelineService.autosaveAptitudeAnswer(applicationId, currentQ.question_id, option);
      if (res.data?.expired && res.data?.result) {
        // Time expired during autosave
        setFinalResult(res.data.result);
        setStage('result');
      } else if (res.data?.remaining_seconds !== undefined) {
        // Reconcile client timer with server
        setTimeLeft(res.data.remaining_seconds);
      }
    } catch (e) {
      console.warn('Autosave failed:', e);
    } finally {
      setSavingQuestionId(null);
    }
  };

  // Clear Option Selection
  const handleClearOption = async () => {
    if (!session || stage !== 'test') return;
    const currentQ = session.selected_questions[currentIndex];
    if (!currentQ) return;

    const newAnswers = { ...answers };
    delete newAnswers[currentQ.question_id];
    setAnswers(newAnswers);
    setSavingQuestionId(currentQ.question_id);

    try {
      await pipelineService.autosaveAptitudeAnswer(applicationId, currentQ.question_id, null);
    } catch (e) {
      console.warn('Clear option failed:', e);
    } finally {
      setSavingQuestionId(null);
    }
  };

  // Toggle Mark for Review
  const handleToggleReview = async () => {
    if (!session || stage !== 'test') return;
    const currentQ = session.selected_questions[currentIndex];
    if (!currentQ) return;

    const qid = currentQ.question_id;
    const updatedReview = markedReview.includes(qid)
      ? markedReview.filter((id) => id !== qid)
      : [...markedReview, qid];
    setMarkedReview(updatedReview);

    try {
      await pipelineService.toggleAptitudeReview(applicationId, qid);
    } catch (e) {
      console.warn('Toggle review failed:', e);
    }
  };

  // Final Submit Test Execution
  const handleFinalSubmit = async (isAutoSubmit: boolean = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsSubmitConfirmOpen(false);

    try {
      const res = await pipelineService.submitAptitudeTest(applicationId, round.round_id);
      if (res.success && res.result) {
        setFinalResult(res.result);
        setStage('result');
        onComplete(res.result);
      } else {
        setErrorMessage(res.error || 'Failed to submit test.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while submitting test.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (stage !== 'test' || isSubmitConfirmOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!session) return;
      const currentQ = session.selected_questions[currentIndex];
      if (!currentQ) return;

      if (e.key === 'ArrowRight' && currentIndex < session.selected_questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = parseInt(e.key) - 1;
        if (currentQ.options[optIdx]) {
          handleSelectOption(currentQ.options[optIdx]);
        }
      } else if (['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D'].includes(e.key)) {
        const charCode = e.key.toUpperCase().charCodeAt(0) - 65;
        if (currentQ.options[charCode]) {
          handleSelectOption(currentQ.options[charCode]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, currentIndex, session, isSubmitConfirmOpen]);

  // Questions breakdown by section
  const questions = session?.selected_questions || [];
  const currentQuestion = questions[currentIndex];

  const totalQuestions = questions.length || 15;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;
  const markedCount = markedReview.length;

  if (isCheckingSession) {
    return (
      <div
        className={
          isFullRoute
            ? "min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans"
            : "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans"
        }
      >
        <div className="flex flex-col items-center gap-3 text-slate-600 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Checking assessment status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={isFullRoute ? "min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 font-sans" : "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in"}>
      <div className={`w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl ${isFullRoute ? 'shadow-xl h-[92vh]' : 'shadow-2xl max-h-[92vh]'} flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 font-sans`}>
        {/* ─────────────────────────────────────────────────────────────
            HEADER BAR
        ───────────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              R2
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {round.title}
                </h2>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                >
                  Sequential Round 2
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Candidate: <span className="font-semibold text-slate-700 dark:text-slate-300">{candidateName}</span> • Cutoff: {round.cutoff_score}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {stage === 'test' && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-xs sm:text-sm ${
                  timeLeft < 60
                    ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 animate-pulse'
                    : timeLeft < 300
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200'
                }`}
                title="Server-synchronized countdown timer"
              >
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}

            {stage !== 'test' && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 font-bold hover:text-red-700">
              ✕
            </button>
          </div>
        )}

        {/* Resume Case Notification Toast */}
        {resumeToast && (
          <div className="px-6 py-2.5 bg-blue-50 dark:bg-blue-950/70 border-b border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-medium">{resumeToast}</span>
            </div>
            <button onClick={() => setResumeToast(null)} className="text-blue-500 font-bold hover:text-blue-700">
              ✕
            </button>
          </div>
        )}

        {/* Fullscreen Exit Warning Banner (Non-blocking: Keep question visible) */}
        {fullscreenViolation && stage === 'test' && (
          <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/70 border-b border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold">{fullscreenViolation}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                    setFullscreenViolation(null);
                  }
                } catch {
                  // ignore
                }
              }}
              className="text-xs h-7 px-3 bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-semibold rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
            >
              Return to fullscreen
            </Button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STAGE 1: INSTRUCTIONS PAGE
        ───────────────────────────────────────────────────────────── */}
        {stage === 'instructions' && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  {round.title || 'Aptitude Test'} — Instructions
                </h3>
                <Badge
                  variant="outline"
                  className="text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                >
                  Round 2 of 6
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Welcome to Round 2 of your recruitment process. Please review the structure, marking rules, and anti-cheat guidelines below before beginning your assessment.
              </p>
            </div>

            {/* Test Specification Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Questions</p>
                <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">15</p>
                <p className="text-[10px] text-slate-500 mt-0.5">5 questions per section</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Duration</p>
                <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                  {round.duration_minutes || aptitudeConfig?.duration_minutes || 30} min
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Server-timed countdown</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cutoff Score</p>
                <p className="text-xl font-bold font-mono text-blue-700 dark:text-blue-400 mt-1">
                  {round.cutoff_score || aptitudeConfig?.cutoff_score || 60}%
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Required to unlock Round 3</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Marking Rules</p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                  {aptitudeConfig?.negative_marking ? "Negative Marking ON" : "Negative Marking OFF"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {aptitudeConfig?.negative_marking
                    ? `+1 correct, -${aptitudeConfig.negative_penalty || 0.25} penalty for wrong`
                    : "+1 correct, no penalty for wrong"}
                </p>
              </div>
            </div>

            {/* Assessment Sections Breakdown */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Assessment Sections (15 Questions Total)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Quantitative</p>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                      5 Questions
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Percentages, ratios, probability, geometry, and arithmetic word problems.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Logical</p>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                      5 Questions
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Syllogisms, deductive arguments, series, arrangements, and clock/calendar logic.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Verbal</p>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                      5 Questions
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Vocabulary in context, grammar correction, sentence structure, and comprehension.
                  </p>
                </div>
              </div>
            </div>

            {/* Assessment Integrity & Navigation Rules */}
            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-3 text-xs text-blue-950 dark:text-blue-200">
              <h4 className="font-bold flex items-center gap-2 text-blue-900 dark:text-blue-300">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
                Assessment Rules & Integrity Guidelines
              </h4>
              <ul className="space-y-2 text-[12px] leading-relaxed text-blue-950 dark:text-blue-200">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="font-semibold text-blue-950 dark:text-blue-100">One attempt only:</strong> Once you begin the test, your attempt is recorded. You cannot restart the test or take a second attempt.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="font-semibold text-blue-950 dark:text-blue-100">Answers are saved automatically:</strong> Each answer selection is saved immediately to the server. You can modify your choices or mark questions for review anytime before submitting.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="font-semibold text-blue-950 dark:text-blue-100">Automatic submission when time ends:</strong> The {round.duration_minutes || aptitudeConfig?.duration_minutes || 30}-minute timer runs continuously on the server. If time expires, all your saved answers will be automatically submitted and graded.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="font-semibold text-blue-950 dark:text-blue-100">Anti-cheat proctoring:</strong> Switching tabs or leaving fullscreen is recorded. The test will be automatically submitted after {aptitudeConfig?.tab_switch_limit || 3} violations.
                  </span>
                </li>
              </ul>
            </div>

            {/* Required Agreement Checkbox */}
            <div className="pt-1">
              <label
                htmlFor="instructions-agree-checkbox"
                className="flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  id="instructions-agree-checkbox"
                  checked={hasReadInstructions}
                  onChange={(e) => setHasReadInstructions(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  I have read and understood the instructions
                </span>
              </label>
            </div>

            {/* Action Buttons & Navigation */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto text-xs h-10 px-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to my application</span>
              </Button>

              <Button
                onClick={handleStartAssessment}
                disabled={!hasReadInstructions || isLoadingSession}
                className={`w-full sm:w-auto font-semibold text-xs h-10 px-6 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all ${
                  !hasReadInstructions || isLoadingSession
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-75'
                    : 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer'
                }`}
              >
                {isLoadingSession ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Starting Test...</span>
                  </span>
                ) : (
                  <>
                    <span>Start Test</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STAGE 2: ACTIVE TEST INTERFACE
        ───────────────────────────────────────────────────────────── */}
        {stage === 'test' && currentQuestion && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Anti-cheat tab switch warning banner */}
            {tabWarning && (
              <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{tabWarning}</span>
                </div>
                <button
                  onClick={() => setTabWarning(null)}
                  className="text-amber-600 font-bold hover:text-amber-800 text-xs cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Section Jump Tabs */}
            <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Sections:
              </span>
              {sections.map((secName) => {
                const secQuestions = questions.filter((q) => q.section === secName);
                const secAnswered = secQuestions.filter((q) => answers[q.question_id]).length;
                const isCurrentSec = currentQuestion.section === secName;

                return (
                  <button
                    key={secName}
                    type="button"
                    onClick={() => {
                      const firstIdx = questions.findIndex((q) => q.section === secName);
                      if (firstIdx !== -1) setCurrentIndex(firstIdx);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isCurrentSec
                        ? 'bg-blue-700 text-white shadow-2xs font-semibold'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{secName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isCurrentSec
                          ? 'bg-blue-800/80 text-blue-100'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {secAnswered}/{secQuestions.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Main Interactive Workspace (Question Panel + Palette Drawer) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left/Main Column: Question Card & Options */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col justify-between gap-6">
                <div className="space-y-5">
                  {/* Question Meta Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                        Question {currentIndex + 1} of {totalQuestions}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-semibold bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      >
                        {currentQuestion.section}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-semibold ${
                          currentQuestion.difficulty === 'easy'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : currentQuestion.difficulty === 'hard'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {currentQuestion.difficulty}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {savingQuestionId === currentQuestion.question_id && (
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                          Saving...
                        </span>
                      )}
                      {answers[currentQuestion.question_id] && savingQuestionId !== currentQuestion.question_id && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Autosaved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                      {currentQuestion.question_text}
                    </p>
                  </div>

                  {/* 4 MCQ Options */}
                  <div className="space-y-2.5">
                    {currentQuestion.options.map((option, optIdx) => {
                      const optLetter = String.fromCharCode(65 + optIdx);
                      const isSelected = answers[currentQuestion.question_id] === option;

                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleSelectOption(option)}
                          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs sm:text-sm select-none ${
                            isSelected
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 ring-2 ring-blue-600/30'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono transition-colors ${
                                isSelected
                                  ? 'bg-blue-700 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {optLetter}
                            </span>
                            <span className="font-normal text-slate-800 dark:text-slate-200">{option}</span>
                          </div>

                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'border-blue-700 bg-blue-700 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Clear Answer Link if answered */}
                  {answers[currentQuestion.question_id] && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleClearOption}
                        className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="text-xs h-9 px-3.5 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleReview}
                      className={`text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                        markedReview.includes(currentQuestion.question_id)
                          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 text-amber-700 dark:text-amber-300'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>
                        {markedReview.includes(currentQuestion.question_id) ? 'Marked for Review' : 'Mark for Review'}
                      </span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentIndex < totalQuestions - 1 ? (
                      <Button
                        size="sm"
                        onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                        className="bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs h-9 px-4 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setIsSubmitConfirmOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Assessment</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Question Navigator Palette Sidebar */}
              <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 sm:p-5 flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Question Palette
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {answeredCount}/{totalQuestions} Answered
                    </span>
                  </div>

                  {/* 15 Question Buttons Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, idx) => {
                      const isAnswered = !!answers[q.question_id];
                      const isMarked = markedReview.includes(q.question_id);
                      const isCurrent = idx === currentIndex;

                      let btnStyle = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                      if (isAnswered) {
                        btnStyle = 'bg-blue-700 text-white border-blue-700 font-bold';
                      }
                      if (isMarked) {
                        btnStyle = 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-800 dark:text-amber-200 font-bold';
                      }

                      return (
                        <button
                          key={q.question_id}
                          type="button"
                          onClick={() => setCurrentIndex(idx)}
                          className={`h-9 rounded-lg border text-xs font-mono font-semibold transition-all relative flex items-center justify-center cursor-pointer ${btnStyle} ${
                            isCurrent ? 'ring-2 ring-blue-700 ring-offset-1 dark:ring-offset-slate-900 shadow-xs' : ''
                          }`}
                          title={`Question ${idx + 1} (${q.section})`}
                        >
                          <span>{idx + 1}</span>
                          {isMarked && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Palette Status Legend */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-blue-700 shrink-0" />
                      <span>Answered ({answeredCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-white dark:bg-slate-800 border border-slate-300 shrink-0" />
                      <span>Unanswered ({unansweredCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-amber-200 border border-amber-400 shrink-0" />
                      <span>Marked for Review ({markedCount})</span>
                    </div>
                  </div>
                </div>

                {/* Direct Submit Action */}
                <div className="pt-2">
                  <Button
                    onClick={() => setIsSubmitConfirmOpen(true)}
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs h-9 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Test</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            CONFIRMATION MODAL BEFORE SUBMIT
        ───────────────────────────────────────────────────────────── */}
        {isSubmitConfirmOpen && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Submit Aptitude Assessment?
                  </h4>
                  <p className="text-xs text-slate-500">Please review your question completion status.</p>
                </div>
              </div>

              {/* Status summary */}
              <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">Answered</p>
                  <p className="font-mono font-bold text-base text-blue-700 dark:text-blue-400">{answeredCount}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">Unanswered</p>
                  <p className="font-mono font-bold text-base text-slate-600 dark:text-slate-400">{unansweredCount}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">For Review</p>
                  <p className="font-mono font-bold text-base text-amber-600 dark:text-amber-400">{markedCount}</p>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    You have <strong className="font-semibold">{unansweredCount} unanswered questions</strong>. Unattempted questions will not receive marks.
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsSubmitConfirmOpen(false)}
                  disabled={isSubmitting}
                  className="text-xs h-9 px-4 rounded-xl"
                >
                  Return to Test
                </Button>
                <Button
                  onClick={() => handleFinalSubmit(false)}
                  disabled={isSubmitting}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs h-9 px-5 rounded-xl cursor-pointer"
                >
                  {isSubmitting ? 'Grading...' : 'Yes, Finalize & Submit'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            STAGE 3: ASSESSMENT RESULT & SCORECARD
        ───────────────────────────────────────────────────────────── */}
        {stage === 'result' && finalResult && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* Top result badge & banner */}
            <div
              className={`p-5 rounded-2xl border text-center space-y-2 ${
                finalResult.passed
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50/70 dark:bg-red-950/40 border-red-200 dark:border-red-800'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
                  finalResult.passed
                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}
              >
                {finalResult.passed ? <Award className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>

              <div className="space-y-1">
                <Badge
                  className={`text-[11px] uppercase font-bold tracking-wider px-3 py-0.5 ${
                    finalResult.passed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {finalResult.passed ? 'Round 2 Passed' : 'Below Cutoff Threshold'}
                </Badge>
                <h3 className="text-xl font-bold font-sans text-slate-900 dark:text-slate-100 pt-1">
                  {finalResult.passed
                    ? 'Congratulations! Round 3 (Coding Round) is Unlocked.'
                    : 'Aptitude Assessment Completed.'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                  {finalResult.feedback}
                </p>
              </div>
            </div>

            {/* Scorecard Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Normalized Score</p>
                <p className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-400 mt-1">
                  {finalResult.score}%
                </p>
                <p className="text-[10px] text-slate-400">Cutoff: {finalResult.cutoff}%</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Correct Answers</p>
                <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {finalResult.details?.correct_count}
                </p>
                <p className="text-[10px] text-slate-400">Out of {finalResult.details?.total_questions || 15}</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Time Taken</p>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                  {Math.floor((finalResult.details?.time_taken_seconds || 0) / 60)}m {(finalResult.details?.time_taken_seconds || 0) % 60}s
                </p>
                <p className="text-[10px] text-slate-400">Total duration</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tab Switches</p>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                  {finalResult.details?.tab_switches || 0}
                </p>
                <p className="text-[10px] text-slate-400">Focus departure log</p>
              </div>
            </div>

            {/* Section Breakdown Cards */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Section Performance Breakdown
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(finalResult.details?.section_breakdown || {}).map(([secTitle, stats]) => (
                  <div
                    key={secTitle}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{secTitle}</span>
                      <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400">
                        {stats.score}%
                      </span>
                    </div>

                    {/* Progress meter */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-700 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, stats.score))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="text-emerald-600 font-semibold">{stats.correct} Correct</span>
                      <span className="text-red-600 font-semibold">{stats.incorrect} Wrong</span>
                      <span>{stats.unattempted} Skipped</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Final Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={onClose}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs h-10 px-6 rounded-xl cursor-pointer"
              >
                {finalResult.passed ? 'Continue to Round 3' : 'Back to my application'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
