import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Layers,
  ShieldAlert,
  Clock,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pipelineService } from "@/services/pipelineService";
import { CandidateStepperProgress, StepperRoundItem, AptitudeConfig } from "@/types/pipeline";

const ACTIVE_APP_STORAGE_KEY = "ai_recruitment_active_app_id";

export const AptitudeInstructionsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const paramAppId = searchParams.get("appId") || searchParams.get("application_id");
  const storedAppId = localStorage.getItem(ACTIVE_APP_STORAGE_KEY);
  const activeAppId = paramAppId || storedAppId;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stepper, setStepper] = useState<CandidateStepperProgress | null>(null);
  const [round2, setRound2] = useState<StepperRoundItem | null>(null);
  const [aptitudeConfig, setAptitudeConfig] = useState<AptitudeConfig | null>(null);

  const [hasReadInstructions, setHasReadInstructions] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadInstructionsContext = async () => {
      if (!activeAppId) {
        navigate("/apply", { replace: true });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [progress, cfg] = await Promise.all([
          pipelineService.getStepperProgress(activeAppId),
          pipelineService.getAptitudeConfig()
        ]);

        if (!isMounted) return;

        if (cfg) {
          setAptitudeConfig(cfg);
        }

        if (!progress || !progress.application) {
          setError("Candidate application not found. Please verify your application ID.");
          setIsLoading(false);
          return;
        }

        setStepper(progress);

        // Find Round 2
        const r2 = progress.rounds?.find(
          (r) => r.order === 2 || r.round_type === "aptitude_test"
        );

        if (!r2) {
          setError("Aptitude round configuration not found in hiring pipeline.");
          setIsLoading(false);
          return;
        }

        // Verify Round 1 gating
        const r1 = progress.rounds?.find((r) => r.order === 1);
        if (r1 && r1.status !== "passed") {
          setError(
            "Sequential Gating Violation: Round 1 (Resume Screening) must be PASSED before accessing Round 2 (Aptitude Test)."
          );
          setIsLoading(false);
          return;
        }

        setRound2(r2);

        // Check if an in-progress session already exists on server
        // If an attempt is ALREADY in progress, auto-open the test route
        const sessRes = await pipelineService.getAptitudeSession(activeAppId, r2.round_id);
        if (isMounted && sessRes.success && sessRes.session && sessRes.session.status === "in_progress") {
          const rem = sessRes.session.remaining_seconds ?? 0;
          if (rem > 0) {
            console.log("[INSTRUCTIONS PAGE] Existing in_progress attempt found. Redirecting to test route.");
            navigate(`/apply/round/2/test?appId=${encodeURIComponent(activeAppId)}`, { replace: true });
            return;
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load candidate application context.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInstructionsContext();

    return () => {
      isMounted = false;
    };
  }, [activeAppId, navigate]);

  const handleBackToPipeline = () => {
    if (activeAppId) {
      navigate(`/apply?appId=${encodeURIComponent(activeAppId)}`);
    } else {
      navigate("/apply");
    }
  };

  const handleStartTest = async () => {
    if (!hasReadInstructions || !activeAppId || !round2 || isStarting) return;

    setIsStarting(true);
    setStartError(null);

    try {
      // 1. Request fullscreen on user gesture
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {
        // Continue if browser blocks fullscreen
      }

      // 2. Send Start POST with confirmed_instructions: true
      const startRes = await pipelineService.startAptitudeTest(
        activeAppId,
        round2.round_id,
        false,
        true
      );

      if (!startRes.success || !startRes.session) {
        setStartError(startRes.error || "Could not start aptitude test. Please try again.");
        setIsStarting(false);
        return;
      }

      // 3. Navigate to active test route
      navigate(`/apply/round/2/test?appId=${encodeURIComponent(activeAppId)}`);
    } catch (err: any) {
      setStartError(err.message || "Failed to start test session.");
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-600 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Loading Assessment Instructions...</p>
        </div>
      </div>
    );
  }

  if (error || !stepper || !round2) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto border border-red-200 dark:border-red-900">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Cannot Access Round 2
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {error || "An error occurred while preparing instructions."}
            </p>
          </div>
          <Button
            onClick={handleBackToPipeline}
            className="w-full h-10 bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Pipeline Overview</span>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 font-sans">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              R2
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {round2.title || "Aptitude Assessment"}
                </h2>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                >
                  Sequential Round 2
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Candidate:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {stepper.application.candidate_name}
                </span>{" "}
                • Cutoff: {round2.cutoff_score || 60}%
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToPipeline}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Pipeline</span>
          </Button>
        </div>

        {/* Start Error Banner */}
        {startError && (
          <div className="px-6 py-2.5 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{startError}</span>
            </div>
            <button
              onClick={() => setStartError(null)}
              className="text-red-500 font-bold hover:text-red-700 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Instructions Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                {round2.title || "Aptitude Assessment"} — Instructions
              </h3>
              <Badge
                variant="outline"
                className="text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
              >
                Round 2 of {stepper.rounds.length || 6}
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
                {round2.duration_minutes || aptitudeConfig?.duration_minutes || 30} min
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Server-timed countdown</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cutoff Score</p>
              <p className="text-xl font-bold font-mono text-blue-700 dark:text-blue-400 mt-1">
                {round2.cutoff_score || aptitudeConfig?.cutoff_score || 60}%
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
                  <p className="font-bold text-slate-900 dark:text-slate-100">Logical Reasoning</p>
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
                  <p className="font-bold text-slate-900 dark:text-slate-100">Verbal Ability</p>
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
                  <strong className="font-semibold text-blue-950 dark:text-blue-100">Automatic submission when time ends:</strong> The {round2.duration_minutes || aptitudeConfig?.duration_minutes || 30}-minute timer runs continuously on the server. If time expires, all your saved answers will be automatically submitted and graded.
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
              >
              </input>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                I have read and understood the instructions
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={handleBackToPipeline}
              className="w-full sm:w-auto text-xs h-10 px-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to my application</span>
            </Button>

            <Button
              onClick={handleStartTest}
              disabled={!hasReadInstructions || isStarting}
              className={`w-full sm:w-auto font-semibold text-xs h-10 px-6 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all ${
                !hasReadInstructions || isStarting
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-75"
                  : "bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
              }`}
            >
              {isStarting ? (
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
      </div>
    </div>
  );
};
