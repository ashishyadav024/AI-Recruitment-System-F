import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { useTheme } from "../context/ThemeContext";
import { CandidateVerifiedIcon } from "@/components/ui/BrandLogo";
import { PipelineBuilder } from "@/components/pipeline/PipelineBuilder";
import { pipelineService } from "@/services/pipelineService";

interface CandidateRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Completed" | "Live Video" | "Pending Review" | "Screened";
  score: number;
  completedAt: string;
  skills: string[];
  resumeText?: string;
  avatarBg?: string;
  initials?: string;
}

const COMMON_TECH_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'FastAPI',
  'Django', 'Flask', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP',
  'HTML', 'CSS', 'Tailwind', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git',
  'CI/CD', 'REST', 'GraphQL', 'Machine Learning', 'AI', 'Pandas', 'NumPy'
];

const extractSkillsFromText = (text: string): string[] => {
  if (!text) return [];
  const found: string[] = [];
  for (const skill of COMMON_TECH_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      found.push(skill);
    }
  }
  return found;
};

const INITIAL_CANDIDATES: CandidateRecord[] = [
  {
    id: "cand-1",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    role: "Machine Learning Engineer",
    status: "Completed",
    score: 82,
    completedAt: "Today, 10:30 AM",
    skills: ["Python", "Machine Learning", "FastAPI", "Docker", "PyTorch"],
    avatarBg: "bg-[#c6e7ff] text-[#001e2d]",
    initials: "AS",
    resumeText: "Aarav Sharma. Senior ML Engineer specializing in LLMs, distributed inference pipelines, and model quantization. 5+ years experience in Python, PyTorch, FastAPI, and Docker."
  },
  {
    id: "cand-2",
    name: "Priya Mehta",
    email: "priya.m@techstudio.dev",
    role: "Frontend Developer",
    status: "Completed",
    score: 91,
    completedAt: "Today, 09:15 AM",
    skills: ["React", "TypeScript", "Tailwind", "Next.js", "GraphQL"],
    avatarBg: "bg-[#9ad6fd] text-[#155e7f]",
    initials: "PM",
    resumeText: "Priya Mehta. Lead Frontend Engineer with deep experience in React, TypeScript, state management, and modern component design systems."
  },
  {
    id: "cand-3",
    name: "Rohan Verma",
    email: "rohan.v@cloudscale.io",
    role: "Backend Engineer",
    status: "Live Video",
    score: 0,
    completedAt: "In Progress (Q4/8)",
    skills: ["Go", "Kubernetes", "PostgreSQL", "Kafka", "REST"],
    avatarBg: "bg-[#e2dfff] text-[#16134a]",
    initials: "RV",
    resumeText: "Rohan Verma. Systems & backend engineer focused on distributed data processing, event-driven pipelines, and cloud-native architecture."
  },
  {
    id: "cand-4",
    name: "Ananya Singh",
    email: "ananya.s@analytics.org",
    role: "Data Analyst",
    status: "Completed",
    score: 76,
    completedAt: "Yesterday",
    skills: ["SQL", "Pandas", "NumPy", "Python", "Tableau"],
    avatarBg: "bg-[#efecfa] text-[#1b1b24]",
    initials: "AS",
    resumeText: "Ananya Singh. Data Analyst with expertise in cohort analysis, predictive data modeling, customer lifetime metrics, and SQL data warehousing."
  },
  {
    id: "cand-5",
    name: "Kabir Malhotra",
    email: "kabir.ml@neural.network",
    role: "Machine Learning Engineer",
    status: "Pending Review",
    score: 88,
    completedAt: "Yesterday",
    skills: ["Python", "TensorFlow", "Kubernetes", "Docker", "REST"],
    avatarBg: "bg-[#81cfff] text-[#001e2d]",
    initials: "KM",
    resumeText: "Kabir Malhotra. Machine Learning Engineer focused on computer vision models, edge inference optimization, and containerized serving architecture."
  }
];

const RecruiterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Candidates & filters state
  const [candidates, setCandidates] = useState<CandidateRecord[]>(INITIAL_CANDIDATES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All Roles");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"score" | "name">("score");

  // Mobile menu drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<"overview" | "candidates" | "interviews" | "reports" | "job-roles" | "pipelines">("overview");

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCandidateForScorecard, setSelectedCandidateForScorecard] = useState<CandidateRecord | null>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('scorecard')) {
      return INITIAL_CANDIDATES[0];
    }
    return null;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");
  const [meetBotAutoJoin, setMeetBotAutoJoin] = useState(true);
  const [candidateAptitudeAudit, setCandidateAptitudeAudit] = useState<any | null>(null);
  const [isLoadingAptitude, setIsLoadingAptitude] = useState(false);

  // Sync candidate aptitude assessment audit when scorecard candidate is selected
  useEffect(() => {
    let mounted = true;
    if (selectedCandidateForScorecard?.email) {
      setIsLoadingAptitude(true);
      try {
        const apps = pipelineService.listAllApplications();
        const app = apps.find(a => a.candidate_email.toLowerCase() === selectedCandidateForScorecard.email.toLowerCase());
        if (app) {
          pipelineService.getAptitudeRecruiterAudit(app.application_id)
            .then(res => {
              if (mounted && res.success && res.audit) {
                setCandidateAptitudeAudit(res.audit);
              } else if (mounted) {
                setCandidateAptitudeAudit(null);
              }
            })
            .catch(() => {
              if (mounted) setCandidateAptitudeAudit(null);
            })
            .finally(() => {
              if (mounted) setIsLoadingAptitude(false);
            });
          return;
        }
      } catch {
        // ignore
      }
      setCandidateAptitudeAudit(null);
      setIsLoadingAptitude(false);
    } else {
      setCandidateAptitudeAudit(null);
    }
    return () => { mounted = false; };
  }, [selectedCandidateForScorecard]);

  // Resume Analyzer Modal state
  const [jobTitleInput, setJobTitleInput] = useState("Machine Learning Engineer");
  const [jobDescriptionInput, setJobDescriptionInput] = useState(
    "Senior Machine Learning Engineer with 4+ years experience in Python, PyTorch, Docker, FastAPI, and scalable cloud microservices."
  );
  const [thresholdInput, setThresholdInput] = useState(50);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // KPI Metrics calculated
  const totalCandidates = candidates.length;
  const completedInterviews = candidates.filter(c => c.status === "Completed").length;
  const completedScores = candidates.filter(c => c.status === "Completed" && c.score > 0).map(c => c.score);
  const avgScore = completedScores.length > 0 
    ? (completedScores.reduce((a, b) => a + b, 0) / completedScores.length).toFixed(1) 
    : "78.4";
  const completionRate = totalCandidates > 0 ? ((completedInterviews / totalCandidates) * 100).toFixed(1) : "91.6";

  // Filter candidates
  const filteredCandidates = candidates.filter(cand => {
    const matchesSearch = 
      cand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = selectedRoleFilter === "All Roles" || cand.role === selectedRoleFilter;
    const matchesStatus = selectedStatusFilter === "All" || cand.status === selectedStatusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === "score") {
      return b.score - a.score;
    }
    return a.name.localeCompare(b.name);
  });

  // Candidate interview launch handoff
  const handleLaunchInterview = async (candidate: CandidateRecord) => {
    let appId: string | undefined;
    let roundId: string | undefined;
    try {
      const apps = pipelineService.listAllApplications();
      let app = apps.find(a => a.candidate_email.toLowerCase() === candidate.email.toLowerCase());
      if (!app) {
        app = await pipelineService.createCandidateApplication(
          candidate.email,
          candidate.name,
          candidate.role
        );
      }
      if (app) {
        appId = app.application_id;
        const pipeline = await pipelineService.getPipelineByRole(app.job_role);
        const techRound = pipeline.rounds.find(r => r.round_type === 'technical_interview');
        if (techRound) {
          roundId = techRound.round_id;
        }
      }

      // Gating Verification: Recruiters should not accidentally start an unpassed round
      if (appId && roundId) {
        const gatingCheck = await pipelineService.validateCanStartRound(appId, roundId);
        if (!gatingCheck.can_start) {
          toast({
            title: "Round Gating Restricted",
            description: `${candidate.name} has not completed preceding rounds: ${gatingCheck.reason || "Preceding rounds must be passed first."}`,
            variant: "destructive"
          });
          navigate(`/apply?appId=${encodeURIComponent(appId)}`);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not sync candidate pipeline:", e);
    }

    navigate(candidate.name ? `/interview/${encodeURIComponent(candidate.name)}` : "/interview", {
      state: {
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        jobTitle: candidate.role,
        skills: candidate.skills,
        candidateResume: candidate.resumeText || "",
        jobDescription: jobDescriptionInput || "",
        applicationId: appId,
        roundId: roundId
      }
    });
  };

  // Handle File Input Selection
  const handleFileDropOrChange = (files: FileList | File[] | null) => {
    if (!files) return;
    const fileArray = Array.from(files).filter(f => f.name.endsWith('.pdf'));
    if (fileArray.length === 0) {
      toast({
        title: "Unsupported File Format",
        description: "Please upload PDF format resume documents.",
        variant: "destructive"
      });
      return;
    }
    setUploadedFiles(prev => [...prev, ...fileArray]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit to Flask /api/analyze API
  const handleRunResumeAnalysis = async () => {
    if (!jobDescriptionInput.trim()) {
      toast({
        title: "Missing Job Description",
        description: "Please enter a target job description for resume screening.",
        variant: "destructive"
      });
      return;
    }

    if (uploadedFiles.length === 0) {
      toast({
        title: "No Resumes Uploaded",
        description: "Please upload at least one PDF resume document.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("job_description", jobDescriptionInput);
      formData.append("threshold", thresholdInput.toString());
      uploadedFiles.forEach(file => {
        formData.append("resume_files", file);
      });

      const res = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Analysis server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        const newRecords: CandidateRecord[] = data.results.map((r: any, idx: number) => {
          const name = r.names?.[0] && r.names[0] !== 'Name not found' ? r.names[0] : `Candidate ${candidates.length + idx + 1}`;
          const email = r.emails?.[0] && r.emails[0] !== 'Email not found' ? r.emails[0] : `candidate${candidates.length + idx + 1}@applicant.net`;
          const skills = extractSkillsFromText(r.text || "");
          const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "CD";

          return {
            id: `cand-upload-${Date.now()}-${idx}`,
            name,
            email,
            role: jobTitleInput.trim() || "Software Engineer",
            status: "Screened",
            score: Math.round(r.similarity || 0),
            completedAt: "Just now",
            skills: skills.length > 0 ? skills : ["Python", "FastAPI"],
            resumeText: r.text || "",
            avatarBg: "bg-[#c6e7ff] text-[#001e2d]",
            initials
          };
        });

        setCandidates(prev => [...newRecords, ...prev]);
        toast({
          title: "Analysis Complete",
          description: `Successfully analyzed and screened ${newRecords.length} candidate(s).`
        });
        setIsUploadModalOpen(false);
        setUploadedFiles([]);
      } else {
        throw new Error(data.error || "Failed to analyze uploaded resumes.");
      }
    } catch (err: any) {
      console.error("Resume analysis error:", err);
      toast({
        title: "Analysis Error",
        description: err.message || "Failed to connect to resume analysis service.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-200 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden animate-in fade-in"
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          SIDEBAR NAVIGATION (Fixed Left, Collapsible on Mobile)
      ───────────────────────────────────────────────────────────── */}
      <aside className={`fixed left-0 top-0 h-screen w-72 flex flex-col justify-between z-50 border-r transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-xl'
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col flex-1">
          {/* Brand Logo & Header */}
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CandidateVerifiedIcon className="w-[22px] h-[22px] text-white" />
              </div>
              <div className="flex flex-col">
                <span className={`text-[1.05rem] tracking-tight font-bold whitespace-nowrap ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  AI Recruitment System
                </span>
                <span className="text-[0.625rem] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold font-mono">
                  TALENT INTELLIGENCE
                </span>
              </div>
            </div>

            {/* Close button for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <div className="px-3 py-1">
            <div className={`h-[1px] w-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200/80'}`} />
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-3 space-y-1">
            <button
              onClick={() => { setActiveTab("overview"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === "overview"
                  ? "bg-blue-700 text-white font-semibold shadow-xs"
                  : theme === 'dark'
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
              <span>Overview</span>
            </button>

            <button
              onClick={() => { setActiveTab("candidates"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === "candidates"
                  ? "bg-blue-700 text-white font-semibold shadow-xs"
                  : theme === 'dark'
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">group</span>
              <span>Candidates</span>
              <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "candidates" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}>
                {candidates.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("interviews"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === "interviews"
                  ? "bg-blue-700 text-white font-semibold shadow-xs"
                  : theme === 'dark'
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">video_camera_front</span>
              <span>Interviews</span>
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono ${
                activeTab === "interviews" ? "bg-white/20 text-white" : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              }`}>
                Live
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("reports"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === "reports"
                  ? "bg-blue-700 text-white font-semibold shadow-xs"
                  : theme === 'dark'
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">analytics</span>
              <span>Reports</span>
            </button>

            <button
              onClick={() => { setActiveTab("job-roles"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === "job-roles"
                  ? "bg-blue-700 text-white font-semibold shadow-xs"
                  : theme === 'dark'
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">work</span>
              <span>Job Roles</span>
            </button>

            <button
              onClick={() => { setActiveTab("pipelines"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === "pipelines"
                  ? "bg-blue-700 text-white font-semibold shadow-xs"
                  : theme === 'dark'
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">account_tree</span>
              <span>Hiring Pipelines</span>
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono ${
                activeTab === "pipelines" ? "bg-white/20 text-white" : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              }`}>
                6 Rounds
              </span>
            </button>
          </nav>
        </div>

        {/* Bottom Recruiter Profile & Settings */}
        <div className="p-3 flex flex-col gap-2">
          <div className="space-y-0.5">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
              <span>Settings</span>
            </button>
            <button
              onClick={() => setIsHelpOpen(true)}
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
              <span>Help & Support</span>
            </button>
          </div>

          <div className={`h-[1px] w-full my-1 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200/80'}`} />

          {/* Recruiter Identity Pill */}
          <div className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
            theme === 'dark'
              ? 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
              : 'bg-slate-50 border-slate-200/80 hover:bg-white'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                AM
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Alex Morgan</span>
                <span className={`text-[0.625rem] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Talent Lead</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">unfold_more</span>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT AREA (Offset on Desktop)
      ───────────────────────────────────────────────────────────── */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* TOP BAR / HEADER */}
        <header className={`fixed top-0 left-0 lg:left-72 right-0 h-16 backdrop-blur-xl z-40 flex items-center justify-between px-4 sm:px-8 border-b transition-colors duration-200 ${
          theme === 'dark'
            ? 'bg-slate-900/85 border-slate-800 text-slate-100 shadow-md shadow-slate-950/20'
            : 'bg-white/85 border-slate-200 text-slate-900 shadow-xs'
        }`}>
          {/* Mobile hamburger & Breadcrumb Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden p-2 rounded-lg border transition-colors ${
                theme === 'dark' ? 'border-slate-800 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>

            <span className={`hidden sm:inline text-xs uppercase font-semibold tracking-wider font-mono ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Workspace
            </span>
            <span className="hidden sm:inline text-slate-400">/</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Evaluation Engine Active
            </div>
          </div>

          {/* Search, Theme Toggle & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden md:flex items-center">
              <span className={`material-symbols-outlined absolute left-3 text-[18px] ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                search
              </span>
              <input
                type="text"
                placeholder="Search candidate, role, skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`h-8 pl-9 pr-3 rounded-lg text-xs outline-none shadow-2xs border w-56 lg:w-64 transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-800/70 border-slate-700 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-500 focus:border-blue-700 focus:ring-1 focus:ring-blue-700'
                }`}
              />
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all shadow-2xs ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:text-amber-300 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                aria-label="Notifications"
                className={`relative w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-2xs ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-blue-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-blue-700'
                }`}
              >
                <span className="material-symbols-outlined text-[19px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
              </button>

              {isNotificationsOpen && (
                <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-xl border p-3 z-50 animate-in fade-in slide-in-from-top-2 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className={`flex items-center justify-between pb-2 border-b mb-2 ${
                    theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
                  }`}>
                    <span className="text-xs font-bold">Notifications</span>
                    <button
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-[10px] text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-800/60 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'
                    }`}>
                      <p className="font-semibold text-xs">Priya Mehta completed interview</p>
                      <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Score: 91/100 · 10m ago</p>
                    </div>
                    <div className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-800/60 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'
                    }`}>
                      <p className="font-semibold text-xs">AI Screening Engine Online</p>
                      <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Google Meet Bot verified · 1h ago</p>
                    </div>
                    <div className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-800/60 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'
                    }`}>
                      <p className="font-semibold text-xs">Aarav Sharma evaluated</p>
                      <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Score: 82/100 · 2h ago</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action Button: + New Interview / Upload */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="h-8 px-3.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[17px]">add_circle</span>
              <span className="hidden sm:inline">+ New Interview</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </header>

        {/* MAIN BODY CONTAINER */}
        <main className="pt-20 px-4 sm:px-8 pb-14 max-w-[1440px] w-full mx-auto flex flex-col gap-8">
          {/* ─────────────────────────────────────────────────────────────
              GREETING & PIPELINE HERO BAR
          ───────────────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  {activeTab === "overview" && "Good morning, Recruiter."}
                  {activeTab === "candidates" && "Candidate Directory & Screening"}
                  {activeTab === "interviews" && "AI Video Interviews & Live Rooms"}
                  {activeTab === "reports" && "Recruitment Intelligence & Reports"}
                  {activeTab === "job-roles" && "Active Job Roles & Openings"}
                  {activeTab === "pipelines" && "Multi-Round Hiring Pipelines & Gating"}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25 text-[0.6875rem] font-bold font-mono">
                  {activeTab === "overview" && "LIVE HUD"}
                  {activeTab === "candidates" && `${candidates.length} CANDIDATES`}
                  {activeTab === "interviews" && "AI BOT READY"}
                  {activeTab === "reports" && "AI ANALYTICS"}
                  {activeTab === "job-roles" && "4 OPENINGS"}
                  {activeTab === "pipelines" && "SEQUENTIAL GATING"}
                </span>
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {activeTab === "overview" && "Here's what's happening across your interview pipeline today."}
                {activeTab === "candidates" && "Review candidate match scores, filter by skill, and launch AI interview rooms."}
                {activeTab === "interviews" && "Monitor active Google Meet sessions, bot connectivity, and conduct live candidate evaluations."}
                {activeTab === "reports" && "Comprehensive analytical reports, candidate competencies, and screening velocity."}
                {activeTab === "job-roles" && "Manage position requirements, target skill profiles, and applicant volumes."}
                {activeTab === "pipelines" && "Order rounds, calibrate cutoff scores & weights, and enforce sequential progression."}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs border ${
                  theme === 'dark'
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[17px] text-blue-700 dark:text-blue-400">upload_file</span>
                <span>Upload Resumes</span>
              </button>
              <button
                onClick={() => navigate("/apply")}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-700 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <span className="material-symbols-outlined text-[17px] text-slate-500">assignment</span>
                <span>Candidate Pipeline Portal</span>
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SECTION 2: DASHBOARD KPI METRIC CARDS (4-Column Bento Grid)
          ───────────────────────────────────────────────────────────── */}
          {(activeTab === "overview" || activeTab === "reports") && (
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Metric 1: Total Candidates */}
            <div className={`p-5 rounded-xl shadow-2xs border flex flex-col justify-between transition-all hover:shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className={`text-[0.6875rem] uppercase tracking-wider font-semibold font-mono ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Total Candidates
                  </span>
                  <div className={`mt-1 text-2xl sm:text-3xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {totalCandidates}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/60">
                  <span className="material-symbols-outlined text-[20px]">group</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[0.6875rem] font-bold border border-blue-200/60 dark:border-blue-800/60">
                  <span className="material-symbols-outlined text-[12px]">trending_up</span>+18%
                </span>
                <span className={`text-[0.6875rem] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>this month</span>
              </div>
            </div>

            {/* Metric 2: Video Interviews Completed */}
            <div className={`p-5 rounded-xl shadow-2xs border flex flex-col justify-between transition-all hover:shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className={`text-[0.6875rem] uppercase tracking-wider font-semibold font-mono ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Interviews Completed
                  </span>
                  <div className={`mt-1 text-2xl sm:text-3xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {completedInterviews}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60">
                  <span className="material-symbols-outlined text-[20px]">video_call</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[0.6875rem] font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                  <span className="material-symbols-outlined text-[12px]">trending_up</span>+12%
                </span>
                <span className={`text-[0.6875rem] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>from previous cycle</span>
              </div>
            </div>

            {/* Metric 3: Avg Interview Score */}
            <div className={`p-5 rounded-xl shadow-2xs border flex flex-col justify-between transition-all hover:shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className={`text-[0.6875rem] uppercase tracking-wider font-semibold font-mono ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Avg Interview Score
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={`text-2xl sm:text-3xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {avgScore}
                    </span>
                    <span className={`text-xs font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>/ 100</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="material-symbols-outlined text-[20px]">stars</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-[0.6875rem] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Across AI interviews</span>
                <div className={`w-16 h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div
                    className="h-full bg-blue-700 dark:bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, parseFloat(avgScore) || 75)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Metric 4: Completion Rate */}
            <div className={`p-5 rounded-xl shadow-2xs border flex flex-col justify-between transition-all hover:shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className={`text-[0.6875rem] uppercase tracking-wider font-semibold font-mono ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Completion Rate
                  </span>
                  <div className={`mt-1 text-2xl sm:text-3xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {completionRate}%
                  </div>
                </div>
                <div className="relative w-9 h-9 flex items-center justify-center">
                  <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className={theme === 'dark' ? 'text-slate-800' : 'text-slate-200'}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="text-blue-700 dark:text-blue-400"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${completionRate}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.2"
                    />
                  </svg>
                  <span className="material-symbols-outlined absolute text-[15px] text-blue-700 dark:text-blue-400">
                    verified
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-[0.6875rem] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Candidate participation</span>
                <span className="text-[0.6875rem] text-blue-700 dark:text-blue-400 font-semibold">Optimal</span>
              </div>
            </div>
          </section>
          )}

          {/* ─────────────────────────────────────────────────────────────
              SECTION 3: ACTIVE JOB ROLES
          ───────────────────────────────────────────────────────────── */}
          {(activeTab === "overview" || activeTab === "job-roles") && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Active Job Roles
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold font-mono ${
                  theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  4 Openings
                </span>
              </div>
              <button
                onClick={() => setSelectedRoleFilter("All Roles")}
                className="text-xs text-blue-700 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
              >
                Clear Filter <span className="material-symbols-outlined text-[14px]">refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Role 1 */}
              <div
                onClick={() => setSelectedRoleFilter("Machine Learning Engineer")}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedRoleFilter === "Machine Learning Engineer"
                    ? theme === 'dark'
                      ? "bg-blue-950/40 border-blue-600 ring-1 ring-blue-500/30"
                      : "bg-blue-50/70 border-blue-700 ring-1 ring-blue-700"
                    : theme === 'dark'
                      ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[0.6875rem] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">memory</span>
                  </div>
                  <h3 className={`text-sm font-semibold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Machine Learning Engineer
                  </h3>
                  <span className={`text-[0.6875rem] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Core AI & Platform</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className={`flex justify-between items-center text-[0.6875rem] font-mono ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <span>18 / 42 Interviews</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">43%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className="h-full bg-blue-700 dark:bg-blue-500 rounded-full" style={{ width: "43%" }} />
                  </div>
                </div>
              </div>

              {/* Role 2 */}
              <div
                onClick={() => setSelectedRoleFilter("Frontend Developer")}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedRoleFilter === "Frontend Developer"
                    ? theme === 'dark'
                      ? "bg-blue-950/40 border-blue-600 ring-1 ring-blue-500/30"
                      : "bg-blue-50/70 border-blue-700 ring-1 ring-blue-700"
                    : theme === 'dark'
                      ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[0.6875rem] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">code</span>
                  </div>
                  <h3 className={`text-sm font-semibold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Frontend Developer
                  </h3>
                  <span className={`text-[0.6875rem] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Design Systems & Web</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className={`flex justify-between items-center text-[0.6875rem] font-mono ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <span>24 / 56 Interviews</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">43%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className="h-full bg-blue-700 dark:bg-blue-500 rounded-full" style={{ width: "43%" }} />
                  </div>
                </div>
              </div>

              {/* Role 3 */}
              <div
                onClick={() => setSelectedRoleFilter("Backend Engineer")}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedRoleFilter === "Backend Engineer"
                    ? theme === 'dark'
                      ? "bg-blue-950/40 border-blue-600 ring-1 ring-blue-500/30"
                      : "bg-blue-50/70 border-blue-700 ring-1 ring-blue-700"
                    : theme === 'dark'
                      ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[0.6875rem] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">dns</span>
                  </div>
                  <h3 className={`text-sm font-semibold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Backend Engineer
                  </h3>
                  <span className={`text-[0.6875rem] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Distributed Systems</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className={`flex justify-between items-center text-[0.6875rem] font-mono ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <span>15 / 38 Interviews</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">39%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className="h-full bg-blue-700 dark:bg-blue-500 rounded-full" style={{ width: "39%" }} />
                  </div>
                </div>
              </div>

              {/* Role 4 */}
              <div
                onClick={() => setSelectedRoleFilter("Data Analyst")}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedRoleFilter === "Data Analyst"
                    ? theme === 'dark'
                      ? "bg-blue-950/40 border-blue-600 ring-1 ring-blue-500/30"
                      : "bg-blue-50/70 border-blue-700 ring-1 ring-blue-700"
                    : theme === 'dark'
                      ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[0.6875rem] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">query_stats</span>
                  </div>
                  <h3 className={`text-sm font-semibold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Data Analyst
                  </h3>
                  <span className={`text-[0.6875rem] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Product Growth Insights</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className={`flex justify-between items-center text-[0.6875rem] font-mono ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <span>12 / 31 Interviews</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">38%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className="h-full bg-blue-700 dark:bg-blue-500 rounded-full" style={{ width: "38%" }} />
                  </div>
                </div>
              </div>
            </div>
          </section>
          )}

          {/* ─────────────────────────────────────────────────────────────
              SECTION 4: CANDIDATE SCREENING & MANAGEMENT TABLE
          ───────────────────────────────────────────────────────────── */}
          {(activeTab === "overview" || activeTab === "candidates") && (
          <section className={`p-6 rounded-2xl shadow-xs border flex flex-col gap-5 ${
            theme === 'dark' ? 'bg-slate-900/80 border-slate-800/90' : 'bg-white border-slate-200/90'
          }`}>
            {/* Table Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Recent Candidates
                </h2>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Review AI video interview recordings, scorecards, and real-time adaptive probes.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Filter Role:</span>
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className={`h-8 px-2.5 rounded-lg text-xs outline-none border transition-colors ${
                    theme === 'dark' 
                      ? 'bg-slate-800 border-slate-700 text-slate-200' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All Roles">All Roles</option>
                  <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Engineer">Backend Engineer</option>
                  <option value="Data Analyst">Data Analyst</option>
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className={`h-8 px-2.5 rounded-lg text-xs outline-none border transition-colors ${
                    theme === 'dark' 
                      ? 'bg-slate-800 border-slate-700 text-slate-200' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="Live Video">Live Video</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Screened">Screened</option>
                </select>
              </div>
            </div>

            {/* Candidate Table */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`font-mono text-[0.6875rem] uppercase tracking-wider ${
                    theme === 'dark' ? 'bg-slate-800/60 text-slate-400' : 'bg-slate-50 text-slate-500'
                  }`}>
                    <th className="py-3 px-4 rounded-l-xl font-bold">Candidate</th>
                    <th className="py-3 px-4 font-bold">Role</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">AI Score</th>
                    <th className="py-3 px-4 font-bold">Completed</th>
                    <th className="py-3 px-4 text-right rounded-r-xl font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs ${
                  theme === 'dark' ? 'divide-slate-800/80 text-slate-300' : 'divide-slate-100 text-slate-700'
                }`}>
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No candidates found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((cand) => (
                      <tr key={cand.id} className={`transition-colors group ${
                        theme === 'dark' ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/70'
                      }`}>
                        {/* Candidate Cell */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                cand.avatarBg || "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              }`}
                            >
                              {cand.initials || cand.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className={`font-semibold text-xs truncate ${
                                theme === 'dark' ? 'text-white' : 'text-slate-900'
                              }`}>
                                {cand.name}
                              </span>
                              <span className={`text-[0.6875rem] truncate font-mono ${
                                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                              }`}>
                                {cand.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className={`py-3 px-4 font-medium text-xs ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                          {cand.role}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {cand.status === "Completed" && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[0.6875rem] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Completed
                            </span>
                          )}
                          {cand.status === "Live Video" && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[0.6875rem] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                              Live Video
                            </span>
                          )}
                          {cand.status === "Pending Review" && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[0.6875rem] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Pending Review
                            </span>
                          )}
                          {cand.status === "Screened" && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[0.6875rem] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              Screened
                            </span>
                          )}
                        </td>

                        {/* AI Score */}
                        <td className="py-3 px-4">
                          {cand.score > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold font-mono text-[11px] border ${
                                cand.score >= 85
                                  ? theme === 'dark'
                                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : cand.score >= 70
                                  ? theme === 'dark'
                                    ? 'bg-blue-950/40 text-blue-300 border-blue-500/30'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                  : theme === 'dark'
                                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                <span>{cand.score}</span>
                                <span className="opacity-60 font-normal">/100</span>
                              </div>
                              <div className={`hidden sm:block w-12 h-1.5 rounded-full overflow-hidden ${
                                theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                              }`}>
                                <div
                                  className={`h-full rounded-full ${
                                    cand.score >= 85 ? 'bg-emerald-500' : cand.score >= 70 ? 'bg-blue-700' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${cand.score}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>

                        {/* Completed At */}
                        <td className={`py-3 px-4 text-[0.6875rem] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {cand.completedAt}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedCandidateForScorecard(cand)}
                            className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400 hover:underline font-medium"
                          >
                            Scorecard <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          </button>
                          <button
                            onClick={() => setActiveTab("pipelines")}
                            className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            title="Inspect candidate multi-round pipeline progress"
                          >
                            <span className="material-symbols-outlined text-[13px]">account_tree</span>
                            <span>Pipeline</span>
                          </button>
                          <button
                            onClick={() => handleLaunchInterview(cand)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs active:scale-95"
                          >
                            <span className="material-symbols-outlined text-[13px]">play_circle</span>
                            <span>Start Interview</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          )}

          {/* ─────────────────────────────────────────────────────────────
              SECTION 5: ANALYTICS & AI INSIGHTS ROW (3-Column Bento Grid)
          ───────────────────────────────────────────────────────────── */}
          {(activeTab === "overview" || activeTab === "reports") && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart Column: Interview Activity */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Interview Activity
                  </h3>
                  <span className="text-[0.6875rem] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Last 30 Days
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Interview completion trends across calibrated hiring tracks.</p>
              </div>

              {/* Area SVG Chart */}
              <div className="my-4 flex flex-col justify-center">
                <svg className="w-full h-36 overflow-visible" preserveAspectRatio="none" viewBox="0 0 320 150">
                  <defs>
                    <linearGradient id="enterpriseChartGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" x1="20" x2="300" y1="20" y2="20" />
                  <line stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" x1="20" x2="300" y1="60" y2="60" />
                  <line stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" x1="20" x2="300" y1="100" y2="100" />
                  <path d="M 30,105 L 110,85 L 190,60 L 270,30 L 270,120 L 30,120 Z" fill="url(#enterpriseChartGradient)" />
                  <path d="M 30,105 L 110,85 L 190,60 L 270,30" fill="none" stroke="#1D4ED8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                  <circle className="fill-white dark:fill-slate-900 stroke-blue-700" cx="30" cy="105" r="4" strokeWidth="2" />
                  <circle className="fill-white dark:fill-slate-900 stroke-blue-700" cx="110" cy="85" r="4" strokeWidth="2" />
                  <circle className="fill-white dark:fill-slate-900 stroke-blue-700" cx="190" cy="60" r="4" strokeWidth="2" />
                  <circle className="fill-blue-700 stroke-white dark:stroke-slate-900" cx="270" cy="30" r="5" strokeWidth="2" />
                </svg>
                <div className="flex justify-between text-[0.6875rem] font-mono text-slate-500 dark:text-slate-400 mt-2">
                  <span>W1 (12)</span>
                  <span>W2 (18)</span>
                  <span>W3 (24)</span>
                  <span className="font-bold text-blue-700 dark:text-blue-400">W4 (32)</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-700" />
                  Velocity: +33% wk/wk
                </span>
                <span className="font-mono">Target: 30/wk</span>
              </div>
            </div>

            {/* AI Hiring Insights Column */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">
                    AI Hiring Insights
                  </h3>
                  <span className="material-symbols-outlined text-blue-700 dark:text-blue-400 text-[20px]">psychology</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Synthesis from recent structured evaluation transcripts.</p>
              </div>

              <div className="my-3 flex flex-col gap-2.5">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Strong Technical Communication</span>
                    <p className="text-[0.6875rem] text-slate-600 dark:text-slate-400 leading-snug mt-0.5">
                      68% of candidates demonstrated concise reasoning in architectural trade-off questions.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[16px]">dynamic_form</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Adaptive Probe Agility</span>
                    <p className="text-[0.6875rem] text-slate-600 dark:text-slate-400 leading-snug mt-0.5">
                      Real-time counterfactual follow-ups revealed production experience vs rote memorization.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-[0.6875rem] text-slate-400 font-mono">
                Calibrated by Evaluation Engine
              </div>
            </div>

            {/* Quick Action Card Column */}
            <div className="p-6 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-xs border border-slate-800 flex flex-col justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-blue-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span>Pipeline Acceleration</span>
                </div>
                <h3 className="font-sans text-lg font-semibold leading-snug text-white">
                  Automated Resume to AI Interview in 60s
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Upload resumes, calibrate semantic weights against job specs, and dispatch structured live interview rooms instantly.
                </p>
              </div>

              <div className="pt-4 flex items-center gap-2.5">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>Upload Resumes</span>
                </button>
                <button
                  onClick={() => navigate("/apply?appId=app-cand-1")}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  <span>Demo Candidate Overview</span>
                </button>
              </div>
            </div>
          </section>
          )}

          {/* ─────────────────────────────────────────────────────────────
              SECTION: INTERVIEWS VIEW (when activeTab === "interviews")
          ───────────────────────────────────────────────────────────── */}
          {activeTab === "interviews" && (
            <div className="flex flex-col gap-6">
              {/* Bot Status Banner */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">smart_toy</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Autonomous Interview Bot Engine</h3>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold font-mono">
                        ONLINE · FASTAPI:8001
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Deepgram Nova-2 STT & Groq Question Generation are calibrated and ready for real-time video sessions.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate("/apply")}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">assignment</span>
                    <span>View Candidate Portal</span>
                  </button>
                </div>
              </div>

              {/* Interview Rooms Grid */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Candidate Interview Sessions</h2>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{candidates.length} Sessions Available</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {candidates.map((cand) => (
                    <div key={cand.id} className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-md flex items-center justify-center font-semibold text-xs ${cand.avatarBg || "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"}`}>
                            {cand.initials || cand.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">{cand.name}</h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{cand.role}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                          cand.status === "Completed" ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" :
                          cand.status === "Live Video" ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 animate-pulse" :
                          "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                        }`}>
                          {cand.status}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex flex-col gap-1.5">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>AI Match Score:</span>
                          <span className="font-semibold font-mono text-blue-700 dark:text-blue-400">{cand.score}%</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Session Time:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">{cand.completedAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => setSelectedCandidateForScorecard(cand)}
                          className="flex-1 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          Scorecard
                        </button>
                        <button
                          onClick={() => handleLaunchInterview(cand)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[14px]">videocam</span>
                          <span>Launch</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              SECTION: REPORTS VIEW EXTRA EXPORT ACTION
          ───────────────────────────────────────────────────────────── */}
          {activeTab === "reports" && (
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Export Recruitment Audit Report</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Download complete PDF and CSV records for all candidate interviews.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    toast({
                      title: "Exporting CSV...",
                      description: "Downloading candidates_export.csv"
                    });
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => {
                    toast({
                      title: "Exporting PDF Report...",
                      description: "Generated InterviewAI_Analytics_Report.pdf"
                    });
                  }}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              SECTION: MULTI-ROUND HIRING PIPELINES & GATING BUILDER
          ───────────────────────────────────────────────────────────── */}
          {activeTab === "pipelines" && (
            <div className="w-full">
              <PipelineBuilder />
            </div>
          )}
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6: ENTERPRISE RESUME UPLOAD & ANALYSIS MODAL
      ───────────────────────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-50 dark:bg-slate-950 rounded-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto">
            {/* Modal Header & Intake Funnel Stepper */}
            <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-700 text-white shadow-xs">
                    <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                  </span>
                  <div>
                    <h2 className="font-sans text-base font-semibold text-slate-900 dark:text-slate-100">
                      Candidate Intake & Calibration Funnel
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Session #INT-{Date.now().toString().slice(-4)} · Structured Resume Analysis
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Stepper Bar */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-700 text-white font-medium">
                  <span className="w-4 h-4 rounded-full bg-white text-blue-700 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Upload Resume</span>
                </div>
                <span className="h-0.5 w-6 bg-blue-700 rounded-full" />
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800">
                  <span className="w-4 h-4 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>Analyze Candidate</span>
                </div>
                <span className="h-0.5 w-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px]">3</span>
                  <span>Live Video Interview</span>
                </div>
                <span className="h-0.5 w-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px]">4</span>
                  <span>Evaluation</span>
                </div>
              </div>
            </div>

            {/* Modal Body: Two-Column Experience Grid */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Drag & Drop Zone */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
                  <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Target Role & Job Description
                  </h3>
                  <input
                    type="text"
                    value={jobTitleInput}
                    onChange={(e) => setJobTitleInput(e.target.value)}
                    placeholder="Job Title (e.g. Senior Machine Learning Engineer)"
                    className="h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-slate-900 dark:text-slate-100"
                  />
                  <textarea
                    rows={3}
                    value={jobDescriptionInput}
                    onChange={(e) => setJobDescriptionInput(e.target.value)}
                    placeholder="Paste job description, responsibilities, or key technical qualifications..."
                    className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-slate-900 dark:text-slate-100 resize-none"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Similarity Match Threshold:</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400 font-mono">{thresholdInput}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={90}
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(Number(e.target.value))}
                    className="w-full accent-blue-700 cursor-pointer"
                  />
                </div>

                {/* Drop Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileDropOrChange(e.dataTransfer.files);
                  }}
                  className="rounded-xl p-6 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-700 dark:hover:border-blue-500 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl">upload_file</span>
                  </div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Drag and drop resumes here</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">or browse from your local drive</p>
                  <span className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs">
                    Browse PDF Files
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileDropOrChange(e.target.files)}
                  />
                  <div className="mt-3 text-[0.6875rem] text-slate-400 font-mono flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">info</span>
                    <span>PDF format only • Max 10MB per document</span>
                  </div>
                </div>

                {/* Uploaded Files Listing */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Selected Files ({uploadedFiles.length})</span>
                    {uploadedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-red-500 text-lg">picture_as_pdf</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{file.name}</span>
                          <span className="text-[0.6875rem] text-slate-400 font-mono">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(idx)}
                          className="text-red-500 hover:text-red-700 p-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* SOC2 Privacy Assurance Card */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-700 dark:text-blue-400 text-lg shrink-0">encrypted</span>
                  <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Resume extraction operates under ephemeral memory sandbox boundaries. Fully encrypted at rest (AES-256) and in transit.
                  </p>
                </div>
              </div>

              {/* Right Column: 6 Intelligence Vectors & Extraction Telemetry */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Structured Extraction Vectors
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[0.6875rem] font-semibold">
                      Multi-Vector Analysis
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Beyond basic keyword matching. We analyze depth, verifiable scope, and technical problem-solving signals.
                  </p>

                  {/* 6 Intelligence Vectors */}
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                        <span className="material-symbols-outlined text-sm">badge</span>
                        <span>Candidate Profile</span>
                      </div>
                      <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">Name, credentials, background</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                        <span className="material-symbols-outlined text-sm">terminal</span>
                        <span>Technical Stack</span>
                      </div>
                      <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">Languages, frameworks, systems</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                        <span className="material-symbols-outlined text-sm">work_history</span>
                        <span>Work Experience</span>
                      </div>
                      <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">Roles, team scale, production impact</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                        <span className="material-symbols-outlined text-sm">school</span>
                        <span>Education</span>
                      </div>
                      <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">Degrees, research, coursework</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                        <span className="material-symbols-outlined text-sm">account_tree</span>
                        <span>Projects & Architecture</span>
                      </div>
                      <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">Repositories, system topology</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                        <span className="material-symbols-outlined text-sm">radar</span>
                        <span>Interview Probes</span>
                      </div>
                      <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">Targeted inquiry areas</p>
                    </div>
                  </div>

                  {/* Knowledge Profile Calibrated badge */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-700 dark:text-blue-400">hub</span>
                      <div className="text-xs">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">Candidate Calibration Matrix</p>
                        <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">Matched against role rubric benchmarks</p>
                      </div>
                    </div>
                    <span className="text-[0.6875rem] text-emerald-700 dark:text-emerald-400 font-semibold font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      CALIBRATED
                    </span>
                  </div>

                  {/* Extraction Telemetry Bar */}
                  <div className="mt-2 flex flex-col gap-1.5">
                    <div className="flex justify-between text-[0.6875rem] font-mono text-slate-500 dark:text-slate-400">
                      <span>Extraction Telemetry</span>
                      <span>Confidence: 99.4%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div className="h-full bg-blue-700 w-[45%]" title="Skills" />
                      <div className="h-full bg-blue-500 w-[30%]" title="Experience" />
                      <div className="h-full bg-blue-400 w-[15%]" title="Projects" />
                      <div className="h-full bg-indigo-500 w-[10%]" title="Academia" />
                    </div>
                    <div className="flex items-center gap-3 text-[0.6875rem] font-mono text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-700" />Skills 45%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Experience 30%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Projects 15%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Academia 10%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recruiter Tip Callout */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-700 dark:text-blue-400 text-lg mt-0.5">tips_and_updates</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Adaptive Probe Generation</span>
                    <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      The AI interviewer generates dynamic scenario questions directly referencing the candidate's actual projects, repos, and cited tech stack.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <button
                  disabled={isAnalyzing}
                  onClick={() => {
                    // Quick Demo Candidate insertion
                    const sample: CandidateRecord = {
                      id: `cand-sample-${Date.now()}`,
                      name: "Alex Johnson",
                      email: "alex.johnson@example.com",
                      role: jobTitleInput || "Senior Software Engineer",
                      status: "Screened",
                      score: 88,
                      completedAt: "Just now",
                      skills: ["Python", "FastAPI", "React", "Docker", "MongoDB"],
                      avatarBg: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300",
                      initials: "AJ",
                      resumeText: "Alex Johnson. Senior Software Engineer with 5+ years experience in Python, FastAPI, React, Docker, and MongoDB."
                    };
                    setCandidates(prev => [sample, ...prev]);
                    toast({
                      title: "Sample Candidate Screened",
                      description: "Added Alex Johnson with 88% match score."
                    });
                    setIsUploadModalOpen(false);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Load Sample Candidate
                </button>

                <button
                  disabled={isAnalyzing || uploadedFiles.length === 0}
                  onClick={handleRunResumeAnalysis}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
                >
                  {isAnalyzing ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      <span>Analyzing Resumes...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                      <span>Run AI Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 7: ENTERPRISE SCORECARD & CANDIDATE DETAILS MODAL
      ───────────────────────────────────────────────────────────── */}
      {selectedCandidateForScorecard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-50 dark:bg-slate-950 rounded-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto">
            {/* Scorecard Header */}
            <div className="p-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-700 text-white font-bold text-xs shadow-xs">
                  R
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-base font-semibold text-slate-900 dark:text-slate-100">
                      Structured Interview Rubric & Performance Scorecard
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[0.6875rem] font-semibold font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      EVALUATION COMPLETE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Candidate: {selectedCandidateForScorecard.name} · Role Track: {selectedCandidateForScorecard.role}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCandidateForScorecard(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Scorecard Content */}
            <div className="p-6 flex flex-col gap-6">
              {/* Overall Performance Card (Hero Centerpiece) */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Circular Gauge */}
                <div className="md:col-span-6 flex items-center gap-5">
                  <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-200 dark:text-slate-800"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.2"
                      />
                      <path
                        className="text-blue-700 dark:text-blue-500"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray={`${selectedCandidateForScorecard.score || 82}, 100`}
                        strokeLinecap="round"
                        strokeWidth="3.4"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-sans text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">
                        {selectedCandidateForScorecard.score || 82}
                      </span>
                      <span className="text-[0.6875rem] font-mono text-slate-400">/ 100</span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold w-max mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      Strong Calibration
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Percentile: Top 14%</span>
                    <h3 className="font-sans text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                      {selectedCandidateForScorecard.name}
                    </h3>
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                      {selectedCandidateForScorecard.role} Rubric
                    </p>
                  </div>
                </div>

                {/* Stat Pills */}
                <div className="md:col-span-6 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col">
                    <span className="text-[0.6875rem] font-mono font-medium uppercase text-slate-400">Video Stream</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">24 min HD</span>
                    <span className="text-[0.6875rem] text-slate-500 dark:text-slate-400 font-mono">100% verified</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col">
                    <span className="text-[0.6875rem] font-mono font-medium uppercase text-slate-400">Responses</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">8 Evaluated</span>
                    <span className="text-[0.6875rem] text-slate-500 dark:text-slate-400 font-mono">All prompts answered</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col">
                    <span className="text-[0.6875rem] font-mono font-medium uppercase text-slate-400">Real-Time Probes</span>
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">5 Dynamic</span>
                    <span className="text-[0.6875rem] text-slate-500 dark:text-slate-400 font-mono">Autonomous follow-ups</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col">
                    <span className="text-[0.6875rem] font-mono font-medium uppercase text-slate-400">Rubric Depth</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">6 Dimensions</span>
                    <span className="text-[0.6875rem] text-slate-500 dark:text-slate-400 font-mono">Full rubric coverage</span>
                  </div>
                </div>
              </div>

              {/* Core Competencies Breakdown */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[0.6875rem] uppercase font-semibold tracking-wider text-blue-700 dark:text-blue-400 font-mono">
                      Rubric Dimensions
                    </span>
                    <h3 className="font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Core Competencies Calibration
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Benchmark: 75%</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Metric 1 */}
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-900 dark:text-slate-100">Technical Depth</span>
                      <span className="text-blue-700 dark:text-blue-400 font-mono">84%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-700 h-full rounded-full" style={{ width: "84%" }} />
                    </div>
                    <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">High conceptual precision in systems reasoning.</p>
                  </div>

                  {/* Metric 2 */}
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-900 dark:text-slate-100">Problem Solving</span>
                      <span className="text-blue-700 dark:text-blue-400 font-mono">79%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-700 h-full rounded-full" style={{ width: "79%" }} />
                    </div>
                    <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">Logical decomposition of edge constraints.</p>
                  </div>

                  {/* Metric 3 */}
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-900 dark:text-slate-100">Verbal Articulation</span>
                      <span className="text-blue-700 dark:text-blue-400 font-mono">88%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-700 h-full rounded-full" style={{ width: "88%" }} />
                    </div>
                    <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">Structured communication and audio clarity.</p>
                  </div>

                  {/* Metric 4 */}
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-900 dark:text-slate-100">Production Experience</span>
                      <span className="text-blue-700 dark:text-blue-400 font-mono">81%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-700 h-full rounded-full" style={{ width: "81%" }} />
                    </div>
                    <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">Demonstrated real-world trade-off understanding.</p>
                  </div>
                </div>
              </div>

              {/* Strengths & Growth Areas Two-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-700 dark:text-blue-400 text-[20px]">verified</span>
                    <h4 className="font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Validated Strengths
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-blue-700 dark:text-blue-400 text-base shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>High vocal pacing and structured verbal delivery on camera.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-blue-700 dark:text-blue-400 text-base shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>Maintained precision when the AI interviewer asked follow-up probes.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-blue-700 dark:text-blue-400 text-base shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>Demonstrated clear architectural trade-offs in scalable environments.</span>
                    </li>
                  </ul>
                </div>

                {/* Areas to Strengthen */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px]">lightbulb</span>
                    <h4 className="font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Areas for Further Inquiry
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base shrink-0 mt-0.5">
                        adjust
                      </span>
                      <span>Deepen understanding of edge caching strategies and memory boundaries.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base shrink-0 mt-0.5">
                        adjust
                      </span>
                      <span>Practice explaining how systems handle graceful degradation during traffic spikes.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base shrink-0 mt-0.5">
                        adjust
                      </span>
                      <span>Strengthen task-aligned evaluation metrics selection.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Round 2 Aptitude Evaluation Summary if candidate has attempted */}
              {candidateAptitudeAudit && (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-700 dark:text-blue-400 text-[20px]">psychology</span>
                      <div>
                        <h4 className="font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Round 2: Aptitude Assessment Performance
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Automated evaluation across Quantitative, Logical Reasoning, and Verbal Ability
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold font-mono border ${
                        candidateAptitudeAudit.passed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                      }`}>
                        {candidateAptitudeAudit.passed ? 'PASSED (Cutoff Met)' : 'FAILED (Below Cutoff)'}
                      </span>
                      <span className="text-base font-bold text-blue-700 dark:text-blue-400 font-mono">
                        {candidateAptitudeAudit.score?.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Section Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col">
                      <span className="text-[0.6875rem] font-mono font-medium uppercase text-slate-400">Time Taken</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {Math.floor((candidateAptitudeAudit.time_spent_seconds || 0) / 60)}m {(candidateAptitudeAudit.time_spent_seconds || 0) % 60}s
                      </span>
                      <span className="text-[0.6875rem] text-slate-500 font-mono">Server verified</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col">
                      <span className="text-[0.6875rem] font-mono font-medium uppercase text-slate-400">Proctoring Signals</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {candidateAptitudeAudit.tab_switches || 0} Tab Switches
                      </span>
                      <span className="text-[0.6875rem] text-slate-500 font-mono">Warning limit: 3</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col">
                      <span className="text-[0.6875rem] font-mono font-medium uppercase text-slate-400">Cutoff Threshold</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {candidateAptitudeAudit.cutoff || 60}%
                      </span>
                      <span className="text-[0.6875rem] text-slate-500 font-mono">Round 2 Gating</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col">
                      <span className="text-[0.6875rem] font-mono font-medium uppercase text-slate-400">Total Questions</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {candidateAptitudeAudit.questions?.length || 0} Evaluated
                      </span>
                      <span className="text-[0.6875rem] text-slate-500 font-mono">100% evaluated</span>
                    </div>
                  </div>

                  {/* Section Breakdown Pills */}
                  {candidateAptitudeAudit.section_scores && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.entries(candidateAptitudeAudit.section_scores).map(([sec, stats]: [string, any]) => (
                        <div key={sec} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-900 dark:text-slate-100">{sec}</span>
                            <span className="text-blue-700 dark:text-blue-400 font-mono">{stats.score?.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-700 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, stats.score))}%` }} />
                          </div>
                          <span className="text-[0.6875rem] text-slate-400 font-mono">{stats.correct}/{stats.total} correct</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scorecard Footer Actions */}
            <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedCandidateForScorecard(null)}
                className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors"
              >
                Close Scorecard
              </button>

              <button
                onClick={() => {
                  const candidate = selectedCandidateForScorecard;
                  setSelectedCandidateForScorecard(null);
                  handleLaunchInterview(candidate);
                }}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
              >
                <span className="material-symbols-outlined text-sm">videocam</span>
                <span>Launch Live Interview Room</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION: RECRUITER SETTINGS MODAL
      ───────────────────────────────────────────────────────────── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Workspace Settings</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Evaluation Engine & Model Preferences</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-900 dark:text-slate-100 block mb-1">LLM Evaluation Model (Groq API)</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B Versatile (Recommended)</option>
                  <option value="llama-3.1-8b-instant">LLaMA 3.1 8B Instant (Ultra-fast)</option>
                  <option value="mixtral-8x7b-32768">Mixtral 8x7B (High context)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-900 dark:text-slate-100 block mb-1">Speech Engine</label>
                <input
                  type="text"
                  disabled
                  value="Deepgram Nova-2 (WebSocket Real-time)"
                  className="w-full h-9 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Google Meet Autonomous Join</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Allow Playwright bot to auto-admit candidates</p>
                </div>
                <input
                  type="checkbox"
                  checked={meetBotAutoJoin}
                  onChange={(e) => setMeetBotAutoJoin(e.target.checked)}
                  className="w-4 h-4 accent-blue-700 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast({
                    title: "Settings Saved",
                    description: `Preferences updated: using ${selectedModel}`
                  });
                  setIsSettingsOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION: HELP & SUPPORT MODAL
      ───────────────────────────────────────────────────────────── */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">help</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Help & System Guide</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Architecture & Operational Workflows</p>
                </div>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">1. How Resume Screening Works</h4>
                <p className="text-[11px] leading-relaxed">
                  Upload candidate PDFs in the Intake Funnel. The system parses text with spaCy/pdfminer and evaluates cosine similarity against your target job description.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">2. Google Meet Bot Join</h4>
                <p className="text-[11px] leading-relaxed">
                  The automated interview bot uses headless Playwright on port 8001. When a meeting link is generated, it joins as host and asks questions via Deepgram TTS.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">3. Live Video Interview Room</h4>
                <p className="text-[11px] leading-relaxed">
                  Click <strong>Launch Direct Room</strong> or <strong>Start Interview</strong> next to any candidate to test the interactive camera, speech evaluation, and question generator.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterDashboard;
