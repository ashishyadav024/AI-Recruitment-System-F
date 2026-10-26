import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  ArrowLeft,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Video,
  Volume2,
  FileText,
  Upload,
  User,
  Briefcase,
  Mail,
  Check,
  RotateCcw,
  Bot,
  HelpCircle,
  Layers,
  ChevronRight,
  Sun,
  Moon,
  Loader2,
  AlertCircle,
  Trash2,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useTheme } from "@/context/ThemeContext";
import { FASTAPI_BASE_URL } from "@/config/api";
import { pipelineService } from "@/services/pipelineService";
import { AptitudeTestModal } from "./AptitudeTestModal";
import {
  CandidateApplication,
  CandidateStepperProgress,
  StepperRoundItem,
  RoundConfig,
  StandardRoundType
} from "@/types/pipeline";

const ACTIVE_APP_STORAGE_KEY = "ai_recruitment_active_app_id";

export interface ATSResult {
  score: number;
  cutoff: number;
  passed: boolean;
  matchedSkills: string[];
  missingSkills: string[];
  feedback: string;
  onFailAction: "reject" | "hold";
  evaluatedAt: string;
  evaluationMethod?: string;
  model?: string;
  status?: string;
  matchedDetails?: Array<{ skill: string; category: string; status: string; evidence_quote?: string; verified: boolean }>;
  missingDetails?: Array<{ skill: string; category: string; status: string; dropped_reason?: string }>;
  flagged?: boolean;
}

const ROLE_SKILL_PROFILES: Record<string, { label: string; keywords: string[] }[]> = {
  "Frontend Developer": [
    { label: "React", keywords: ["react", "react.js", "reactjs"] },
    { label: "JavaScript / TypeScript", keywords: ["javascript", "typescript", "js", "ts", "es6"] },
    { label: "HTML5 & Modern CSS", keywords: ["html", "html5", "css", "css3", "sass", "tailwind", "responsive"] },
    { label: "State Management", keywords: ["redux", "zustand", "context", "state management", "mobx", "recoil"] },
    { label: "Web Performance & CWV", keywords: ["performance", "optimization", "lighthouse", "core web vitals", "caching", "lazy loading"] },
    { label: "UI / UX & Design Systems", keywords: ["ui", "ux", "figma", "wireframe", "design system", "component library", "accessible", "a11y"] },
    { label: "Testing & QA", keywords: ["test", "testing", "jest", "cypress", "playwright", "vitest", "unit test"] },
    { label: "Modern Build Tools", keywords: ["vite", "webpack", "npm", "yarn", "bundler", "ci/cd", "git"] }
  ],
  "Machine Learning Engineer": [
    { label: "Python & Core Math", keywords: ["python", "numpy", "scipy", "linear algebra", "calculus", "statistics"] },
    { label: "Deep Learning Frameworks", keywords: ["pytorch", "tensorflow", "keras", "torch", "deep learning"] },
    { label: "Machine Learning Algorithms", keywords: ["machine learning", "ml", "scikit-learn", "sklearn", "random forest", "xgboost"] },
    { label: "NLP & LLM Systems", keywords: ["nlp", "natural language", "transformer", "bert", "gpt", "llm", "huggingface", "langchain"] },
    { label: "Computer Vision", keywords: ["computer vision", "opencv", "yolo", "cnn", "image processing", "vision"] },
    { label: "Data Pipeline & Analytics", keywords: ["pandas", "data analysis", "etl", "sql", "spark", "bigquery"] },
    { label: "Model Optimization & MLOps", keywords: ["mlops", "quantization", "tensorrt", "onnx", "mlflow", "docker", "cuda"] },
    { label: "Cloud & Distributed Training", keywords: ["aws", "gcp", "azure", "distributed training", "gpu", "kubernetes"] }
  ],
  "Backend Engineer": [
    { label: "Backend Languages", keywords: ["python", "node", "nodejs", "java", "golang", "go", "c#", "rust"] },
    { label: "REST & GraphQL APIs", keywords: ["api", "apis", "rest", "restful", "graphql", "fastapi", "express", "grpc"] },
    { label: "Relational & NoSQL Databases", keywords: ["sql", "postgresql", "mysql", "mongodb", "redis", "database", "postgres"] },
    { label: "System Architecture & Microservices", keywords: ["microservices", "system architecture", "system design", "distributed", "scalability"] },
    { label: "Cloud & Infrastructure", keywords: ["aws", "gcp", "azure", "cloud", "docker", "kubernetes", "linux"] },
    { label: "Security & Authentication", keywords: ["security", "auth", "oauth", "jwt", "encryption", "https", "owasp"] },
    { label: "Performance & Caching", keywords: ["redis", "caching", "optimization", "throughput", "latency", "indexing"] },
    { label: "CI/CD & Automated Testing", keywords: ["ci/cd", "github actions", "docker", "unit test", "pytest", "jest", "jenkins"] }
  ],
  "Data Analyst": [
    { label: "Advanced SQL", keywords: ["sql", "joins", "subqueries", "window functions", "aggregation", "cte"] },
    { label: "Data Analysis (Python / R)", keywords: ["python", "pandas", "numpy", "r", "jupyter", "eda"] },
    { label: "Data Visualization & Dashboards", keywords: ["tableau", "power bi", "looker", "dashboard", "visualization", "matplotlib", "seaborn"] },
    { label: "Statistical Modeling & Hypothesis Testing", keywords: ["statistics", "statistical", "hypothesis", "a/b testing", "probability", "regression"] },
    { label: "Business Intelligence & Metrics", keywords: ["business intelligence", "bi", "kpi", "metrics", "reporting", "cohort"] },
    { label: "Data Warehousing & ETL", keywords: ["etl", "data warehouse", "snowflake", "bigquery", "redshift", "pipeline"] },
    { label: "Spreadsheets & Excel Modeling", keywords: ["excel", "vlookup", "pivot", "spreadsheet", "financial modeling"] },
    { label: "Executive Communication & Insights", keywords: ["communication", "stakeholder", "insights", "storytelling", "presentation"] }
  ]
};

export const evaluateResumeATS = (
  resumeText: string,
  targetRole: string,
  cutoffScore: number = 60,
  onFailAction: "reject" | "hold" = "reject"
): ATSResult => {
  const normalizedText = resumeText.toLowerCase();

  const profileKey = Object.keys(ROLE_SKILL_PROFILES).find(
    (key) =>
      key.toLowerCase() === targetRole.toLowerCase() ||
      targetRole.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(targetRole.toLowerCase())
  );

  const skillsToEvaluate = profileKey
    ? ROLE_SKILL_PROFILES[profileKey]
    : [
        { label: "Core Technical Competencies", keywords: [targetRole.toLowerCase(), "architecture", "system", "development", "engineering"] },
        { label: "Programming & Code Quality", keywords: ["code", "programming", "software", "clean code", "refactoring"] },
        { label: "Data & State Architecture", keywords: ["database", "data", "state", "sql", "api"] },
        { label: "Testing & Quality Assurance", keywords: ["test", "testing", "unit test", "integration", "qa"] },
        { label: "Deployment & DevOps", keywords: ["git", "ci/cd", "docker", "cloud", "deployment", "linux"] },
        { label: "Collaboration & Delivery", keywords: ["agile", "scrum", "team", "delivery", "cross-functional"] }
      ];

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of skillsToEvaluate) {
    const isMatched = skill.keywords.some((keyword) => {
      if (keyword.length <= 3) {
        const regex = new RegExp(`\\b${keyword}\\b`, "i");
        return regex.test(normalizedText);
      }
      return normalizedText.includes(keyword.toLowerCase());
    });

    if (isMatched) {
      matchedSkills.push(skill.label);
    } else {
      missingSkills.push(skill.label);
    }
  }

  const totalSkills = skillsToEvaluate.length;
  const matchRatio = totalSkills > 0 ? matchedSkills.length / totalSkills : 0;
  let rawScore = Math.round(matchRatio * 100);

  // Slight bonus for detailed, structured resume content
  if (normalizedText.length > 800 && rawScore > 40 && rawScore < 100) {
    rawScore = Math.min(100, rawScore + 5);
  }

  const passed = rawScore >= cutoffScore;

  let feedback = "";
  if (passed) {
    feedback = `ATS match score: ${rawScore}%. Matched ${matchedSkills.length} of ${totalSkills} core competencies for ${targetRole}. Cutoff (${cutoffScore}%) satisfied.`;
  } else {
    feedback = `ATS match score: ${rawScore}%. Found ${matchedSkills.length} of ${totalSkills} core competencies. Below required ${cutoffScore}% cutoff.`;
  }

  return {
    score: rawScore,
    cutoff: cutoffScore,
    passed,
    matchedSkills,
    missingSkills,
    feedback,
    onFailAction,
    evaluatedAt: new Date().toISOString()
  };
};

const AVAILABLE_JOB_ROLES = [
  {
    role: "Machine Learning Engineer",
    track: "ML Engineering Track",
    description: "Distributed AI training, PyTorch, model optimization, and production inference systems.",
    badge: "6 Rounds Calibrated"
  },
  {
    role: "Frontend Developer",
    track: "Frontend Engineering Track",
    description: "Modern UI architecture, React, TypeScript, high-performance web components.",
    badge: "6 Rounds Calibrated"
  },
  {
    role: "Backend Engineer",
    track: "Backend Systems Track",
    description: "Scalable microservices, distributed databases, event streaming, and API architecture.",
    badge: "6 Rounds Calibrated"
  },
  {
    role: "Data Analyst",
    track: "Data Intelligence Track",
    description: "SQL modeling, cohort analytics, business intelligence dashboards, and statistical testing.",
    badge: "6 Rounds Calibrated"
  }
];

export const ApplicationOverview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const searchParams = new URLSearchParams(location.search);
  const paramAppId = searchParams.get("appId") || searchParams.get("application_id");
  const isBlockedRedirect = searchParams.get("blocked") === "1";
  const blockedReason = searchParams.get("reason") || "";

  // Application & Candidate State
  const [activeAppId, setActiveAppId] = useState<string | null>(paramAppId || null);
  const [progress, setProgress] = useState<CandidateStepperProgress | null>(null);
  const [savedAppProgress, setSavedAppProgress] = useState<CandidateStepperProgress | null>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState<boolean>(false);
  const [existingAppNotice, setExistingAppNotice] = useState<{
    application: CandidateApplication;
    stepper?: CandidateStepperProgress;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasNoPipeline, setHasNoPipeline] = useState<boolean>(false);
  const [atsResult, setAtsResult] = useState<ATSResult | null>(null);
  const [activeAptitudeSession, setActiveAptitudeSession] = useState<{
    remainingSeconds: number;
    session: any;
    roundId: string;
  } | null>(null);

  // Format MM:SS for countdown timer in pipeline banner
  const formatCountdown = (secs: number) => {
    const mins = Math.floor(Math.max(0, secs) / 60);
    const rem = Math.max(0, secs) % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Helper to format friendly candidate status summary (e.g. "Round 2 failed", "Round 1 passed", etc.)
  const formatCandidateStatusSummary = (p?: CandidateStepperProgress | null): string => {
    if (!p) return "In Progress";
    const failedRound = p.rounds?.find((r) => r.status === "failed");
    if (failedRound) {
      return `Round ${failedRound.order} failed`;
    }
    if (p.overall_status === "not_selected") {
      return "Not Selected";
    }
    if (p.overall_status === "qualified") {
      return "Qualified • Offer Ready";
    }
    if (p.overall_status === "on_hold") {
      return "Awaiting Recruiter Review";
    }
    const currentRound = p.rounds?.find((r) => r.status === "in_progress" || r.status === "unlocked");
    if (currentRound) {
      const prevPassed = p.rounds?.filter((r) => r.status === "passed") || [];
      if (prevPassed.length > 0) {
        return `Round ${prevPassed[prevPassed.length - 1].order} passed • Round ${currentRound.order} ready`;
      }
      return `Round ${currentRound.order} in progress`;
    }
    return `Round ${p.current_round_order || 1} in progress`;
  };

  // New Application Form State
  const [candidateName, setCandidateName] = useState<string>("");
  const [candidateEmail, setCandidateEmail] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("Frontend Developer");
  const [customRole, setCustomRole] = useState<string>("");
  const [resumeText, setResumeText] = useState<string>("");
  const [resumeFileName, setResumeFileName] = useState<string>("");
  const [resumeFileSize, setResumeFileSize] = useState<number | null>(null);
  const [resumeFilePath, setResumeFilePath] = useState<string | null>(null);
  const [isExtractingResume, setIsExtractingResume] = useState<boolean>(false);
  const [resumeWarning, setResumeWarning] = useState<string | null>(null);
  const [resumeUploadError, setResumeUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmittingApp, setIsSubmittingApp] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Active Round Assessment States
  const [activeRoundModal, setActiveRoundModal] = useState<StepperRoundItem | null>(null);
  const [isProcessingRound, setIsProcessingRound] = useState<boolean>(false);
  const [roundActionMessage, setRoundActionMessage] = useState<string | null>(null);

  // Pipeline Gating Error & Coming Soon States
  const [pipelineError, setPipelineError] = useState<{
    title: string;
    message: string;
    canRestart?: boolean;
  } | null>(null);
  const [comingSoonRound, setComingSoonRound] = useState<StepperRoundItem | null>(null);
  const [aptitudeRound, setAptitudeRound] = useState<StepperRoundItem | null>(null);

  // Technical Interview Instructions & Hardware Check Modal State
  const [showTechInstructions, setShowTechInstructions] = useState<boolean>(false);
  const [techRound, setTechRound] = useState<StepperRoundItem | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micActive, setMicActive] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnimationRef = useRef<number | null>(null);

  // Helper to run server-side ATS resume screening using LLM and strict evidence verification
  const runAutomaticResumeScreening = async (
    appId: string,
    targetRole: string,
    _cleanResumeText: string,
    round1: StepperRoundItem
  ): Promise<ATSResult | null> => {
    try {
      const res = await pipelineService.screenApplication(appId, targetRole);
      if (!res.success && !res.status) {
        console.warn("Server ATS screening returned error:", res.error);
        return null;
      }

      const evaluation: ATSResult = {
        score: res.score ?? 0,
        cutoff: res.cutoff ?? (round1.cutoff_score || 60),
        passed: res.passed ?? false,
        matchedSkills: res.matched_skills || [],
        missingSkills: res.missing_skills || [],
        feedback: res.feedback || res.message || "",
        onFailAction: (round1.on_fail_action as any) || "reject",
        evaluatedAt: new Date().toISOString(),
        evaluationMethod: res.evaluation_method,
        model: res.model,
        status: res.status,
        matchedDetails: res.matched_details,
        missingDetails: res.missing_details,
        flagged: res.flagged
      };

      localStorage.setItem(`ats_result_${appId}`, JSON.stringify(evaluation));
      setAtsResult(evaluation);

      if (res.stepper) {
        setProgress(res.stepper);
      } else {
        const updated = await pipelineService.getStepperProgress(appId);
        if (updated) setProgress(updated);
      }
      return evaluation;
    } catch (err) {
      console.warn("Error running backend ATS screening:", err);
      return null;
    }
  };

  // Load candidate application progress
  const loadApplication = useCallback(async (appId: string) => {
    setIsLoading(true);
    try {
      const stepper = await pipelineService.getStepperProgress(appId);
      if (stepper) {
        setProgress(stepper);
        if (!stepper.rounds || stepper.rounds.length === 0) {
          setHasNoPipeline(true);
        } else {
          setHasNoPipeline(false);

          // Check Round 1 (Resume Screening)
          const round1 = stepper.rounds.find((r) => r.order === 1);
          if (round1) {
            if (round1.status === "passed" || round1.status === "failed" || round1.score_data || round1.status === "pending_evaluation") {
              const cached = localStorage.getItem(`ats_result_${appId}`);
              if (cached) {
                try {
                  setAtsResult(JSON.parse(cached));
                } catch {
                  // ignore
                }
              } else if (round1.score_data) {
                const sd = round1.score_data as any;
                setAtsResult({
                  score: sd.score,
                  cutoff: round1.cutoff_score,
                  passed: sd.passed ?? (round1.status === "passed"),
                  matchedSkills: sd.details?.matched_skills || [],
                  missingSkills: sd.details?.missing_skills || [],
                  feedback: sd.feedback || "",
                  onFailAction: (round1.on_fail_action as any) || "reject",
                  evaluatedAt: sd.details?.evaluated_at || new Date().toISOString(),
                  evaluationMethod: sd.details?.evaluation_method,
                  model: sd.details?.model,
                  status: sd.details?.status,
                  matchedDetails: sd.details?.matched_details,
                  missingDetails: sd.details?.missing_details,
                  flagged: sd.details?.flagged_for_review
                });
              } else if (round1.status === "pending_evaluation") {
                setAtsResult({
                  score: 0,
                  cutoff: round1.cutoff_score,
                  passed: false,
                  matchedSkills: [],
                  missingSkills: [],
                  feedback: "AI resume evaluation is currently queued. Your evaluation is pending.",
                  onFailAction: (round1.on_fail_action as any) || "reject",
                  evaluatedAt: new Date().toISOString(),
                  evaluationMethod: "llm_unavailable_pending",
                  status: "pending_evaluation"
                });
              }
            } else if (round1.status === "unlocked") {
              // If Round 1 is unlocked but not yet scored, trigger server-side screening immediately
              const text = stepper.application.metadata?.resume_text || localStorage.getItem(`resume_text_${appId}`);
              if (text && text.trim().length >= 50) {
                const evalRes = await runAutomaticResumeScreening(
                  appId,
                  stepper.application.job_role,
                  text,
                  round1
                );
                if (evalRes) {
                  setAtsResult(evalRes);
                }
                const updatedStepper = await pipelineService.getStepperProgress(appId);
                if (updatedStepper) {
                  setProgress(updatedStepper);
                }
              }
            }
          }
          // Check Round 2 (Aptitude Test) for active in-progress session (read-only query)
          const round2 = stepper.rounds.find((r) => r.order === 2 && r.round_type === "aptitude_test");
          if (round2) {
            try {
              const sessRes = await pipelineService.getAptitudeSession(appId, round2.round_id);
              if (sessRes.success && sessRes.session && sessRes.session.status === "in_progress") {
                const rem = sessRes.session.remaining_seconds ?? 0;
                if (rem > 0) {
                  setActiveAptitudeSession({
                    remainingSeconds: rem,
                    session: sessRes.session,
                    roundId: round2.round_id
                  });
                } else {
                  // Expired attempt auto-submitted on server: reload stepper
                  setActiveAptitudeSession(null);
                }
              } else {
                setActiveAptitudeSession(null);
              }
            } catch {
              setActiveAptitudeSession(null);
            }
          } else {
            setActiveAptitudeSession(null);
          }
        }
      } else {
        setProgress(null);
        setAtsResult(null);
      }
    } catch (err) {
      console.warn("Could not load application progress:", err);
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initEntryFlow = async () => {
      setIsLoading(true);

      // Case 1: Direct link with query parameter ?appId=...
      if (paramAppId) {
        setActiveAppId(paramAppId);
        setShowWelcomeBack(false);
        await loadApplication(paramAppId);
        if (isMounted) setIsLoading(false);
        return;
      }

      // Case 2: Saved application in browser localStorage
      const savedAppId = localStorage.getItem(ACTIVE_APP_STORAGE_KEY);
      if (savedAppId) {
        try {
          const stepper = await pipelineService.getStepperProgress(savedAppId);
          if (isMounted && stepper && stepper.application && stepper.application.application_id) {
            setSavedAppProgress(stepper);
            setShowWelcomeBack(true);
            setIsLoading(false);
            return;
          } else {
            localStorage.removeItem(ACTIVE_APP_STORAGE_KEY);
          }
        } catch (err) {
          console.warn("Could not load saved application:", err);
          localStorage.removeItem(ACTIVE_APP_STORAGE_KEY);
        }
      }

      // Case 3: No saved application in browser -> show empty form directly
      if (isMounted) {
        setShowWelcomeBack(false);
        setSavedAppProgress(null);
        setProgress(null);
        setActiveAppId(null);
        setIsLoading(false);
      }
    };

    initEntryFlow();
    return () => {
      isMounted = false;
    };
  }, [paramAppId, loadApplication]);

  // Clean up media streams
  const stopHardwareCheck = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (audioAnimationRef.current) {
      cancelAnimationFrame(audioAnimationRef.current);
      audioAnimationRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setCameraActive(false);
    setMicActive(false);
    setAudioLevel(0);
    setCameraError(null);
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      stopHardwareCheck();
    };
  }, [stopHardwareCheck]);

  // Active aptitude test countdown ticker for pipeline banner
  useEffect(() => {
    if (!activeAptitudeSession || activeAptitudeSession.remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setActiveAptitudeSession((prev) => {
        if (!prev) return null;
        if (prev.remainingSeconds <= 1) {
          clearInterval(interval);
          if (activeAppId) loadApplication(activeAppId);
          return null;
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeAptitudeSession, activeAppId, loadApplication]);

  // Handle Hardware Test (Camera + Mic)
  const startHardwareCheck = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera/Microphone access not supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      setCameraStream(stream);
      setCameraActive(true);
      setMicActive(true);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      // Simple Audio Meter Setup
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioMeter = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            audioAnimationRef.current = requestAnimationFrame(updateAudioMeter);
          };
          updateAudioMeter();
        }
      } catch (audioErr) {
        console.warn("Audio meter setup error:", audioErr);
      }
    } catch (err: any) {
      console.error("Hardware test failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Permission denied. Please allow camera and microphone permissions in browser settings.");
      } else {
        setCameraError(`Device error: ${err.message || "No webcam or microphone detected."}`);
      }
      setCameraActive(false);
      setMicActive(false);
    }
  };

  // Resume File Upload Handler (FastAPI PyMuPDF / python-docx extraction)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeUploadError(null);
    setResumeWarning(null);

    // 1. Client-side extension validation
    const allowedExts = [".pdf", ".docx", ".txt"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExts.includes(fileExt)) {
      setResumeUploadError(`Unsupported file type '${fileExt}'. Please upload a .pdf, .docx, or .txt file.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Client-side size validation (5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setResumeUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsExtractingResume(true);
    setResumeFileName(file.name);
    setResumeFileSize(file.size);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${FASTAPI_BASE_URL}/api/resume/extract`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.detail || data.error || "Failed to extract text from resume.";
        setResumeUploadError(errorMsg);
      } else {
        setResumeText(data.extracted_text || "");
        setResumeFilePath(data.file_path || null);
        if (data.warning) {
          setResumeWarning(data.warning);
        } else {
          setResumeWarning(null);
        }
      }
    } catch (err: any) {
      setResumeUploadError(err.message || "Failed to connect to resume extraction service.");
    } finally {
      setIsExtractingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Clear resume text and reset file input
  const handleClearResume = () => {
    setResumeText("");
    setResumeFileName("");
    setResumeFileSize(null);
    setResumeFilePath(null);
    setResumeWarning(null);
    setResumeUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Action: Continue previously saved application from Welcome Back card
  const handleContinueMyApplication = async () => {
    if (!savedAppProgress) return;
    const appId = savedAppProgress.application.application_id;
    setShowWelcomeBack(false);
    setActiveAppId(appId);
    setProgress(savedAppProgress);
    await loadApplication(appId);
  };

  // Action: Apply as a different candidate (clears ONLY local browser state, never deletes server data)
  const handleApplyAsDifferentCandidate = () => {
    localStorage.removeItem(ACTIVE_APP_STORAGE_KEY);
    setShowWelcomeBack(false);
    setSavedAppProgress(null);
    setActiveAppId(null);
    setProgress(null);
    setAtsResult(null);
    setCandidateName("");
    setCandidateEmail("");
    setSelectedRole("Frontend Developer");
    setCustomRole("");
    setResumeText("");
    setResumeFileName("");
    setResumeFileSize(null);
    setResumeFilePath(null);
    setResumeWarning(null);
    setResumeUploadError(null);
    setFormError(null);
    setExistingAppNotice(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Action: Continue existing application found on server by email + role
  const handleContinueExistingApplication = async () => {
    if (!existingAppNotice) return;
    const appId = existingAppNotice.application.application_id;
    localStorage.setItem(ACTIVE_APP_STORAGE_KEY, appId);
    setActiveAppId(appId);
    setShowWelcomeBack(false);
    if (existingAppNotice.stepper) {
      setProgress(existingAppNotice.stepper);
    }
    setExistingAppNotice(null);
    await loadApplication(appId);
  };

  // Handle Candidate Application Submission
  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setExistingAppNotice(null);

    const name = candidateName.trim();
    const email = candidateEmail.trim().toLowerCase();
    const targetRole = selectedRole === "Custom Role" ? customRole.trim() : selectedRole;

    if (!name) {
      setFormError("Please enter your full name.");
      return;
    }
    if (!email || !email.includes("@")) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (!targetRole) {
      setFormError("Please select or enter a target job role.");
      return;
    }
    if (resumeText.trim().length < 200) {
      setFormError("Resume content must be at least 200 characters for ATS semantic screening.");
      return;
    }

    setIsSubmittingApp(true);
    try {
      // TODO (Privacy / Security): Anyone who knows an email can open that application, so for a real deployment this needs candidate login or an emailed one-time code. For now, keep it simple and do not build authentication.

      // Check if an application already exists on the server for this email and role (case-insensitive, trimmed)
      const existingCheck = await pipelineService.restoreApplication(email, targetRole);
      if (existingCheck.success && existingCheck.application) {
        // Existing application found! Do not create duplicate and do not re-run screening.
        setExistingAppNotice({
          application: existingCheck.application,
          stepper: existingCheck.data
        });
        setIsSubmittingApp(false);
        return;
      }

      // No application exists for this email + role: create fresh application
      const app = await pipelineService.getOrCreateApplication(
        email,
        name,
        targetRole,
        false,
        resumeText,
        resumeFilePath || undefined,
        resumeFileName || undefined
      );

      if (app) {
        setActiveAppId(app.application_id);
        localStorage.setItem(ACTIVE_APP_STORAGE_KEY, app.application_id);
        if (resumeText) {
          localStorage.setItem(`resume_text_${app.application_id}`, resumeText);
        }
        if (resumeFilePath) {
          localStorage.setItem(`resume_path_${app.application_id}`, resumeFilePath);
        }
        if (resumeFileName) {
          localStorage.setItem(`resume_name_${app.application_id}`, resumeFileName);
        }

        console.log("[FRONTEND TRACE 1] Created application:", app.application_id);

        // Automatic ATS Resume Screening execution immediately on submission
        const initialStepper = await pipelineService.getStepperProgress(app.application_id);
        const round1 = initialStepper?.rounds?.find((r) => r.order === 1);
        if (round1) {
          console.log("[FRONTEND TRACE 2] Starting automatic Round 1 resume screening for app:", app.application_id);
          await runAutomaticResumeScreening(
            app.application_id,
            targetRole,
            resumeText,
            round1
          );
          console.log("[FRONTEND TRACE 3] Finished Round 1 resume screening.");
        }

        console.log("[FRONTEND TRACE 4] Calling loadApplication for app:", app.application_id);
        await loadApplication(app.application_id);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to initialize candidate application.");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Switch or Reset Candidate Application (Header action)
  const handleSwitchApplication = () => {
    handleApplyAsDifferentCandidate();
  };

  // Find Current Unlocked Round (Resume Screening is automatic and skipped here)
  const getCurrentUnlockedRound = (): StepperRoundItem | null => {
    if (!progress || !progress.rounds) return null;
    return (
      progress.rounds.find(
        (r) => r.round_type !== "resume_screening" && (r.status === "unlocked" || r.status === "in_progress")
      ) || null
    );
  };

  // Action: Launch Current Unlocked Round
  const handleLaunchUnlockedRound = async (round: StepperRoundItem) => {
    if (!progress) return;
    setPipelineError(null);

    // Verify sequential gating before proceeding
    const gating = await pipelineService.validateCanStartRound(
      progress.application.application_id,
      round.round_id
    );

    if (!gating.can_start) {
      // If candidate application not found on backend, attempt auto-restore!
      if (gating.notFound || gating.reason?.toLowerCase().includes("not found")) {
        const restored = await pipelineService.restoreApplication(
          progress.application.candidate_email,
          progress.application.job_role
        );
        if (restored.success && restored.data && restored.application) {
          setActiveAppId(restored.application.application_id);
          localStorage.setItem(ACTIVE_APP_STORAGE_KEY, restored.application.application_id);
          setProgress(restored.data);

          // Retry gating check with restored application
          const retryGating = await pipelineService.validateCanStartRound(
            restored.application.application_id,
            round.round_id
          );
          if (retryGating.can_start) {
            proceedToLaunchRound(restored.data.rounds.find((r) => r.round_id === round.round_id) || round);
            return;
          }
        }

        // Unrestorable - show inline error with prominent restart button
        setPipelineError({
          title: "Application Session Expired",
          message: "We could not find an active application record on the server. Please click below to restart your application cleanly.",
          canRestart: true
        });
        return;
      }

      // Sequential gating restriction (e.g. previous round not passed)
      setPipelineError({
        title: "Sequential Gating Restricted",
        message: gating.reason || "Previous round must be passed before accessing this round.",
        canRestart: false
      });
      return;
    }

    proceedToLaunchRound(round);
  };

  const proceedToLaunchRound = async (round: StepperRoundItem) => {
    if (!progress) return;

    if (round.round_type === "technical_interview") {
      // Open Instructions & Hardware Check Modal
      setTechRound(round);
      setShowTechInstructions(true);
      return;
    }

    if (round.round_type === "aptitude_test") {
      // Launch Interactive Real Aptitude Test Round via instructions page
      navigate(`/apply/round/2/instructions?appId=${encodeURIComponent(progress.application.application_id)}`);
      return;
    }

    try {
      // Attempt starting the round via service
      const startRes = await pipelineService.startRoundAttempt(
        progress.application.application_id,
        round.round_id,
        false
      );

      if (startRes.status === "coming_soon") {
        setComingSoonRound(round);
        return;
      }

      if (!startRes.success) {
        setPipelineError({
          title: "Could Not Start Round",
          message: startRes.error || "Unable to start round attempt.",
          canRestart: false
        });
        return;
      }

      // Open assessment simulation modal for other rounds
      setActiveRoundModal(round);
      setRoundActionMessage(null);
    } catch (err: any) {
      setPipelineError({
        title: "Could Not Start Round",
        message: err.message || "Unable to start round attempt.",
        canRestart: false
      });
    }
  };

  // Action: Complete Non-Interview Round Assessment
  const handleCompleteRoundAssessment = async (score: number, feedback: string) => {
    if (!progress || !activeRoundModal) return;
    setIsProcessingRound(true);

    try {
      // 1. Ensure attempt is started
      const startRes = await pipelineService.startRoundAttempt(
        progress.application.application_id,
        activeRoundModal.round_id,
        true
      );
      const attemptId = startRes.attempt?.attempt_id || `att-${Date.now()}`;

      // 2. Submit normalized score
      await pipelineService.submitNormalizedScore(
        attemptId,
        score,
        feedback,
        {
          completed_via: "ApplicationOverview",
          round_type: activeRoundModal.round_type,
          tested_at: new Date().toISOString()
        },
        true
      );

      // 3. Reload application progress
      await loadApplication(progress.application.application_id);
      setActiveRoundModal(null);
    } catch (err: any) {
      setRoundActionMessage(`Error submitting assessment: ${err.message}`);
    } finally {
      setIsProcessingRound(false);
    }
  };

  // Action: Begin Live Technical Interview
  const handleBeginLiveInterview = async () => {
    if (!progress || !techRound) return;
    setIsProcessingRound(true);

    try {
      // Stop the hardware test camera so the live room can access the device
      stopHardwareCheck();

      // Start the round attempt in the pipeline
      const startRes = await pipelineService.startRoundAttempt(
        progress.application.application_id,
        techRound.round_id,
        false
      );

      const attemptId = startRes.attempt?.attempt_id || `att-${Date.now()}`;

      // Navigate to the Video Interview Studio with all pipeline state
      navigate(`/interview/${encodeURIComponent(progress.application.candidate_name)}`, {
        state: {
          candidateName: progress.application.candidate_name,
          candidateEmail: progress.application.candidate_email,
          jobTitle: progress.application.job_role,
          applicationId: progress.application.application_id,
          roundId: techRound.round_id,
          attemptId: attemptId,
          autoStart: true,
          directLaunch: true
        }
      });
    } catch (err: any) {
      setPipelineError({
        title: "Interview Launch Error",
        message: err.message || "Could not start technical interview.",
        canRestart: false
      });
      setIsProcessingRound(false);
    }
  };

  const currentUnlockedRound = getCurrentUnlockedRound();
  const resumeCharCount = resumeText.length;
  const resumeWordCount = resumeText.trim() ? resumeText.trim().split(/\s+/).length : 0;
  const isResumeValid = resumeText.trim().length >= 200 && !isExtractingResume;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* ─────────────────────────────────────────────────────────────
          TOP NAVBAR
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" asLink={true} />
            <span className="hidden sm:inline-block h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Candidate Hiring Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            {progress && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwitchApplication}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                Switch Role / Reset
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-xs border-slate-300 dark:border-slate-700"
            >
              Recruiter Dashboard
            </Button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT AREA
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Blocked Redirect Warning Banner */}
        {isBlockedRedirect && (
          <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold">Interview Access Restricted</h4>
              <p className="text-xs mt-0.5 text-amber-800 dark:text-amber-300 leading-relaxed">
                {blockedReason ||
                  "The Technical Interview is one stage in our hiring pipeline. You cannot start the interview directly without an active application and completing preceding rounds."}
              </p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Loading candidate hiring portal...</p>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCENARIO 0: RETURNING CANDIDATE WELCOME BACK CARD
            (Shown when an application is saved in this browser)
        ───────────────────────────────────────────────────────────── */}
        {!isLoading && showWelcomeBack && savedAppProgress && (
          <div className="max-w-xl mx-auto py-4 sm:py-8 space-y-4 animate-in fade-in">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 text-center space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 mx-auto flex items-center justify-center border border-blue-200 dark:border-blue-800 shadow-2xs">
                  <Sparkles className="w-6 h-6" />
                </div>

                <div className="space-y-1.5">
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  >
                    Application on File
                  </Badge>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Welcome back
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                    A previous candidate application was found in this browser:
                  </p>
                </div>

                {/* Candidate Highlight Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {savedAppProgress.application.candidate_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {savedAppProgress.application.job_role} • <span className="font-mono text-[11px]">{savedAppProgress.application.candidate_email}</span>
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold px-2.5 py-0.5 ${
                        savedAppProgress.rounds?.some((r) => r.status === "failed") || savedAppProgress.overall_status === "not_selected"
                          ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                          : savedAppProgress.overall_status === "qualified"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      }`}
                    >
                      {formatCandidateStatusSummary(savedAppProgress)}
                    </Badge>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-[12px] text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{savedAppProgress.application.candidate_name}</span>, {savedAppProgress.application.job_role}, <span className="font-semibold">{formatCandidateStatusSummary(savedAppProgress)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    onClick={handleContinueMyApplication}
                    className="w-full sm:w-auto h-11 px-6 bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue my application</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleApplyAsDifferentCandidate}
                    className="w-full sm:w-auto h-11 px-5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm rounded-xl cursor-pointer"
                  >
                    Apply as a different candidate
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCENARIO A: NEW CANDIDATE APPLICATION FORM
        ───────────────────────────────────────────────────────────── */}
        {!progress && !isLoading && !showWelcomeBack && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Multi-Round Hiring Pipeline</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Start Candidate Application
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Select your target job role and provide your resume. Your application will be structured into sequential hiring rounds.
              </p>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="text-lg font-bold">Candidate Details & Role Selection</CardTitle>
                <CardDescription className="text-xs">
                  Round 1 (Resume Screening) unlocks automatically upon application submission.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-5">
                {/* Notice: Returning candidate with same email & role */}
                {existingAppNotice && (
                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/90 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 space-y-3 animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          An application already exists for this email. Continue it?
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          Found an active record for <span className="font-semibold text-slate-900 dark:text-slate-100">{existingAppNotice.application.candidate_name}</span> as <span className="font-semibold text-slate-900 dark:text-slate-100">{existingAppNotice.application.job_role}</span> ({formatCandidateStatusSummary(existingAppNotice.stepper)}). You can continue where you left off. Submitting again will not reset previous attempts or rounds.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleContinueExistingApplication}
                        className="bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs h-9 px-4 rounded-lg cursor-pointer"
                      >
                        Continue Application
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExistingAppNotice(null)}
                        className="text-xs border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 h-9 px-3 rounded-lg cursor-pointer"
                      >
                        Use a different email or role
                      </Button>
                    </div>
                  </div>
                )}

                {formError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateApplication} className="space-y-4">
                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                      Candidate Full Name
                    </label>
                    <Input
                      placeholder="e.g. Priya Mehta"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="h-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                      required
                    />
                  </div>

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                      Candidate Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="priya.m@techstudio.dev"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className="h-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                      required
                    />
                  </div>

                  {/* Target Role Selector */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                      Select Target Position & Track
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {AVAILABLE_JOB_ROLES.map((r) => {
                        const isSelected = selectedRole === r.role;
                        return (
                          <div
                            key={r.role}
                            onClick={() => setSelectedRole(r.role)}
                            className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                              isSelected
                                ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 ring-1 ring-blue-600/30"
                                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {r.role}
                              </span>
                              <span className="text-[10px] font-sans tabular-nums font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                {r.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                              {r.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resume Upload / Paste Section */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                        <span>Resume Content (Required for Round 1: Resume Screening)</span>
                      </label>
                      {resumeFileName && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-sans px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{resumeFileName}</span>
                            {resumeFileSize && (
                              <span className="text-emerald-500 tabular-nums">({(resumeFileSize / 1024).toFixed(0)} KB)</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={handleClearResume}
                            className="text-[11px] text-red-600 dark:text-red-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Clear and re-upload</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Upload button and instruction banner */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <label
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                            isExtractingResume
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                          }`}
                        >
                          {isExtractingResume ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span>{isExtractingResume ? "Extracting Text..." : "Upload Resume (.pdf, .docx, .txt)"}</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,.txt"
                            disabled={isExtractingResume}
                            className="hidden"
                            onChange={handleFileUpload}
                          />
                        </label>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                          Max 5 MB • Cleanly extracted via FastAPI (PyMuPDF / python-docx)
                        </span>
                      </div>

                      {resumeFileName && (
                        <button
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) fileInputRef.current.click();
                          }}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Replace file
                        </button>
                      )}
                    </div>

                    {/* Upload / Extraction Error Alert */}
                    {resumeUploadError && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Upload & Extraction Error</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed">{resumeUploadError}</p>
                        </div>
                      </div>
                    )}

                    {/* Extraction Warning Alert */}
                    {resumeWarning && !resumeUploadError && (
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Text Quality Warning</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed">{resumeWarning}</p>
                        </div>
                      </div>
                    )}

                    {/* Textarea - 240px tall, normal readable font (not monospace), editable */}
                    <div className="relative">
                      {isExtractingResume && (
                        <div className="absolute inset-0 z-10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xs rounded-lg flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Extracting & cleaning resume text on FastAPI backend...
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Normalizing whitespace, removing headers/footers & control characters
                          </p>
                        </div>
                      )}

                      <Textarea
                        placeholder="Extracted resume text will appear here. You can also paste or edit your resume text manually (minimum 200 characters required)..."
                        value={resumeText}
                        onChange={(e) => {
                          setResumeText(e.target.value);
                          if (resumeUploadError) setResumeUploadError(null);
                        }}
                        className="h-60 min-h-[240px] bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-sans leading-relaxed text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-blue-600"
                      />
                    </div>

                    {/* Character & Word count footer with validation status */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="font-sans tabular-nums text-slate-500 dark:text-slate-400">
                        {resumeCharCount.toLocaleString()} characters • {resumeWordCount.toLocaleString()} words
                      </span>

                      {isResumeValid ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Valid for ATS Screening ({resumeCharCount} chars)</span>
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>
                            {resumeText.trim().length === 0
                              ? "Resume text required (upload or paste)"
                              : `Need at least 200 characters (${resumeCharCount}/200)`}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <div className="pt-3">
                    <Button
                      type="submit"
                      disabled={isSubmittingApp || !isResumeValid}
                      className={`w-full h-11 font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 text-sm transition-all ${
                        !isResumeValid
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                          : "bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
                      }`}
                    >
                      {isSubmittingApp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Initializing Application Pipeline...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Application & Begin Pipeline</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                    {!isResumeValid && (
                      <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-1.5">
                        {resumeText.trim().length === 0
                          ? "Upload a resume file (.pdf, .docx, .txt) or paste text to enable submission."
                          : `Resume must contain at least 200 characters (currently ${resumeCharCount}/200) to proceed.`}
                      </p>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SCENARIO B: ACTIVE APPLICATION PIPELINE OVERVIEW
        ───────────────────────────────────────────────────────────── */}
        {progress && !isLoading && !showWelcomeBack && (
          <div className="space-y-6">
            {/* Aptitude Test In Progress Banner */}
            {activeAptitudeSession && activeAptitudeSession.remainingSeconds > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/90 dark:bg-blue-950/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Aptitude Test in progress, {formatCountdown(activeAptitudeSession.remainingSeconds)} remaining</span>
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping inline-block" />
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Your test clock is running continuously on the server. Click below to resume your assessment before time expires.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    navigate(`/apply/round/2/test?appId=${encodeURIComponent(progress.application.application_id)}`);
                  }}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs h-10 px-5 rounded-xl flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Resume Test</span>
                </Button>
              </div>
            )}

            {/* Header Application Banner */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {progress.application.candidate_name}
                  </h2>
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold px-2.5 py-0.5 ${
                      progress.overall_status === "qualified"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                        : progress.overall_status === "not_selected"
                        ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
                        : progress.overall_status === "on_hold"
                        ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                        : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                    }`}
                  >
                    {progress.overall_status === "qualified" && "Qualified • Offer Ready"}
                    {progress.overall_status === "not_selected" && "Not Selected"}
                    {progress.overall_status === "on_hold" && "Awaiting Recruiter Review"}
                    {progress.overall_status === "in_pipeline" &&
                      `Round ${progress.current_round_order} of ${progress.rounds.length}`}
                  </Badge>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Target Position: <span className="font-semibold text-slate-800 dark:text-slate-200">{progress.application.job_role}</span> • Email: <span className="font-sans font-medium text-slate-700 dark:text-slate-300">{progress.application.candidate_email}</span>
                </p>
              </div>

              {/* Status & Cumulative Score Pill */}
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center min-w-[120px]">
                  <p className="text-[10px] uppercase font-semibold font-sans text-slate-500 dark:text-slate-400">
                    Weighted Score
                  </p>
                  <p className="text-lg font-bold font-sans tabular-nums text-blue-700 dark:text-blue-400">
                    {progress.total_weighted_score > 0 ? `${progress.total_weighted_score}/100` : "Pending"}
                  </p>
                </div>
              </div>
            </div>

            {/* Clear Message if Role Has No Pipeline */}
            {hasNoPipeline && (
              <div className="p-5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <h3 className="text-sm font-bold">No Pipeline Configured</h3>
                </div>
                <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
                  No active hiring pipeline has been configured for the role "{progress.application.job_role}". Please contact the recruitment team or switch to one of the calibrated roles.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSwitchApplication}
                  className="mt-2 text-xs border-red-300 text-red-900"
                >
                  Select Another Role
                </Button>
              </div>
            )}

            {/* Inline Pipeline Error Banner */}
            {pipelineError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start justify-between gap-3 shadow-2xs animate-in fade-in">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold font-sans text-red-900 dark:text-red-200">
                      {pipelineError.title}
                    </h5>
                    <p className="text-xs font-sans text-red-800 dark:text-red-300 leading-relaxed">
                      {pipelineError.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {pipelineError.canRestart && (
                    <Button
                      size="sm"
                      onClick={handleSwitchApplication}
                      className="bg-red-700 hover:bg-red-800 text-white font-semibold text-xs h-8 px-3 rounded-lg cursor-pointer shadow-2xs"
                    >
                      Restart Application
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPipelineError(null)}
                    className="text-red-500 hover:text-red-700 text-xs p-1 cursor-pointer"
                    aria-label="Dismiss error banner"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                AUTOMATIC RESUME SCREENING RESULT CARD
            ───────────────────────────────────────────────────────────── */}
            {atsResult && (
              <Card className={`rounded-2xl border transition-all overflow-hidden shadow-xs ${
                atsResult.passed
                  ? "bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 border-emerald-300 dark:border-emerald-800"
                  : atsResult.onFailAction === "hold"
                  ? "bg-gradient-to-br from-amber-50/70 via-white to-slate-50 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 border-amber-300 dark:border-amber-800"
                  : "bg-gradient-to-br from-red-50/70 via-white to-slate-50 dark:from-red-950/20 dark:via-slate-900 dark:to-slate-900 border-red-300 dark:border-red-800"
              }`}>
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                            atsResult.passed
                              ? "bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                              : atsResult.onFailAction === "hold"
                              ? "bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                              : "bg-red-100/80 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700"
                          }`}
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>Round 1 • Automatic Resume Screening</span>
                        </Badge>

                        {atsResult.evaluationMethod && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                          >
                            {atsResult.evaluationMethod === "llm_verified" && `AI Screened • ${atsResult.model || "LLM"}`}
                            {atsResult.evaluationMethod === "keyword_fallback" && `Keyword Fallback • ${atsResult.model || "keyword_v1"}`}
                            {atsResult.evaluationMethod === "llm_unavailable_pending" && "Pending AI Evaluation"}
                            {atsResult.evaluationMethod === "flagged_injection_defense" && "Security Flagged"}
                          </Badge>
                        )}

                        <span className="text-xs font-sans text-slate-500 dark:text-slate-400">
                          Evaluated automatically against role requirements
                        </span>
                      </div>

                      <CardTitle className="text-lg font-bold font-sans text-slate-900 dark:text-slate-100 flex items-center gap-2 pt-1">
                        <span>ATS Match Evaluation</span>
                        {atsResult.status === "pending_evaluation" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                            <Clock className="w-3.5 h-3.5" /> Pending Evaluation
                          </span>
                        ) : atsResult.passed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Passed Cutoff
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Below Cutoff
                          </span>
                        )}
                      </CardTitle>
                    </div>

                    {/* Score & Cutoff Pill */}
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <div className="p-2.5 sm:p-3 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center min-w-[130px] shadow-2xs">
                        <p className="text-[10px] uppercase font-semibold font-sans text-slate-500 dark:text-slate-400">
                          ATS Match Score
                        </p>
                        <div className="flex items-baseline justify-center gap-1 pt-0.5">
                          <span className={`text-2xl font-bold font-sans tabular-nums ${
                            atsResult.status === "pending_evaluation"
                              ? "text-blue-600 dark:text-blue-400 text-lg"
                              : atsResult.passed
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}>
                            {atsResult.status === "pending_evaluation" ? "Pending" : `${atsResult.score}%`}
                          </span>
                          {atsResult.status !== "pending_evaluation" && (
                            <span className="text-xs font-sans text-slate-400 dark:text-slate-500">
                              / 100%
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-sans text-slate-500 dark:text-slate-400 mt-0.5">
                          Cutoff: <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">{atsResult.cutoff}%</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Security / Prompt Injection Flag Banner */}
                  {atsResult.flagged && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-xs text-amber-900 dark:text-amber-100">
                        <h4 className="font-bold">Security Review Flagged</h4>
                        <p>
                          Potential prompt manipulation or override instructions detected in resume text. Your application has been safely flagged for manual recruiter review.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Pending Evaluation Banner */}
                  {atsResult.status === "pending_evaluation" && (
                    <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-xs text-blue-900 dark:text-blue-100">
                        <h4 className="font-bold">AI Resume Evaluation Pending</h4>
                        <p>
                          Your resume is currently queued for evaluation by our backend AI model. Results will update automatically.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Skills Breakdown Grid: Matched & Missing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Matched Skills */}
                    <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold font-sans text-emerald-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Matched Skills ({atsResult.matchedSkills.length})</span>
                        </h4>
                        <span className="text-[11px] font-sans tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">
                          Found in resume
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        {atsResult.matchedDetails && atsResult.matchedDetails.length > 0 ? (
                          atsResult.matchedDetails.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-white dark:bg-slate-800 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-700 shadow-2xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-xs font-semibold">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{item.skill}</span>
                                </div>
                                {item.category && (
                                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-mono font-semibold">
                                    {item.category === "must_have" ? "Must-Have" : "Nice-To-Have"}
                                  </span>
                                )}
                              </div>
                              {item.evidence_quote && (
                                <p className="text-[11px] font-sans text-emerald-700 dark:text-emerald-300 italic pl-5">
                                  Found in resume: &ldquo;{item.evidence_quote}&rdquo;
                                </p>
                              )}
                            </div>
                          ))
                        ) : atsResult.matchedSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {atsResult.matchedSkills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium font-sans bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 shadow-2xs"
                              >
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{skill}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic font-sans">No direct matching skills detected.</span>
                        )}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold font-sans text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <span>Missing Skills ({atsResult.missingSkills.length})</span>
                        </h4>
                        <span className="text-[11px] font-sans tabular-nums font-medium text-slate-500 dark:text-slate-400">
                          Role requirements not found
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        {atsResult.missingDetails && atsResult.missingDetails.length > 0 ? (
                          atsResult.missingDetails.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-0.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                  <span className="text-slate-400 font-bold">✕</span>
                                  <span>{item.skill}</span>
                                </div>
                                {item.category && (
                                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                    {item.category === "must_have" ? "Must-Have" : "Nice-To-Have"}
                                  </span>
                                )}
                              </div>
                              {item.dropped_reason && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic pl-4">
                                  {item.dropped_reason}
                                </p>
                              )}
                            </div>
                          ))
                        ) : atsResult.missingSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {atsResult.missingSkills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium font-sans bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs"
                              >
                                <span className="text-slate-400">✕</span>
                                <span>{skill}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium font-sans">All calibrated core skills matched!</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Result Status Message & Next Steps / Recruiter Setting */}
                  {atsResult.passed ? (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold font-sans text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Round 1 Passed! Round 2 is now unlocked.</span>
                        </p>
                        <p className="text-xs font-sans text-emerald-800 dark:text-emerald-300">
                          Your ATS match score of <span className="font-bold tabular-nums">{atsResult.score}%</span> exceeded the required <span className="font-bold tabular-nums">{atsResult.cutoff}%</span> cutoff.
                        </p>
                      </div>

                      {/* Continue to Round 2 Button */}
                      {progress.rounds.find((r) => r.order === 2 && r.status === "unlocked") && (
                        <Button
                          size="sm"
                          onClick={() => {
                            navigate(`/apply/round/2/instructions?appId=${encodeURIComponent(progress.application.application_id)}`);
                          }}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-9 px-4 rounded-xl flex items-center gap-2 shadow-xs shrink-0 cursor-pointer"
                        >
                          <span>Start Round 2: {progress.rounds.find((r) => r.order === 2)?.title}</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                      atsResult.onFailAction === "hold"
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                        : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200"
                    }`}>
                      <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                        atsResult.onFailAction === "hold" ? "text-amber-600" : "text-red-600"
                      }`} />
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold font-sans uppercase tracking-wider">
                          {atsResult.onFailAction === "hold"
                            ? "Application Held for Recruiter Review"
                            : "Application Terminated — Cutoff Threshold Not Met"}
                        </h5>
                        <p className="text-xs font-sans leading-relaxed">
                          {atsResult.onFailAction === "hold" ? (
                            <>
                              Your ATS match score of <span className="font-bold tabular-nums">{atsResult.score}%</span> is below the <span className="font-bold tabular-nums">{atsResult.cutoff}%</span> cutoff. Per the recruiter's configuration for this role, your application has been placed <span className="font-semibold">on hold for manual review</span>. The recruitment team will evaluate your background before unlocking further rounds.
                            </>
                          ) : (
                            <>
                              Your ATS match score of <span className="font-bold tabular-nums">{atsResult.score}%</span> did not meet the role cutoff of <span className="font-bold tabular-nums">{atsResult.cutoff}%</span>. Based on automated screening rules configured for this position, the application is <span className="font-semibold">closed and not selected</span> to proceed to Round 2.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ─────────────────────────────────────────────────────────────
                PROGRESS STEPPER (ALL ROUNDS IN ORDER)
            ───────────────────────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-slate-100">
                    Hiring Pipeline Rounds
                  </h3>
                  <p className="text-xs font-sans text-slate-500 dark:text-slate-400">
                    Rounds must be passed sequentially. Locked rounds unlock when previous cutoff is met.
                  </p>
                </div>
                <span className="text-xs font-sans tabular-nums font-medium text-slate-500 dark:text-slate-400">
                  {progress.rounds.filter((r) => r.status === "passed").length} of {progress.rounds.length} Passed
                </span>
              </div>

              {/* Stepper Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {progress.rounds.map((round) => {
                  const isPassed = round.status === "passed";
                  const isFailed = round.status === "failed";
                  const isCurrent = round.status === "unlocked" || round.status === "in_progress";
                  const isLocked = round.status === "locked";

                  return (
                    <div
                      key={round.round_id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 relative ${
                        isPassed
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-2xs"
                          : isFailed
                          ? "bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-800"
                          : isCurrent
                          ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-600 ring-2 ring-blue-600/30 shadow-xs"
                          : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
                      }`}
                    >
                      {/* Top Header: Order & Status */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-sans tabular-nums ${
                            isPassed
                              ? "bg-emerald-600 text-white"
                              : isFailed
                              ? "bg-red-600 text-white"
                              : isCurrent
                              ? "bg-blue-700 text-white"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                          }`}
                        >
                          {round.order}
                        </span>

                        <div className="flex items-center gap-1 font-sans">
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

                      {/* Round Information */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold font-sans text-slate-900 dark:text-slate-100 leading-tight">
                          {round.title}
                        </h4>
                        <p className="text-[10px] font-sans text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {round.description}
                        </p>
                      </div>

                      {/* Metrics (Cutoff & Weight) */}
                      <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[10px] font-sans flex flex-col gap-1">
                        <div className="flex justify-between text-slate-500 dark:text-slate-400">
                          <span>Cutoff:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{round.cutoff_score}%</span>
                        </div>
                        {round.round_type !== "resume_screening" && (
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Duration:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{round.duration_minutes}m</span>
                          </div>
                        )}
                        {round.round_type === "resume_screening" && (
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Mode:</span>
                            <span className="font-semibold text-blue-700 dark:text-blue-300">Automatic ATS</span>
                          </div>
                        )}
                        {round.score_data?.score !== undefined && round.score_data?.score !== null && (
                          <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-700 font-bold">
                            <span className="text-slate-700 dark:text-slate-300">Score:</span>
                            <span className={round.score_data.passed ? "text-emerald-600 font-sans tabular-nums font-semibold" : "text-red-600 font-sans tabular-nums font-semibold"}>
                              {round.score_data.score}/100
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status Note */}
                      <div className="text-center text-[10px] py-1 font-sans">
                        {isPassed && <span className="text-emerald-700 dark:text-emerald-400 font-semibold">✓ Completed</span>}
                        {isFailed && <span className="text-red-600 dark:text-red-400 font-medium">Cutoff missed</span>}
                        {isCurrent && <span className="text-blue-700 dark:text-blue-400 font-semibold">Current Round</span>}
                        {isLocked && <span className="text-slate-400 flex items-center justify-center gap-1 font-sans"><Lock className="w-3 h-3" /> Locked</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                CURRENT UNLOCKED ROUND ACTION HUB
                (Requirement: ONE Start or Continue button for current unlocked round only!)
            ───────────────────────────────────────────────────────────── */}
            {currentUnlockedRound ? (
              <Card className="border-blue-600/40 dark:border-blue-500/30 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-blue-100 dark:border-blue-950">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold font-sans tabular-nums">
                        {currentUnlockedRound.order}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider font-sans text-blue-700 dark:text-blue-400">
                        Current Unlocked Round
                      </span>
                    </div>
                    <span className="text-xs font-sans text-slate-500 dark:text-slate-400">
                      Duration: <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">{currentUnlockedRound.duration_minutes}</span> mins • Cutoff: <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">{currentUnlockedRound.cutoff_score}</span>%
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold font-sans pt-1">
                    {currentUnlockedRound.title}
                  </CardTitle>
                  <CardDescription className="text-xs font-sans text-slate-600 dark:text-slate-400">
                    {currentUnlockedRound.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs font-sans text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      All preceding requirements are verified and passed.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {currentUnlockedRound.round_type === "technical_interview"
                        ? "Clicking below will open instructions and test your camera & microphone before starting."
                        : "Click below to begin the assessment for this round."}
                    </p>
                  </div>

                  {/* ONE START / CONTINUE BUTTON ONLY */}
                  <Button
                    size="lg"
                    onClick={() => handleLaunchUnlockedRound(currentUnlockedRound)}
                    className="h-11 px-6 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 shrink-0 transition-all text-sm cursor-pointer"
                  >
                    <span>
                      {currentUnlockedRound.round_type === "technical_interview"
                        ? "Start Technical Interview (Setup)"
                        : currentUnlockedRound.order === 2
                        ? `Start Round 2: ${currentUnlockedRound.title}`
                        : `Start Round ${currentUnlockedRound.order}: ${currentUnlockedRound.title}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : progress.overall_status === "qualified" ? (
              <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                  Congratulations! All Rounds Completed
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
                  You have successfully passed every stage in the hiring track with a weighted score of {progress.total_weighted_score}/100. The recruitment team will reach out with next steps.
                </p>
              </Card>
            ) : progress.overall_status === "not_selected" ? (
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30 rounded-2xl p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                  {progress.rounds?.some((r) => r.status === "failed")
                    ? `Not selected at Round ${progress.rounds.find((r) => r.status === "failed")?.order}`
                    : "Application Closed • Not Selected"}
                </h3>
                <p className="text-xs text-red-700 dark:text-red-300 max-w-md mx-auto leading-relaxed">
                  {progress.status_message || "The candidate did not meet the required cutoff threshold for this round."}
                </p>
              </Card>
            ) : progress.overall_status === "on_hold" ? (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Application Under Review • Placed On Hold
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 max-w-md mx-auto leading-relaxed">
                  {progress.status_message || "Your application is currently paused awaiting manual recruiter review."}
                </p>
              </Card>
            ) : (
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-6 text-center space-y-2">
                <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Processing Application Pipeline
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {progress.status_message || "Awaiting evaluation. Your next round will unlock shortly."}
                </p>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: TECHNICAL INTERVIEW INSTRUCTIONS & HARDWARE CHECK
          (Moved here as required: camera & mic check and start only on click!)
      ───────────────────────────────────────────────────────────── */}
      {showTechInstructions && techRound && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden my-6">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Technical Interview • Hardware & Instructions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Round {techRound.order} of {progress?.rounds.length} • Calibrated Live AI Video Room
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  stopHardwareCheck();
                  setShowTechInstructions(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-1 rounded"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Stage Overview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Interview Stage Progression (30 Minutes)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { title: "1. Intro & Warmup", time: "5 mins", desc: "Background & career trajectory" },
                    { title: "2. Technical Core", time: "12 mins", desc: "System depth & algorithms" },
                    { title: "3. Architecture", time: "8 mins", desc: "Scale, bottlenecks & trade-offs" },
                    { title: "4. Rubric Wrap-up", time: "5 mins", desc: "Candidate questions & scoring" }
                  ].map((st, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                      <p className="text-xs font-bold font-sans text-slate-800 dark:text-slate-200">{st.title}</p>
                      <p className="text-[10px] text-blue-700 dark:text-blue-400 font-sans tabular-nums font-semibold">{st.time}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{st.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hardware Test Area */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
                      <Camera className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                      Camera & Microphone Readiness Check
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Verify your webcam and microphone before entering the live interview room.
                    </p>
                  </div>

                  {!cameraActive ? (
                    <Button
                      size="sm"
                      onClick={startHardwareCheck}
                      className="h-8 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded-lg flex items-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Test Camera & Mic</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={stopHardwareCheck}
                      className="h-8 text-xs border-slate-300 text-slate-700 dark:text-slate-300"
                    >
                      <CameraOff className="w-3.5 h-3.5 mr-1" />
                      <span>Turn Off Preview</span>
                    </Button>
                  )}
                </div>

                {cameraError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{cameraError}</span>
                  </div>
                )}

                {/* Video Preview Container */}
                <div className="relative w-full aspect-video max-h-56 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                  />

                  {!cameraActive && (
                    <div className="text-center space-y-2 p-4 text-slate-400">
                      <div className="w-10 h-10 rounded-full bg-slate-800 mx-auto flex items-center justify-center">
                        <Camera className="w-5 h-5 text-slate-500" />
                      </div>
                      <p className="text-xs">Camera preview inactive</p>
                      <p className="text-[10px] text-slate-500">
                        Click "Test Camera & Mic" above to verify devices.
                      </p>
                    </div>
                  )}

                  {cameraActive && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-sans text-emerald-400 flex items-center gap-1 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Preview</span>
                    </div>
                  )}
                </div>

                {/* Microphone Audio Level Indicator */}
                {cameraActive && micActive && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-sans text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Mic className="w-3.5 h-3.5 text-blue-600" /> Microphone Input Level
                      </span>
                      <span className="tabular-nums font-medium">{audioLevel}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-75"
                        style={{ width: `${Math.max(5, audioLevel)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Hardware Verification Checklist */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                    cameraActive ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                  }`}>
                    {cameraActive ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Camera className="w-3.5 h-3.5" />}
                    <span>Webcam {cameraActive ? "Ready" : "Optional"}</span>
                  </div>

                  <div className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                    micActive ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                  }`}>
                    {micActive ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>Mic {micActive ? "Ready" : "Optional"}</span>
                  </div>

                  <div className="p-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Groq STT Ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer CTA */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  stopHardwareCheck();
                  setShowTechInstructions(false);
                }}
                className="text-xs"
              >
                Back to Overview
              </Button>

              <Button
                size="sm"
                disabled={isProcessingRound}
                onClick={handleBeginLiveInterview}
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs h-9 px-5 rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <span>Enter Live Interview Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: INTERMEDIATE ROUND ASSESSMENT (RESUME / APTITUDE / CODING / GD / HR)
      ───────────────────────────────────────────────────────────── */}
      {activeRoundModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-sans text-slate-900 dark:text-slate-100">
                  Round {activeRoundModal.order}: {activeRoundModal.title}
                </h3>
                <p className="text-xs font-sans text-slate-500 dark:text-slate-400">
                  Duration: <span className="tabular-nums">{activeRoundModal.duration_minutes}</span>m • Cutoff: <span className="tabular-nums">{activeRoundModal.cutoff_score}</span>%
                </p>
              </div>

              <button
                onClick={() => setActiveRoundModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
                <p className="font-semibold">{activeRoundModal.title} Assessment</p>
                <p className="mt-0.5 text-blue-800 dark:text-blue-300 leading-relaxed">
                  {activeRoundModal.description}
                </p>
              </div>

              {activeRoundModal.round_type === "resume_screening" ? (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600 dark:text-slate-400 font-sans">
                    ATS semantic role screening will score keyword presence, architectural experience, and relevant skills against the calibrated rubric for <span className="font-semibold text-slate-900 dark:text-slate-100">{progress?.application.job_role}</span>.
                  </p>

                  {/* Candidate & Original Document Info */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 text-[11px] font-sans">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span>Candidate:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {progress?.application.candidate_name} ({progress?.application.candidate_email})
                      </span>
                    </div>

                    {(progress?.application.metadata?.resume_file_name || localStorage.getItem(`resume_name_${progress?.application.application_id}`)) && (
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                        <span>Original File:</span>
                        <span className="font-sans text-emerald-600 dark:text-emerald-400">
                          {progress?.application.metadata?.resume_file_name || localStorage.getItem(`resume_name_${progress?.application.application_id}`)}
                        </span>
                      </div>
                    )}

                    {(progress?.application.metadata?.resume_file_path || localStorage.getItem(`resume_path_${progress?.application.application_id}`)) && (
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span>Original Document:</span>
                        <a
                          href={`${FASTAPI_BASE_URL}/api/resume/download/${encodeURIComponent(
                            (progress?.application.metadata?.resume_file_path || localStorage.getItem(`resume_path_${progress?.application.application_id}`) || "").split("/").pop() || ""
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>Open / Download Original Resume</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Clean Extracted Text Preview */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Clean Extracted Resume Text (Evaluated in Round 1)</span>
                    </label>
                    <div className="max-h-36 overflow-y-auto p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-sans leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap select-all">
                      {progress?.application.metadata?.resume_text ||
                        localStorage.getItem(`resume_text_${progress?.application.application_id}`) ||
                        "No resume text attached."}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                  <p>
                    This is a foundational stage in the hiring track. Completing this assessment evaluates candidate competency and determines whether the next round is unlocked.
                  </p>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Assessment Rules:</p>
                    <p>• Passing Score Cutoff: {activeRoundModal.cutoff_score}/100</p>
                    <p>• On Fail Action: {activeRoundModal.on_fail_action === "reject" ? "Auto-reject" : "Hold for recruiter review"}</p>
                    <p>• Weight towards total hiring score: {activeRoundModal.weight}%</p>
                  </div>
                </div>
              )}

              {roundActionMessage && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs">
                  {roundActionMessage}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveRoundModal(null)}
                className="text-xs"
              >
                Cancel
              </Button>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={isProcessingRound}
                  onClick={() => handleCompleteRoundAssessment(85, "Passed round requirements with solid score.")}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs h-9 px-4 rounded-lg flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Complete Round (Pass: 85%)</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: ROUND COMING SOON MODAL (APTITUDE TEST / FUTURE ROUNDS)
      ───────────────────────────────────────────────────────────── */}
      {comingSoonRound && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 mx-auto flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold font-sans text-slate-900 dark:text-slate-100">
                Round {comingSoonRound.order} Unlocked!
              </h3>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-sans uppercase tracking-wider">
                {comingSoonRound.title} • Coming Soon
              </p>
              <p className="text-xs font-sans text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                Congratulations on passing Round 1! Round 2 ({comingSoonRound.title}) is unlocked and registered in the system. The interactive testing module is currently being finalized.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-sans text-left">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Status</p>
                <p className="text-[11px] text-slate-500">Eligibility Verified</p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Launch
              </span>
            </div>

            <Button
              onClick={() => setComingSoonRound(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs h-10 rounded-xl cursor-pointer"
            >
              Back to my application
            </Button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: REAL ROUND 2 APTITUDE ASSESSMENT MODAL
      ───────────────────────────────────────────────────────────── */}
      {aptitudeRound && progress && (
        <AptitudeTestModal
          applicationId={progress.application.application_id}
          round={aptitudeRound}
          candidateName={progress.application.candidate_name}
          candidateEmail={progress.application.candidate_email}
          onClose={() => {
            setAptitudeRound(null);
            loadApplication(progress.application.application_id);
          }}
          onComplete={async () => {
            await loadApplication(progress.application.application_id);
          }}
        />
      )}
    </div>
  );
};
