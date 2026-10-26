import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { pipelineService } from "@/services/pipelineService";
import { AptitudeTestModal } from "./AptitudeTestModal";
import { CandidateStepperProgress, StepperRoundItem } from "@/types/pipeline";

const ACTIVE_APP_STORAGE_KEY = "ai_recruitment_active_app_id";

export const AptitudeTestPage: React.FC = () => {
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

  // Set session flag on browser popstate (Browser Back button)
  useEffect(() => {
    const handlePopState = () => {
      sessionStorage.setItem("aptitude_browser_back", "1");
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadTestContext = async () => {
      if (!activeAppId) {
        navigate("/apply", { replace: true });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const progress = await pipelineService.getStepperProgress(activeAppId);
        if (!isMounted) return;

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

        // STATE MACHINE CHECK: If no attempt exists on server, redirect to instructions page!
        const sessRes = await pipelineService.getAptitudeSession(activeAppId, r2.round_id);
        if (!sessRes.success || !sessRes.session || (sessRes.session.status !== "in_progress" && sessRes.session.status !== "completed")) {
          console.log("[APTITUDE TEST ROUTE] No active test attempt exists on server. Redirecting to instructions page.");
          navigate(`/apply/round/2/instructions?appId=${encodeURIComponent(activeAppId)}`, { replace: true });
          return;
        }

        setRound2(r2);
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

    loadTestContext();

    return () => {
      isMounted = false;
    };
  }, [activeAppId, navigate]);

  const handleBackToPipeline = () => {
    sessionStorage.setItem("aptitude_browser_back", "1");
    if (activeAppId) {
      navigate(`/apply?appId=${encodeURIComponent(activeAppId)}`);
    } else {
      navigate("/apply");
    }
  };

  const handleTestComplete = () => {
    if (activeAppId) {
      navigate(`/apply?appId=${encodeURIComponent(activeAppId)}`);
    } else {
      navigate("/apply");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-600 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Loading Aptitude Assessment...</p>
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
              {error || "An error occurred while preparing the assessment."}
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
    <AptitudeTestModal
      applicationId={stepper.application.application_id}
      round={round2}
      candidateName={stepper.application.candidate_name}
      candidateEmail={stepper.application.candidate_email}
      onClose={handleBackToPipeline}
      onComplete={handleTestComplete}
      isFullRoute={true}
      initialStage="test"
    />
  );
};
