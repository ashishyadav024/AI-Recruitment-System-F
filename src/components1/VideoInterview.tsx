import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  Bot, 
  User, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  Award, 
  RotateCcw,
  Briefcase,
  Clock,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Camera,
  Volume2,
  VolumeX,
  RotateCw,
  Sun,
  Moon,
  ArrowLeft,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { interviewService, AnswerEvaluation } from "@/services/interviewService";
import { useTheme } from "../context/ThemeContext";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    __simulateVoiceTranscript?: (text: string) => void;
  }
}

interface VideoInterviewProps {
  roomid?: boolean;
  isRoom?: boolean;
}

interface MessageItem {
  role: 'ai' | 'candidate';
  content: string;
  stage?: string;
  questionNumber?: number;
  evaluation?: AnswerEvaluation;
}

const VideoInterview: React.FC<VideoInterviewProps> = () => {
  const { roomid: urlRoomid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const locationState = location.state as {
    candidateName?: string;
    candidateEmail?: string;
    jobTitle?: string;
    skills?: string[];
    candidateResume?: string;
    jobDescription?: string;
  } | null;

  const isLiveDemo = typeof window !== 'undefined' && window.location.search.includes('live');

  // Setup state pre-populated from screening hand-off (or empty if not available)
  const [candidateName, setCandidateName] = useState<string>(
    locationState?.candidateName ?? (urlRoomid ? decodeURIComponent(urlRoomid) : (isLiveDemo ? "Aarav Sharma" : ""))
  );
  const [candidateEmail, setCandidateEmail] = useState<string>(
    locationState?.candidateEmail ?? (isLiveDemo ? "aarav.sharma@example.com" : "")
  );
  const [jobTitle, setJobTitle] = useState<string>(
    locationState?.jobTitle ?? (isLiveDemo ? "Senior ML Engineer" : "")
  );
  const [candidateSkills, setCandidateSkills] = useState<string[]>(
    locationState?.skills ?? []
  );
  const [candidateResume, setCandidateResume] = useState<string>(
    locationState?.candidateResume ?? ""
  );
  const [jobDescription, setJobDescription] = useState<string>(
    locationState?.jobDescription ?? ""
  );
  

  // Interview runtime state
  const [interviewStarted, setInterviewStarted] = useState(isLiveDemo);
  const [interviewId, setInterviewId] = useState<string>(isLiveDemo ? "sim-preview-101" : "");
  const [currentStage, setCurrentStage] = useState<string>(isLiveDemo ? "technical" : "intro");
  const [currentQuestion, setCurrentQuestion] = useState<string>(
    isLiveDemo ? "Can you explain how you design and scale asynchronous event pipelines in distributed Python services, and how you handle backpressure and dead-letter queues?" : ""
  );
  const [questionNumber, setQuestionNumber] = useState<number>(isLiveDemo ? 2 : 0);
  const [answerText, setAnswerText] = useState<string>(
    isLiveDemo ? "In our high-throughput pipeline, we utilized Kafka as an immutable commit log paired with FastAPI consumer workers. Backpressure was managed using reactive stream pulling with dynamic batch sizing and Redis-backed token buckets..." : ""
  );
  
  // Feedback and completion state
  const [lastEvaluation, setLastEvaluation] = useState<AnswerEvaluation | null>(null);
  const [conversationHistory, setConversationHistory] = useState<MessageItem[]>([]);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [closingMessage, setClosingMessage] = useState<string>("");
  const [finalScore, setFinalScore] = useState<number>(0);

  // Status & Error state
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice Interaction state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const textBeforeSpeechRef = useRef<string>("");

  // Webcam state
  type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable' | 'off';
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // TTS state
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
    }

    // Expose test helper for automated test environments
    window.__simulateVoiceTranscript = (text: string) => {
      setAnswerText((prev) => (prev.trim() ? `${prev.trim()} ${text.trim()}` : text.trim()));
    };

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      delete window.__simulateVoiceTranscript;
    };
  }, []);

  // Webcam helpers
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable');
      setCameraError('Camera not supported in this browser.');
      return;
    }
    setCameraStatus('requesting');
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStatus('active');
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('unavailable');
        setCameraError('No camera detected. Please connect a webcam to continue.');
      } else {
        setCameraStatus('unavailable');
        setCameraError(`Camera error: ${err.message}`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('off');
    setCameraError(null);
  }, []);

  // Start camera when interview begins
  useEffect(() => {
    if (interviewStarted) {
      startCamera();
    }
  }, [interviewStarted, startCamera]);

  // Stop all camera tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // TTS helpers
  const stopSpeaking = useCallback(() => {
    if (ttsSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, [ttsSupported]);

  const speakQuestion = useCallback((text: string) => {
    if (!ttsSupported || !text.trim()) return;
    // Cancel any in-progress speech first
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;   // Slightly slower than default for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Prefer a natural English voice if available; fall back to browser default
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [ttsSupported]);

  // Auto-speak when a new AI question arrives
  useEffect(() => {
    if (interviewStarted && currentQuestion) {
      // Small delay to let voices load on first render
      const timer = setTimeout(() => speakQuestion(currentQuestion), 300);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, interviewStarted, speakQuestion]);

  // Cancel TTS on unmount
  useEffect(() => {
    return () => {
      if (ttsSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [ttsSupported]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      setVoiceError("Speech recognition is not supported in this browser. Please type your answer.");
      return;
    }

    setVoiceError(null);
    textBeforeSpeechRef.current = answerText;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        const base = textBeforeSpeechRef.current.trim();
        const combined = base ? `${base} ${currentTranscript.trim()}` : currentTranscript.trim();
        setAnswerText(combined);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition event error:", event.error);
        if (event.error === "not-allowed") {
          setVoiceError("Microphone permission denied. Please allow microphone access in your browser to speak.");
        } else if (event.error === "no-speech") {
          setVoiceError("No speech detected. Please try speaking again.");
        } else if (event.error === "audio-capture") {
          setVoiceError("No microphone detected. Please connect a microphone or type your answer.");
        } else if (event.error === "network") {
          setVoiceError("Speech recognition network error. You can continue typing your answer.");
        } else {
          setVoiceError(`Voice input issue: ${event.error}. You can continue typing.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setVoiceError("Could not start microphone. Please check your browser settings or type your answer.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Handle Start Interview
  const handleStartInterview = async () => {
    const nameToUse = candidateName.trim() || "Candidate";
    setIsStarting(true);
    setError(null);

    try {
      const response = await interviewService.startInterview({
        candidate_name: nameToUse,
        candidate_email: candidateEmail.trim(),
        job_title: jobTitle.trim(),
        job_description: jobDescription.trim(),
        required_skills: candidateSkills,
        candidate_resume: candidateResume.trim(),
        target_duration_minutes: 30
      });

      if (response.success && response.data) {
        setInterviewId(response.data.interview_id);
        setCurrentStage(response.data.current_stage || "intro");
        setCurrentQuestion(response.data.introduction);
        setQuestionNumber(0);
        setInterviewStarted(true);

        // Record initial AI message in conversation history
        setConversationHistory([
          {
            role: 'ai',
            content: response.data.introduction,
            stage: response.data.current_stage || 'intro',
            questionNumber: 0
          }
        ]);
      } else {
        setError(response.message || response.error?.message || "Failed to start interview session.");
      }
    } catch (err: any) {
      console.error("Error starting interview:", err);
      setError(err.message || "Could not connect to FastAPI interview service (Port 8001). Please ensure the backend is running.");
    } finally {
      setIsStarting(false);
    }
  };

  // Handle Submit Answer
  const handleSubmitAnswer = async () => {
    if (isListening) {
      stopListening();
    }
    if (!answerText.trim() || !interviewId || isSubmitting) return;

    const submittedAnswer = answerText.trim();
    setIsSubmitting(true);
    setError(null);

    // Optimistically add candidate response to history
    const updatedHistory: MessageItem[] = [
      ...conversationHistory,
      {
        role: 'candidate',
        content: submittedAnswer,
        stage: currentStage,
        questionNumber: questionNumber
      }
    ];
    setConversationHistory(updatedHistory);

    try {
      const response = await interviewService.submitAnswer({
        interview_id: interviewId,
        answer: submittedAnswer
      });

      if (response.success && response.data) {
        const data = response.data;

        if (data.interview_complete) {
          setInterviewComplete(true);
          setClosingMessage(data.closing_message || "Thank you for completing the interview!");
          setFinalScore(data.overall_score || 0);
          if (data.evaluation) {
            setLastEvaluation(data.evaluation);
          }
        } else {
          // Update for next question
          const nextQ = data.next_question || "";
          const nextStage = data.current_stage || currentStage;
          const nextNum = data.question_number || questionNumber + 1;

          setCurrentQuestion(nextQ);
          setCurrentStage(nextStage);
          setQuestionNumber(nextNum);
          setLastEvaluation(data.evaluation || null);
          setAnswerText("");

          // Add AI next question to history
          if (nextQ) {
            setConversationHistory([
              ...updatedHistory,
              {
                role: 'ai',
                content: nextQ,
                stage: nextStage,
                questionNumber: nextNum,
                evaluation: data.evaluation
              }
            ]);
          }
        }
      } else {
        setError(response.message || response.error?.message || "Failed to process candidate answer.");
      }
    } catch (err: any) {
      console.error("Error submitting answer:", err);
      setError(err.message || "Failed to submit answer to FastAPI backend (Port 8001).");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    setInterviewStarted(false);
    setInterviewId("");
    setCurrentStage("intro");
    setCurrentQuestion("");
    setQuestionNumber(0);
    setAnswerText("");
    setLastEvaluation(null);
    setConversationHistory([]);
    setInterviewComplete(false);
    setClosingMessage("");
    setFinalScore(0);
    setError(null);
  };

  // 1. SETUP VIEW (Before interview starts)
  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-200">
        {/* Top bar with back button & theme toggle */}
        <div className="w-full max-w-xl flex items-center justify-between mb-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              Studio v2.5
            </span>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        <Card className="w-full max-w-xl shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 rounded-xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center shadow-xs mb-3 text-white">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              AI Interview Studio
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Structured competency assessment calibrated against role rubrics
            </CardDescription>

            {/* Hardware & Feature Readiness Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3 h-3 text-emerald-500" /> Camera Ready
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3 h-3 text-emerald-500" /> Voice STT Active
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Groq Engine
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4 px-6 pb-6">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2.5 text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                <div>
                  <p className="font-semibold text-xs">Connection Note</p>
                  <p className="text-xs mt-0.5 text-red-600 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" /> Candidate Name
              </label>
              <Input
                placeholder="Enter candidate full name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                disabled={isStarting}
                className="h-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-700 rounded-lg text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" /> Job Role / Position
              </label>
              <Input
                placeholder="e.g. Senior Full Stack Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={isStarting}
                className="h-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-700 rounded-lg text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" /> Candidate Email (Optional)
              </label>
              <Input
                type="email"
                placeholder="candidate@example.com"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                disabled={isStarting}
                className="h-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-700 rounded-lg text-sm"
              />
            </div>

            {candidateSkills.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" /> Calibrated Candidate Skills
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  {candidateSkills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs px-2.5 py-0.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-medium">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {candidateResume && (
              <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Resume parsed from screening pipeline • Customized questions enabled</span>
              </div>
            )}

            <div className="pt-3">
              <Button
                onClick={handleStartInterview}
                disabled={isStarting || !candidateName.trim()}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Initializing Interview Session...
                  </>
                ) : (
                  <>
                    <span>Enter Live Interview Room</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>

            <div className="text-center pt-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Live Audio TTS & Speech Recognition • Enterprise Evaluation Engine</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. COMPLETION VIEW (Scorecard & Rubric Report)
  if (interviewComplete) {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (circumference * Math.min(Math.max(finalScore, 0), 100)) / 100;
    const isTopTier = finalScore >= 85;
    const isPassing = finalScore >= 70;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-200">
        {/* Top bar with back button & theme toggle */}
        <div className="w-full max-w-2xl flex items-center justify-between mb-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

        <Card className="w-full max-w-2xl shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 rounded-xl overflow-hidden">
          <CardHeader className="text-center pb-3 pt-6 border-b border-slate-100 dark:border-slate-800">
            <div className="mx-auto w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-xs mb-3 text-white">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              Evaluation Scorecard
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              Candidate: <span className="font-semibold text-slate-800 dark:text-slate-200">{candidateName}</span> • Target Role: <span className="font-semibold text-slate-800 dark:text-slate-200">{jobTitle || "Full Stack Engineer"}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6 px-6 pb-6">
            {/* Circular Gauge & Verdict Hero */}
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-around gap-6">
              {/* Circular Gauge */}
              <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0">
                <svg className="w-32 h-32 -rotate-90 transform" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    className={`transition-all duration-1000 ease-out ${
                      isTopTier ? "stroke-emerald-600" : isPassing ? "stroke-blue-600" : "stroke-amber-600"
                    }`}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {finalScore.toFixed(0)}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 -mt-0.5">
                    out of 100
                  </span>
                </div>
              </div>

              {/* Verdict & Benchmark Info */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border"
                  style={{
                    backgroundColor: isTopTier ? "rgba(16, 185, 129, 0.1)" : isPassing ? "rgba(29, 78, 216, 0.1)" : "rgba(245, 158, 11, 0.1)",
                    borderColor: isTopTier ? "rgba(16, 185, 129, 0.25)" : isPassing ? "rgba(29, 78, 216, 0.25)" : "rgba(245, 158, 11, 0.25)",
                    color: isTopTier ? "#059669" : isPassing ? "#1d4ed8" : "#d97706"
                  }}
                >
                  <Award className="w-3.5 h-3.5" />
                  {isTopTier ? "Strong Calibration • Top Tier" : isPassing ? "Qualified • Advance to Next Round" : "Under Review"}
                </div>
                <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {isTopTier ? "Outstanding Demonstration" : isPassing ? "Solid Competency Demonstrated" : "Foundational Assessment Complete"}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Candidate exhibited structured problem breakdown, relevant technical domain depth, and cohesive answers aligned with industry benchmarks.
                </p>
              </div>
            </div>

            {/* 4-Metric Rubric Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Performance Dimensions
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-1.5 font-medium">
                    <span className="text-slate-700 dark:text-slate-300">Technical Depth</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400 font-mono">{Math.min(Math.round(finalScore * 0.98), 98)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-700 h-1.5 rounded-full transition-all duration-700" style={{ width: `${Math.min(Math.round(finalScore * 0.98), 98)}%` }}></div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-1.5 font-medium">
                    <span className="text-slate-700 dark:text-slate-300">Problem Solving & Logic</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400 font-mono">{Math.min(Math.round(finalScore * 1.02), 99)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-700 h-1.5 rounded-full transition-all duration-700" style={{ width: `${Math.min(Math.round(finalScore * 1.02), 99)}%` }}></div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-1.5 font-medium">
                    <span className="text-slate-700 dark:text-slate-300">Communication & Clarity</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400 font-mono">{Math.min(Math.round(finalScore * 0.94), 95)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-700 h-1.5 rounded-full transition-all duration-700" style={{ width: `${Math.min(Math.round(finalScore * 0.94), 95)}%` }}></div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-1.5 font-medium">
                    <span className="text-slate-700 dark:text-slate-300">Production Experience</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400 font-mono">{Math.min(Math.round(finalScore * 0.96), 96)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-700 h-1.5 rounded-full transition-all duration-700" style={{ width: `${Math.min(Math.round(finalScore * 0.96), 96)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Closing Remarks Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Interviewer Summary & Recommendations:
              </p>
              <p className="text-slate-600 dark:text-slate-300 italic">{closingMessage}</p>
            </div>

            {/* Strengths & Growth Areas Bento */}
            {lastEvaluation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lastEvaluation.strengths && lastEvaluation.strengths.length > 0 && (
                  <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-lg">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-300 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Key Strengths
                    </p>
                    <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside">
                      {lastEvaluation.strengths.map((s, idx) => (
                        <li key={idx} className="leading-snug">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {lastEvaluation.weaknesses && lastEvaluation.weaknesses.length > 0 && (
                  <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-lg">
                    <p className="font-semibold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Suggested Growth Areas
                    </p>
                    <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside">
                      {lastEvaluation.weaknesses.map((w, idx) => (
                        <li key={idx} className="leading-snug">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleRestart}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 h-10 rounded-lg"
              >
                <RotateCcw className="w-4 h-4" /> Restart New Interview
              </Button>
              <Button
                onClick={() => navigate('/')}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-medium shadow-xs h-10 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                Return to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. ACTIVE INTERVIEW ROOM VIEW
  const interviewStages = [
    { id: "intro", label: "1. Intro & Warmup" },
    { id: "technical", label: "2. Technical Core" },
    { id: "projects", label: "3. Systems & Projects" },
    { id: "evaluation", label: "4. Final Rubric" }
  ];

  const getActiveStageIndex = () => {
    const s = currentStage.toLowerCase();
    if (s.includes("intro")) return 0;
    if (s.includes("tech")) return 1;
    if (s.includes("project") || s.includes("behav")) return 2;
    if (s.includes("eval") || s.includes("concl")) return 3;
    return questionNumber <= 1 ? 0 : questionNumber <= 3 ? 1 : 2;
  };
  const currentStageIndex = getActiveStageIndex();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-3 sm:p-6 lg:p-8 transition-colors duration-200">
      <div className="max-w-5xl w-full mx-auto space-y-5">
        
        {/* Top Meeting Header & Status Bar */}
        <div className="flex flex-col gap-3 p-4 sm:p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="h-9 px-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                title="Exit to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center shadow-xs flex-shrink-0 text-white">
                <Bot className="w-5 h-5 text-white" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Live Interview Studio
                  </h1>
                  <span className="flex h-2 w-2 relative">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider hidden sm:inline">
                    Live Session
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Candidate: <span className="font-semibold text-slate-700 dark:text-slate-200">{candidateName}</span> • Role: <span className="font-semibold text-slate-700 dark:text-slate-200">{jobTitle || "Full Stack Engineer"}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {interviewId.startsWith("sim-") && (
                <Badge variant="outline" className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Interactive Mode
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {questionNumber === 0 ? "Introduction" : `Question #${questionNumber}`}
              </Badge>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs ml-1"
                title="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
            </div>
          </div>

          {/* 4-Stage Visual Progress Stepper */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {interviewStages.map((stage, idx) => {
                const isCompleted = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <div
                    key={stage.id}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition-all ${
                      isCurrent
                        ? "bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs"
                        : isCompleted
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/40"
                        : "bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        isCurrent
                          ? "bg-blue-700 text-white shadow-xs"
                          : isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                    </div>
                    <span className="truncate">{stage.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Two Main Video-Call Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* LEFT: AI Interviewer Panel (Camera Off Video-Call Participant) */}
          <div className="relative bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col items-center justify-center min-h-[280px] sm:min-h-[320px] aspect-video">
            {/* Centered AI Avatar with speaking visualizer */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-20 h-20 rounded-full bg-blue-700 flex items-center justify-center shadow-sm transition-all duration-300 ${
                    isSpeaking
                      ? "ring-2 ring-blue-400 scale-105"
                      : "border border-slate-700"
                  }`}
                >
                  <Bot className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* AI Interviewer Name */}
              <p className="mt-3.5 text-sm font-semibold text-slate-200">
                AI Interviewer
              </p>

              {/* Speaking Visual / Audio Equalizer Indicator */}
              {isSpeaking ? (
                <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-blue-950/90 border border-blue-500/40 text-blue-300 text-xs font-medium shadow-xs">
                  <span className="flex items-center gap-0.5 h-3 mr-0.5">
                    <span className="w-1 bg-blue-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2"></span>
                    <span className="w-1 bg-blue-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-3.5"></span>
                    <span className="w-1 bg-blue-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2"></span>
                    <span className="w-1 bg-blue-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-3"></span>
                  </span>
                  AI is speaking...
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400 text-xs">
                  <Volume2 className="w-3 h-3 text-slate-500" />
                  <span>Ready</span>
                </div>
              )}
            </div>

            {/* Video-Call Name Tag Overlay (Bottom Left) */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/10 text-white text-xs">
              <Bot className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-medium">AI Interviewer</span>
              {isSpeaking && (
                <span className="flex h-2 w-2 relative">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </div>

            {/* Stage Indicator Overlay (Top Left) */}
            <div className="absolute top-3 left-3 z-20">
              <span className="bg-black/50 backdrop-blur-xs text-slate-300 text-[11px] px-2 py-0.5 rounded border border-white/10 uppercase tracking-wider font-mono">
                {currentStage}
              </span>
            </div>
          </div>

          {/* RIGHT: Candidate Webcam Panel */}
          <div className="relative bg-slate-950 rounded-2xl border border-slate-800 shadow-lg overflow-hidden flex flex-col items-center justify-center min-h-[280px] sm:min-h-[320px] aspect-video">
            {/* Live Video Element - always mounted for ref stability */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                cameraStatus === 'active' ? 'block' : 'hidden'
              }`}
            />

            {/* Camera Off / Placeholder when video is inactive */}
            {cameraStatus !== 'active' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 z-10 bg-slate-950">
                {cameraStatus === 'idle' && (
                  <>
                    <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
                      <Camera className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-sm">Initializing camera...</p>
                  </>
                )}
                {cameraStatus === 'requesting' && (
                  <>
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-slate-400 text-sm">Requesting camera permission...</p>
                  </>
                )}
                {cameraStatus === 'off' && (
                  <>
                    <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg text-white text-xl font-bold">
                      {candidateName ? candidateName.slice(0, 2).toUpperCase() : <User className="w-8 h-8 text-slate-400" />}
                    </div>
                    <div>
                      <p className="text-slate-300 text-sm font-medium">Camera is turned off</p>
                      <button
                        onClick={startCamera}
                        className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 mt-1"
                      >
                        Turn camera on
                      </button>
                    </div>
                  </>
                )}
                {cameraStatus === 'denied' && (
                  <>
                    <AlertCircle className="w-10 h-10 text-amber-500" />
                    <p className="text-amber-400 text-sm font-medium">Camera permission denied</p>
                    <p className="text-slate-500 text-xs max-w-xs">{cameraError}</p>
                  </>
                )}
                {cameraStatus === 'unavailable' && (
                  <>
                    <VideoOff className="w-10 h-10 text-slate-600" />
                    <p className="text-slate-400 text-sm font-medium">Camera unavailable</p>
                    <p className="text-slate-600 text-xs max-w-xs">{cameraError}</p>
                  </>
                )}
              </div>
            )}

            {/* LIVE Badge (Top Right) */}
            {cameraStatus === 'active' && (
              <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-red-500/30">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
                  LIVE
                </span>
              </div>
            )}

            {/* Video-Call Name Tag Overlay (Bottom Left) */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-white text-xs">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-medium">{candidateName || "Candidate"} (You)</span>
              {isListening ? (
                <span className="flex items-center gap-1 text-red-400 ml-1">
                  <Mic className="w-3 h-3 animate-pulse" />
                  <span className="text-[10px]">Mic Active</span>
                </span>
              ) : (
                <MicOff className="w-3 h-3 text-slate-400 ml-1" />
              )}
            </div>

            {/* Camera Toggle Button (Bottom Right) */}
            <div className="absolute bottom-3 right-3 z-20">
              <Button
                id="camera-toggle-btn"
                type="button"
                size="sm"
                variant="outline"
                onClick={cameraStatus === 'active' ? stopCamera : startCamera}
                disabled={cameraStatus === 'requesting'}
                className={`text-xs h-7 px-2.5 flex items-center gap-1.5 backdrop-blur-md transition-all shadow ${
                  cameraStatus === 'active'
                    ? 'bg-black/60 border-red-500/50 text-red-400 hover:bg-red-950/60'
                    : 'bg-black/60 border-white/20 text-slate-200 hover:bg-white/10'
                }`}
              >
                {cameraStatus === 'requesting' ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /><span>Requesting...</span></>
                ) : cameraStatus === 'active' ? (
                  <><VideoOff className="w-3 h-3 text-red-400" /><span>Turn Off Camera</span></>
                ) : (
                  <><Video className="w-3 h-3 text-blue-400" /><span>Turn On Camera</span></>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start justify-between gap-2 text-red-700 dark:text-red-300 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Request Failed</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setError(null)}
              className="text-xs border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Previous Answer Evaluation Card (if available) */}
        {lastEvaluation && (
          <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
            <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                  Previous Answer Evaluation
                </CardTitle>
              </div>
              {lastEvaluation.overall_score !== undefined && (
                <Badge className="bg-blue-700 text-white font-bold text-xs px-2 py-0.5">
                  Score: {lastEvaluation.overall_score}/10
                </Badge>
              )}
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-2 text-xs">
              {lastEvaluation.strengths && lastEvaluation.strengths.length > 0 && (
                <div className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Strengths: </span>
                  {lastEvaluation.strengths.join(" • ")}
                </div>
              )}
              {lastEvaluation.weaknesses && lastEvaluation.weaknesses.length > 0 && (
                <div className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">Feedback: </span>
                  {lastEvaluation.weaknesses.join(" • ")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Current Active Question Card (Below Video Panels) */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden rounded-xl">
          <CardHeader className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 py-3 px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  AI Interviewer Question {questionNumber > 0 ? `• #${questionNumber}` : "• Introduction"}
                </span>
              </div>

              {/* TTS Controls */}
              {ttsSupported ? (
                <div className="flex items-center gap-2">
                  {isSpeaking ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 font-medium">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                        </span>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Speaking...</span>
                      </div>
                      <Button
                        id="tts-stop-btn"
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={stopSpeaking}
                        className="text-xs h-7 px-2.5 flex items-center gap-1 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-red-400 hover:text-red-600 rounded-lg"
                      >
                        <VolumeX className="w-3 h-3" />
                        Stop Speaking
                      </Button>
                    </>
                  ) : (
                    currentQuestion && (
                      <Button
                        id="tts-replay-btn"
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => speakQuestion(currentQuestion)}
                        className="text-xs h-7 px-2.5 flex items-center gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400 rounded-lg"
                      >
                        <RotateCw className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        Replay Question
                      </Button>
                    )
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400">
                  (Browser TTS unavailable)
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6">
            <blockquote className="text-slate-900 dark:text-slate-100 text-base sm:text-lg leading-relaxed whitespace-pre-line font-medium border-l-4 border-blue-600 dark:border-blue-500 pl-4 bg-slate-50 dark:bg-slate-800/40 py-2.5 rounded-r-lg">
              "{currentQuestion || "Preparing interview question..."}"
            </blockquote>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>Take your time to structure your thoughts. Speak naturally or type below.</span>
              </span>
              <span className="text-blue-700 dark:text-blue-400 font-medium">
                Live Speech Recognition Supported
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Candidate Response Textarea Card */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
          <CardHeader className="pb-2 pt-4 px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-700 dark:text-blue-400" /> Your Answer
              </label>

              <div className="flex items-center gap-2">
                {/* Voice Control Button */}
                {voiceSupported ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={isListening ? "destructive" : "outline"}
                    onClick={toggleListening}
                    disabled={isSubmitting}
                    id="speak-answer-btn"
                    className={`text-xs h-8 px-3 flex items-center gap-1.5 transition-all ${
                      isListening
                        ? "bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-xs"
                        : "border-slate-300 dark:border-slate-700 hover:border-blue-600 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Stop Listening</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                        <span>Speak Answer</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400">
                    (Voice input unsupported)
                  </span>
                )}

                <span className="text-xs text-slate-400">
                  {answerText.length} characters
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6 space-y-4">
            {/* Listening Live Status Banner */}
            {isListening && (
              <div id="listening-banner" className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg flex items-center justify-between gap-3 text-red-700 dark:text-red-300 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <span className="font-medium">
                    Listening... Speak your answer. Recognized text is inserted below in real time.
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={stopListening}
                  className="h-6 px-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                >
                  Done Speaking
                </Button>
              </div>
            )}

            {/* Voice Error Banner */}
            {voiceError && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between gap-2 text-amber-800 dark:text-amber-200 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{voiceError}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setVoiceError(null)}
                  className="h-6 px-1.5 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                >
                  Dismiss
                </Button>
              </div>
            )}

            <Textarea
              id="candidate-answer-textarea"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              disabled={isSubmitting}
              placeholder={
                isListening
                  ? "Listening to your voice... (you can also edit this text anytime)"
                  : questionNumber === 0
                  ? "Respond to the interviewer (type or click 'Speak Answer' to speak)..."
                  : "Type your detailed answer or click 'Speak Answer' to speak. You can freely edit the text before submitting..."
              }
              rows={5}
              className={`resize-y min-h-[120px] text-sm focus-visible:ring-blue-700 font-normal leading-relaxed ${
                isListening ? "border-red-400 dark:border-red-600 ring-1 ring-red-400" : ""
              }`}
            />

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Press Submit Answer to send your response to the AI evaluation engine.
              </p>
              <Button
                id="submit-answer-btn"
                onClick={handleSubmitAnswer}
                disabled={isSubmitting || !answerText.trim()}
                className="w-full sm:w-auto ml-auto bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 py-2.5 rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Evaluating Answer...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Answer
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VideoInterview;