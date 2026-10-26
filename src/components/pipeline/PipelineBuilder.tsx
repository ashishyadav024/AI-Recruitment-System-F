import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Lock,
  Sliders,
  Users,
  ShieldCheck,
  History,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Bot,
  Brain,
  Timer,
  ChevronDown,
  ChevronUp,
  XCircle,
  AlertTriangle,
  FileCheck2,
  Check,
  X,
  Quote,
  RefreshCw,
  FileText,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useTheme } from '@/context/ThemeContext';
import { toast } from '@/components/ui/use-toast';
import { pipelineService } from '@/services/pipelineService';
import {
  PipelineConfig,
  RoundConfig,
  StandardRoundType,
  OnFailAction,
  CandidateApplication,
  CandidateStepperProgress,
  PipelineOverride,
  AptitudeConfig,
  AptitudeResult,
  AptitudeQuestionAudit
} from '@/types/pipeline';
import { CandidateProgressStepper } from './CandidateProgressStepper';

const STANDARD_ROLES = [
  'Machine Learning Engineer',
  'Frontend Developer',
  'Backend Engineer',
  'Data Analyst'
];

export const PipelineBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'builder' | 'candidates' | 'audit'>('builder');

  // Selected job role
  const [selectedRole, setSelectedRole] = useState<string>(STANDARD_ROLES[0]);
  const [pipeline, setPipeline] = useState<PipelineConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Aptitude Round Configuration state
  const [aptitudeConfig, setAptitudeConfig] = useState<AptitudeConfig>({
    quant_count: 5,
    logic_count: 5,
    verbal_count: 5,
    difficulty_mix: 'balanced',
    duration_minutes: 30,
    cutoff_score: 60,
    negative_marking: false,
    negative_penalty: 0.25,
    tab_switch_limit: 3,
    retake_allowed: false
  });
  const [isSavingAptitude, setIsSavingAptitude] = useState(false);
  const [questionStats, setQuestionStats] = useState<{ total_questions: number; by_section: Record<string, number> } | null>(null);
  const [isAptitudeExpanded, setIsAptitudeExpanded] = useState(true);

  // Step B: Role Requirements State & Handlers
  const [roleRequirements, setRoleRequirements] = useState<{
    job_description: string;
    must_have_skills: string[];
    nice_to_have_skills: string[];
    experience_expectations: string;
  }>({
    job_description: '',
    must_have_skills: [],
    nice_to_have_skills: [],
    experience_expectations: ''
  });
  const [isSavingRequirements, setIsSavingRequirements] = useState(false);
  const [isRequirementsExpanded, setIsRequirementsExpanded] = useState(true);
  const [newMustHave, setNewMustHave] = useState('');
  const [newNiceToHave, setNewNiceToHave] = useState('');
  const [isReScreening, setIsReScreening] = useState(false);

  // Candidates & Stepper inspections
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [selectedAppProgress, setSelectedAppProgress] = useState<CandidateStepperProgress | null>(null);
  const [selectedAppAptitudeAudit, setSelectedAppAptitudeAudit] = useState<AptitudeResult | null>(null);
  const [isLoadingAptitudeAudit, setIsLoadingAptitudeAudit] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<PipelineOverride[]>([]);

  // Override modal
  const [overrideTarget, setOverrideTarget] = useState<{
    appId: string;
    roundId: string;
    action: 'promote' | 'allow_retake' | 'reject';
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  // Load pipeline on role change
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const p = await pipelineService.getPipelineByRole(selectedRole);
        if (mounted) {
          setPipeline(p);
        }
      } catch (err) {
        console.error('Failed to load pipeline:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedRole]);

  // Load applications & audit log
  useEffect(() => {
    const apps = pipelineService.listAllApplications().filter(
      a => a.job_role.toLowerCase() === selectedRole.toLowerCase()
    );
    setApplications(apps);
    setOverrides(pipelineService.listOverrides());

    if (apps.length > 0) {
      pipelineService.getStepperProgress(apps[0].application_id).then(setSelectedAppProgress);
    } else {
      setSelectedAppProgress(null);
    }
  }, [selectedRole]);

  // Load Aptitude Configuration & Question Bank stats
  useEffect(() => {
    let mounted = true;
    pipelineService.getAptitudeConfig(selectedRole).then(cfg => {
      if (mounted && cfg) {
        setAptitudeConfig(cfg);
      }
    });
    pipelineService.getAptitudeStats().then(stats => {
      if (mounted && stats) {
        setQuestionStats(stats);
      }
    });
    return () => { mounted = false; };
  }, [selectedRole]);

  // Load Role Requirements for selected role (Step B)
  useEffect(() => {
    let mounted = true;
    pipelineService.getRoleRequirements(selectedRole).then(res => {
      if (mounted && res.success && res.requirements) {
        setRoleRequirements({
          job_description: res.requirements.job_description || '',
          must_have_skills: res.requirements.must_have_skills || [],
          nice_to_have_skills: res.requirements.nice_to_have_skills || [],
          experience_expectations: res.requirements.experience_expectations || ''
        });
      }
    });
    return () => { mounted = false; };
  }, [selectedRole]);

  const handleSaveRoleRequirements = async () => {
    setIsSavingRequirements(true);
    try {
      const res = await pipelineService.saveRoleRequirements(selectedRole, roleRequirements);
      if (res.success) {
        toast({
          title: "Role Requirements Saved",
          description: `Updated job description and requirements for ${selectedRole}.`,
        });
      } else {
        toast({
          title: "Save Failed",
          description: res.error || "Could not save role requirements.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSavingRequirements(false);
    }
  };

  const handleReScreenCandidate = async (appId: string) => {
    setIsReScreening(true);
    try {
      const res = await pipelineService.screenApplication(appId, selectedRole);
      if (res.success) {
        toast({
          title: res.flagged ? "Flagged for Review" : "Screening Complete",
          description: `Score: ${res.score}% (${res.passed ? "Passed" : "Below Cutoff"}). Method: ${res.evaluation_method}`,
          variant: res.flagged ? "destructive" : "default"
        });
        const updated = await pipelineService.getStepperProgress(appId);
        if (updated) setSelectedAppProgress(updated);
      } else {
        toast({
          title: "Screening Failed",
          description: res.error || "Screening could not be completed.",
          variant: "destructive"
        });
      }
    } finally {
      setIsReScreening(false);
    }
  };

  // Load candidate's Aptitude Assessment audit when candidate is selected
  useEffect(() => {
    let mounted = true;
    if (selectedAppProgress?.application?.application_id) {
      setIsLoadingAptitudeAudit(true);
      pipelineService.getAptitudeRecruiterAudit(selectedAppProgress.application.application_id)
        .then(res => {
          if (mounted) {
            if (res.success && res.audit) {
              setSelectedAppAptitudeAudit(res.audit);
            } else {
              setSelectedAppAptitudeAudit(null);
            }
          }
        })
        .finally(() => {
          if (mounted) setIsLoadingAptitudeAudit(false);
        });
    } else {
      setSelectedAppAptitudeAudit(null);
    }
    return () => { mounted = false; };
  }, [selectedAppProgress]);

  const handleSaveAptitudeConfig = async () => {
    setIsSavingAptitude(true);
    try {
      const res = await pipelineService.updateAptitudeConfig({
        ...aptitudeConfig,
        pipeline_id: pipeline?.pipeline_id || 'default'
      });
      if (res.success) {
        toast({
          title: 'Aptitude Settings Saved',
          description: `Configured ${aptitudeConfig.quant_count + aptitudeConfig.logic_count + aptitudeConfig.verbal_count} questions (${aptitudeConfig.difficulty_mix} mix), ${aptitudeConfig.duration_minutes}m duration, ${aptitudeConfig.cutoff_score}% cutoff.`
        });
        // Sync with Round 2 if present
        if (pipeline) {
          const aptIndex = pipeline.rounds.findIndex(r => r.round_type === 'aptitude_test');
          if (aptIndex !== -1) {
            handleUpdateRound(aptIndex, 'duration_minutes', aptitudeConfig.duration_minutes);
            handleUpdateRound(aptIndex, 'cutoff_score', aptitudeConfig.cutoff_score);
          }
        }
      } else {
        throw new Error(res.error || 'Failed to update config');
      }
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save aptitude round configuration.',
        variant: 'destructive'
      });
    } finally {
      setIsSavingAptitude(false);
    }
  };

  // Re-ordering logic
  const handleMoveRound = (index: number, direction: 'up' | 'down') => {
    if (!pipeline) return;
    const newRounds = [...pipeline.rounds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newRounds.length) return;

    // Swap positions
    const temp = newRounds[index];
    newRounds[index] = newRounds[targetIndex];
    newRounds[targetIndex] = temp;

    // Re-index orders
    newRounds.forEach((r, idx) => {
      r.order = idx + 1;
    });

    setPipeline({
      ...pipeline,
      rounds: newRounds
    });
  };

  const handleUpdateRound = (index: number, field: keyof RoundConfig, value: any) => {
    if (!pipeline) return;
    const newRounds = [...pipeline.rounds];
    newRounds[index] = {
      ...newRounds[index],
      [field]: value
    };
    setPipeline({
      ...pipeline,
      rounds: newRounds
    });
  };

  const handleSavePipeline = async () => {
    if (!pipeline) return;
    setIsSaving(true);
    try {
      await pipelineService.savePipeline(pipeline);
      toast({
        title: 'Pipeline Saved',
        description: `Successfully calibrated ${pipeline.rounds.length} sequential rounds for ${selectedRole}.`
      });
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save pipeline configuration.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteOverride = async () => {
    if (!overrideTarget || !overrideReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please specify the business justification for this override.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await pipelineService.applyRecruiterOverride(
        overrideTarget.appId,
        overrideTarget.roundId,
        overrideTarget.action,
        overrideReason.trim(),
        'Alex Morgan (Lead Talent Recruiter)'
      );

      toast({
        title: 'Override Logged & Applied',
        description: `Action '${overrideTarget.action}' executed successfully.`
      });

      // Refresh stepper and audit
      const updatedProgress = await pipelineService.getStepperProgress(overrideTarget.appId);
      setSelectedAppProgress(updatedProgress);
      setOverrides(pipelineService.listOverrides());
      setOverrideTarget(null);
      setOverrideReason('');
    } catch (err: any) {
      toast({
        title: 'Override Failed',
        description: err.message || 'Failed to apply recruiter override.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 font-sans ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Navigation Bar */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between ${
        theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200 shadow-2xs'
      }`}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Button>

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          <BrandLogo size="sm" asLink={false} />
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            Sequential Gating Active
          </Badge>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">
        {/* Title & Role Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Hiring Pipeline Architecture
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select, order, and calibrate cutoff scores and duration across all 6 recruitment rounds.
            </p>
          </div>

          {/* Role selector dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Role:
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-700"
            >
              {STANDARD_ROLES.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'builder'
                ? 'border-blue-700 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Pipeline Rounds ({pipeline?.rounds.length || 6})</span>
          </button>

          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'candidates'
                ? 'border-blue-700 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Candidates in Pipeline ({applications.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-blue-700 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Override Audit Log ({overrides.length})</span>
          </button>
        </div>

        {/* TAB 1: PIPELINE ROUNDS BUILDER */}
        {activeTab === 'builder' && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-blue-700 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-bold">Sequential Gating Rules Enforced Server-Side</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Round 1 starts unlocked. Each subsequent round is locked until the candidate meets or exceeds the cutoff score of the previous round. Direct URL access without passing previous rounds is blocked with HTTP 403 Forbidden.
                </p>
              </div>
            </div>

            {/* Rounds List Cards */}
            <div className="flex flex-col gap-3">
              {pipeline?.rounds.map((round, idx) => (
                <div
                  key={round.round_id}
                  className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                    {/* Left: Re-order controls & Round Title */}
                    <div className="flex items-start sm:items-center gap-3 flex-1">
                      <div className="flex flex-col gap-1 items-center">
                        <button
                          onClick={() => handleMoveRound(idx, 'up')}
                          disabled={idx === 0}
                          title="Move round earlier"
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        </button>
                        <span className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center font-mono font-bold text-xs">
                          {round.order}
                        </span>
                        <button
                          onClick={() => handleMoveRound(idx, 'down')}
                          disabled={idx === (pipeline.rounds.length - 1)}
                          title="Move round later"
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {round.title}
                          </h3>
                          {round.round_type === 'aptitude_test' && (
                            <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-semibold flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              <span>Automated Aptitude Engine</span>
                            </Badge>
                          )}
                          {round.round_type === 'technical_interview' && (
                            <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-semibold">
                              Connected to AI Live Interview
                            </Badge>
                          )}
                          {!round.is_active && (
                            <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
                          {round.description}
                        </p>
                      </div>
                    </div>

                    {/* Right: Round Parameters Config Grid */}
                    <div className={`grid grid-cols-2 ${round.round_type === 'resume_screening' ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs`}>
                      {/* Duration */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Duration (min)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={180}
                          value={round.duration_minutes}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 30;
                            handleUpdateRound(idx, 'duration_minutes', val);
                            if (round.round_type === 'aptitude_test') {
                              setAptitudeConfig(prev => ({ ...prev, duration_minutes: val }));
                            }
                          }}
                          className="h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-semibold"
                        />
                      </div>

                      {/* Cutoff Score */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Cutoff Score (0-100)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={95}
                          value={round.cutoff_score}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 60;
                            handleUpdateRound(idx, 'cutoff_score', val);
                            if (round.round_type === 'aptitude_test') {
                              setAptitudeConfig(prev => ({ ...prev, cutoff_score: val }));
                            }
                          }}
                          className="h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-semibold text-blue-700 dark:text-blue-400"
                        />
                      </div>

                      {/* Weight % */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Weight (%)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={100}
                          value={round.weight}
                          onChange={(e) => handleUpdateRound(idx, 'weight', parseFloat(e.target.value) || 15)}
                          className="h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-semibold"
                        />
                      </div>

                      {/* On Fail Action */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          If Below Cutoff
                        </label>
                        <select
                          value={round.on_fail_action}
                          onChange={(e) => handleUpdateRound(idx, 'on_fail_action', e.target.value as OnFailAction)}
                          className="h-8 px-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold"
                        >
                          <option value="reject">Auto-Reject</option>
                          <option value="hold">Hold for Review</option>
                        </select>
                      </div>

                      {/* Borderline Margin (Hold Margin) */}
                      {round.round_type === 'resume_screening' && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1" title="Scores within this margin below cutoff are held for recruiter review (default 10)">
                            <span>Hold Margin</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={30}
                            value={round.borderline_margin ?? 10}
                            onChange={(e) => handleUpdateRound(idx, 'borderline_margin', parseFloat(e.target.value) || 0)}
                            className="h-8 px-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded text-xs font-mono font-semibold text-amber-700 dark:text-amber-400"
                            placeholder="10"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dedicated Role Requirements & ATS Screening Calibration for Round 1 */}
                  {round.round_type === 'resume_screening' && (
                    <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Role Requirements & ATS Screening Calibration (Backend LLM)
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border-emerald-200">
                            Must-Haves: 75% • Nice-To-Haves: 25%
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsRequirementsExpanded(!isRequirementsExpanded)}
                          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          {isRequirementsExpanded ? (
                            <><span>Collapse</span><ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <><span>Configure</span><ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      </div>

                      {isRequirementsExpanded && (
                        <div className="p-3.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-3">
                          {/* Job Description */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                              Job Description (Used by LLM for semantic evaluation)
                            </label>
                            <textarea
                              rows={2}
                              value={roleRequirements.job_description}
                              onChange={(e) => setRoleRequirements(prev => ({ ...prev, job_description: e.target.value }))}
                              placeholder="Paste or edit the job description for this role..."
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs leading-relaxed"
                            />
                          </div>

                          {/* Experience Expectations */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                              Experience Expectations
                            </label>
                            <input
                              type="text"
                              value={roleRequirements.experience_expectations}
                              onChange={(e) => setRoleRequirements(prev => ({ ...prev, experience_expectations: e.target.value }))}
                              placeholder="e.g. 2+ years building production applications"
                              className="h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                            />
                          </div>

                          {/* Must Have vs Nice to Have Skills Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {/* Must-Have Skills (75% weight) */}
                            <div className="p-3 bg-white dark:bg-slate-900 rounded border border-emerald-200 dark:border-emerald-800/60 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Must-Have Skills (75% weight)</span>
                                </span>
                                <span className="text-[10px] font-mono text-emerald-700">
                                  {roleRequirements.must_have_skills.length} skills
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                                {roleRequirements.must_have_skills.map((skill, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                                  >
                                    <span>{skill}</span>
                                    <button
                                      type="button"
                                      onClick={() => setRoleRequirements(prev => ({
                                        ...prev,
                                        must_have_skills: prev.must_have_skills.filter((_, i) => i !== sIdx)
                                      }))}
                                      className="text-emerald-600 hover:text-red-600 cursor-pointer text-xs"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-1.5 pt-1">
                                <input
                                  type="text"
                                  placeholder="Add must-have skill..."
                                  value={newMustHave}
                                  onChange={(e) => setNewMustHave(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newMustHave.trim()) {
                                      e.preventDefault();
                                      setRoleRequirements(prev => ({
                                        ...prev,
                                        must_have_skills: [...prev.must_have_skills, newMustHave.trim()]
                                      }));
                                      setNewMustHave('');
                                    }
                                  }}
                                  className="h-7 px-2 flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs"
                                />
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    if (newMustHave.trim()) {
                                      setRoleRequirements(prev => ({
                                        ...prev,
                                        must_have_skills: [...prev.must_have_skills, newMustHave.trim()]
                                      }));
                                      setNewMustHave('');
                                    }
                                  }}
                                  className="h-7 px-2 text-xs"
                                >
                                  +
                                </Button>
                              </div>
                            </div>

                            {/* Nice-To-Have Skills (25% weight) */}
                            <div className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-blue-600" />
                                  <span>Nice-To-Have Skills (25% weight)</span>
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {roleRequirements.nice_to_have_skills.length} skills
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                                {roleRequirements.nice_to_have_skills.map((skill, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                  >
                                    <span>{skill}</span>
                                    <button
                                      type="button"
                                      onClick={() => setRoleRequirements(prev => ({
                                        ...prev,
                                        nice_to_have_skills: prev.nice_to_have_skills.filter((_, i) => i !== sIdx)
                                      }))}
                                      className="text-slate-500 hover:text-red-600 cursor-pointer text-xs"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-1.5 pt-1">
                                <input
                                  type="text"
                                  placeholder="Add nice-to-have skill..."
                                  value={newNiceToHave}
                                  onChange={(e) => setNewNiceToHave(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newNiceToHave.trim()) {
                                      e.preventDefault();
                                      setRoleRequirements(prev => ({
                                        ...prev,
                                        nice_to_have_skills: [...prev.nice_to_have_skills, newNiceToHave.trim()]
                                      }));
                                      setNewNiceToHave('');
                                    }
                                  }}
                                  className="h-7 px-2 flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs"
                                />
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    if (newNiceToHave.trim()) {
                                      setRoleRequirements(prev => ({
                                        ...prev,
                                        nice_to_have_skills: [...prev.nice_to_have_skills, newNiceToHave.trim()]
                                      }));
                                      setNewNiceToHave('');
                                    }
                                  }}
                                  className="h-7 px-2 text-xs"
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Save Role Requirements Action Button */}
                          <div className="flex justify-end pt-1">
                            <Button
                              size="sm"
                              type="button"
                              onClick={handleSaveRoleRequirements}
                              disabled={isSavingRequirements}
                              className="h-8 px-4 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isSavingRequirements ? 'Saving Requirements...' : 'Save Role Requirements'}</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dedicated Aptitude Engine Calibration & Marking Rules for Round 2 */}
                  {round.round_type === 'aptitude_test' && (
                    <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Brain className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Aptitude Engine Calibration & Question Bank Rules
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            {questionStats ? `${questionStats.total_questions} Questions in Bank` : '45 Questions in Bank'}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAptitudeExpanded(!isAptitudeExpanded)}
                          className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <span>{isAptitudeExpanded ? 'Collapse Settings' : 'Expand Settings'}</span>
                          {isAptitudeExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {isAptitudeExpanded && (
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col gap-3.5">
                          {/* Section Question Counts */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Quantitative Questions (Max 15)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={15}
                                value={aptitudeConfig.quant_count}
                                onChange={(e) => setAptitudeConfig({ ...aptitudeConfig, quant_count: Math.min(15, Math.max(1, parseInt(e.target.value) || 1)) })}
                                className="h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-semibold"
                              />
                              <span className="text-[10px] text-slate-500">Arithmetic, ratios, percentages, time & work</span>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Logical Reasoning Questions (Max 15)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={15}
                                value={aptitudeConfig.logic_count}
                                onChange={(e) => setAptitudeConfig({ ...aptitudeConfig, logic_count: Math.min(15, Math.max(1, parseInt(e.target.value) || 1)) })}
                                className="h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-semibold"
                              />
                              <span className="text-[10px] text-slate-500">Sequences, coding-decoding, blood relations</span>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Verbal Ability Questions (Max 15)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={15}
                                value={aptitudeConfig.verbal_count}
                                onChange={(e) => setAptitudeConfig({ ...aptitudeConfig, verbal_count: Math.min(15, Math.max(1, parseInt(e.target.value) || 1)) })}
                                className="h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-semibold"
                              />
                              <span className="text-[10px] text-slate-500">Grammar, vocabulary, passage deductions</span>
                            </div>
                          </div>

                          {/* Difficulty Mix, Marking & Proctoring */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Difficulty Mix
                              </label>
                              <select
                                value={aptitudeConfig.difficulty_mix}
                                onChange={(e) => setAptitudeConfig({ ...aptitudeConfig, difficulty_mix: e.target.value as any })}
                                className="h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold"
                              >
                                <option value="balanced">Balanced (Easy, Medium, Hard)</option>
                                <option value="easy">Easy Foundation</option>
                                <option value="medium">Medium Standard</option>
                                <option value="hard">Advanced High-Bar</option>
                              </select>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Tab-Switch Warning Limit
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={aptitudeConfig.tab_switch_limit}
                                onChange={(e) => setAptitudeConfig({ ...aptitudeConfig, tab_switch_limit: Math.max(1, parseInt(e.target.value) || 3) })}
                                className="h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-semibold"
                              />
                              <span className="text-[10px] text-slate-500">Flags attempt on excess</span>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Negative Marking
                              </label>
                              <div className="flex items-center gap-2 h-8">
                                <input
                                  type="checkbox"
                                  id="negMarkingToggle"
                                  checked={aptitudeConfig.negative_marking}
                                  onChange={(e) => setAptitudeConfig({ ...aptitudeConfig, negative_marking: e.target.checked })}
                                  className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="negMarkingToggle" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                                  {aptitudeConfig.negative_marking ? '-0.25 per wrong' : 'Disabled (0 penalty)'}
                                </label>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Retake Permission
                              </label>
                              <div className="flex items-center gap-2 h-8">
                                <input
                                  type="checkbox"
                                  id="retakeAllowedToggle"
                                  checked={aptitudeConfig.retake_allowed}
                                  onChange={(e) => setAptitudeConfig({ ...aptitudeConfig, retake_allowed: e.target.checked })}
                                  className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="retakeAllowedToggle" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                                  {aptitudeConfig.retake_allowed ? 'Retake allowed' : '1 attempt only'}
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Save Aptitude Settings Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap font-mono">
                              <span>Total: <strong>{aptitudeConfig.quant_count + aptitudeConfig.logic_count + aptitudeConfig.verbal_count} Questions</strong></span>
                              <span>•</span>
                              <span>Duration: <strong>{round.duration_minutes}m</strong></span>
                              <span>•</span>
                              <span>Cutoff: <strong>{round.cutoff_score}%</strong></span>
                            </div>

                            <Button
                              size="sm"
                              onClick={handleSaveAptitudeConfig}
                              disabled={isSavingAptitude}
                              className="bg-blue-700 hover:bg-blue-800 text-white text-xs px-3.5 py-1.5 h-8 flex items-center gap-1.5 shadow-xs"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isSavingAptitude ? 'Saving...' : 'Save Aptitude Settings'}</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Save Action */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Sum of weights: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{pipeline?.rounds.reduce((acc, r) => acc + r.weight, 0)}%</span>
              </span>
              <Button
                onClick={handleSavePipeline}
                disabled={isSaving}
                className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-5 py-2 text-xs flex items-center gap-2 rounded-lg shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Pipeline Configuration'}</span>
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: CANDIDATES IN PIPELINE & STEPPER */}
        {activeTab === 'candidates' && (
          <div className="flex flex-col gap-6">
            {/* Candidate Selector Grid */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Select Candidate to Inspect Stepper:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {applications.map(app => (
                  <div
                    key={app.application_id}
                    onClick={() => pipelineService.getStepperProgress(app.application_id).then(setSelectedAppProgress)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedAppProgress?.application.application_id === app.application_id
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-700 ring-1 ring-blue-700'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{app.candidate_name}</span>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        R{app.current_round_order}/6
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{app.candidate_email}</p>
                    <div className="mt-2 text-[10px] text-blue-700 dark:text-blue-400 font-medium">
                      Status: {app.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Candidate Progress Stepper Display */}
            {selectedAppProgress && (
              <div className="flex flex-col gap-6">
                <CandidateProgressStepper
                  progress={selectedAppProgress}
                  showAdminOverrides={true}
                  onOverrideAction={(roundId, action) => {
                    setOverrideTarget({
                      appId: selectedAppProgress.application.application_id,
                      roundId,
                      action
                    });
                  }}
                />

                {/* Round 1: ATS Resume Screening & Evidence Verification Audit */}
                {(() => {
                  const round1Item = selectedAppProgress.rounds.find(
                    r => r.order === 1 || r.round_type === 'resume_screening'
                  );
                  const round1ScoreData = round1Item?.score_data;
                  const round1Details = (round1ScoreData?.details || {}) as Record<string, any>;
                  const round1Passed = round1ScoreData?.passed ?? (round1Item?.status === 'passed');
                  const round1Score = round1ScoreData?.score ?? null;
                  const round1Cutoff = round1ScoreData?.cutoff ?? round1Item?.cutoff_score ?? 60.0;
                  const evalMethod = round1Details.evaluation_method || (round1Score !== null ? 'llm_analysis' : 'pending_evaluation');
                  const evalModel = round1Details.model || 'llama-3.3-70b-versatile';
                  const isSecurityFlagged = Boolean(round1Details.security_flag);
                  const securityReason = round1Details.security_reason;
                  const matchedDetails = (round1Details.matched_details as Array<any>) || [];
                  const missingDetails = (round1Details.missing_details as Array<any>) || [];
                  const piiStats = round1Details.pii_redacted_stats as Record<string, number> | undefined;
                  const isPending = round1Item?.status === 'in_progress' && round1Score === null;
                  const scoreBreakdown = round1Details.score_breakdown as Record<string, any> | undefined;
                  const borderlineMargin = Number(round1Details.borderline_margin ?? 10.0);
                  const isBorderline = Boolean(
                    round1Details.is_borderline ||
                    round1Item?.status === 'on_hold' ||
                    selectedAppProgress.application.status === 'on_hold'
                  );
                  const rejectionMsg = round1Details.rejection_message as Record<string, any> | undefined;
                  const onHoldMsg = round1Details.on_hold_message as string | undefined;

                  return (
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                            <FileCheck2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                Round 1: ATS Resume Screening & Evidence Audit
                              </h3>
                              {isSecurityFlagged ? (
                                <Badge className="bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 text-[10px]">
                                  SECURITY FLAGGED
                                </Badge>
                              ) : isBorderline ? (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 text-[10px]">
                                  ON HOLD (BORDERLINE REVIEW)
                                </Badge>
                              ) : isPending ? (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 text-[10px]">
                                  PENDING EVALUATION
                                </Badge>
                              ) : round1Score !== null ? (
                                <Badge className={round1Passed ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" : "bg-red-50 text-red-700 border-red-200 text-[10px]"}>
                                  {round1Passed ? "PASSED" : "FAILED"}
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                                  NOT SCREENED
                                </Badge>
                              )}

                              {/* Evaluation method badge */}
                              {evalMethod === 'llm_analysis' && (
                                <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 text-[10px] flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  <span>AI Screened • {evalModel}</span>
                                </Badge>
                              )}
                              {evalMethod === 'keyword_fallback' && (
                                <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 text-[10px]">
                                  Keyword Fallback
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Candidate: {selectedAppProgress.application.candidate_name} ({selectedAppProgress.application.candidate_email}) • Role: {selectedAppProgress.application.job_role}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          {round1Score !== null && (
                            <div className="text-right">
                              <div className="text-xs text-slate-400 font-mono">Cutoff: {round1Cutoff}%</div>
                              <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
                                {round1Score.toFixed(1)}%
                              </div>
                            </div>
                          )}
                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => handleReScreenCandidate(selectedAppProgress.application.application_id)}
                            disabled={isReScreening}
                            className="h-8 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isReScreening ? 'animate-spin' : ''}`} />
                            <span>{isReScreening ? 'Screening...' : 'Re-Screen with AI'}</span>
                          </Button>
                        </div>
                      </div>

                      {/* Borderline Recruiter Review Banner */}
                      {isBorderline && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <span className="font-bold text-amber-900 dark:text-amber-200 block mb-0.5">
                                Borderline Application — On Hold for Recruiter Review
                              </span>
                              <p className="text-amber-800 dark:text-amber-300">
                                Score of {round1Score !== null ? `${round1Score.toFixed(1)}%` : 'N/A'} is within {borderlineMargin} points of cutoff ({round1Cutoff}%). Candidate sees: <em>"Your application is under review"</em>.
                              </p>
                              {onHoldMsg && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 italic">
                                  {onHoldMsg}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setOverrideTarget({
                                  applicationId: selectedAppProgress.application.application_id,
                                  roundNumber: 1,
                                  action: 'reject'
                                });
                                setOverrideReason('Manual rejection following borderline review');
                              }}
                              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/50"
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setOverrideTarget({
                                  applicationId: selectedAppProgress.application.application_id,
                                  roundNumber: 1,
                                  action: 'promote'
                                });
                                setOverrideReason('Approved borderline Round 1 candidate upon recruiter review');
                              }}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Approve & Unlock Round 2
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Security Warning Banner */}
                      {isSecurityFlagged && (
                        <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          <div className="flex-1 text-xs">
                            <span className="font-bold text-red-800 dark:text-red-300 block mb-0.5">
                              Prompt Injection Detected — Flagged for Recruiter Review
                            </span>
                            <span className="text-red-700 dark:text-red-400">
                              {securityReason || "Suspicious system override patterns were detected in the candidate resume text. Server score was held at 0% to prevent prompt hijacking."}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Pending Evaluation Banner */}
                      {isPending && (
                        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div className="flex-1 text-xs">
                            <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5">
                              Resume Screening Pending Evaluation
                            </span>
                            <span className="text-amber-700 dark:text-amber-400">
                              The LLM service was temporarily unavailable when the candidate applied. Click "Re-Screen with AI" above to run server-side screening with live role requirements.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Metric KPI Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Server ATS Score</span>
                          <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {round1Score !== null ? `${round1Score.toFixed(1)} / 100` : 'Pending'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            75% Must-Have + 25% Nice-To-Have
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Found in Resume</span>
                          <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                            {matchedDetails.length} Skills
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Verified with quote matching
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Not found in resume</span>
                          <span className="text-base font-bold text-red-600 dark:text-red-400 font-mono">
                            {missingDetails.length} Skills
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Not found or dropped
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Fairness & PII Stripped</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {piiStats ? `${(piiStats.name || 0) + (piiStats.email || 0) + (piiStats.phone || 0) + (piiStats.demographic || 0)} attributes redacted` : 'Scrubbed'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Name, contacts & demographics removed
                          </span>
                        </div>
                      </div>

                      {/* Score Transparency: How this score was calculated */}
                      {scoreBreakdown && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span>How this score was calculated</span>
                            </span>
                            <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                              Formula Score: {scoreBreakdown.final_score}%
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                                <span>Must-Have Requirements</span>
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                  Weight: {scoreBreakdown.weights?.must_have_weight || 75}%
                                </Badge>
                              </div>
                              <div className="grid grid-cols-4 gap-1 text-[11px] font-mono text-center pt-1">
                                <div className="p-1 rounded bg-slate-50 dark:bg-slate-800">
                                  <div className="text-slate-400 text-[10px]">Total</div>
                                  <div className="font-bold">{scoreBreakdown.must_haves?.total || 0}</div>
                                </div>
                                <div className="p-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  <div className="text-[10px]">Matched</div>
                                  <div className="font-bold">{scoreBreakdown.must_haves?.matched || 0}</div>
                                </div>
                                <div className="p-1 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                  <div className="text-[10px]">Partial (0.5)</div>
                                  <div className="font-bold">{scoreBreakdown.must_haves?.partial || 0}</div>
                                </div>
                                <div className="p-1 rounded bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                  <div className="text-[10px]">Missing</div>
                                  <div className="font-bold">{scoreBreakdown.must_haves?.missing || 0}</div>
                                </div>
                              </div>
                              <div className="text-[10px] text-slate-500 pt-1 flex justify-between">
                                <span>Points earned:</span>
                                <span className="font-bold font-mono text-slate-700 dark:text-slate-300">{scoreBreakdown.must_haves?.points_earned || 0} / {scoreBreakdown.weights?.must_have_weight || 75} pts</span>
                              </div>
                            </div>

                            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                                <span>Nice-To-Have Requirements</span>
                                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                  Weight: {scoreBreakdown.weights?.nice_to_have_weight || 25}%
                                </Badge>
                              </div>
                              <div className="grid grid-cols-4 gap-1 text-[11px] font-mono text-center pt-1">
                                <div className="p-1 rounded bg-slate-50 dark:bg-slate-800">
                                  <div className="text-slate-400 text-[10px]">Total</div>
                                  <div className="font-bold">{scoreBreakdown.nice_to_haves?.total || 0}</div>
                                </div>
                                <div className="p-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  <div className="text-[10px]">Matched</div>
                                  <div className="font-bold">{scoreBreakdown.nice_to_haves?.matched || 0}</div>
                                </div>
                                <div className="p-1 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                  <div className="text-[10px]">Partial (0.5)</div>
                                  <div className="font-bold">{scoreBreakdown.nice_to_haves?.partial || 0}</div>
                                </div>
                                <div className="p-1 rounded bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                  <div className="text-[10px]">Missing</div>
                                  <div className="font-bold">{scoreBreakdown.nice_to_haves?.missing || 0}</div>
                                </div>
                              </div>
                              <div className="text-[10px] text-slate-500 pt-1 flex justify-between">
                                <span>Points earned:</span>
                                <span className="font-bold font-mono text-slate-700 dark:text-slate-300">{scoreBreakdown.nice_to_haves?.points_earned || 0} / {scoreBreakdown.weights?.nice_to_have_weight || 25} pts</span>
                              </div>
                            </div>
                          </div>

                          {scoreBreakdown.formula_text && (
                            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10.5px] text-slate-700 dark:text-slate-300 overflow-x-auto">
                              {scoreBreakdown.formula_text}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Verified Evidence & Missing Skills Audit */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Found In Resume (Verified Matches) */}
                        <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex flex-col gap-3">
                          <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-emerald-900/40">
                            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Found in resume ({matchedDetails.length})</span>
                            </span>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                              Exact quote verified
                            </span>
                          </div>

                          {matchedDetails.length === 0 ? (
                            <div className="py-4 text-center text-xs text-slate-400">
                              No matching competencies verified in resume.
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                              {matchedDetails.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200/60 dark:border-emerald-900/60 flex flex-col gap-1.5 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      {item.skill}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                        item.category === 'must_have'
                                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                          : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                      }`}>
                                        {item.category === 'must_have' ? 'Must-Have (75%)' : 'Nice-To-Have (25%)'}
                                      </span>
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                                        {item.status === 'partially_matched' ? 'Partial' : 'Match'}
                                      </span>
                                    </div>
                                  </div>
                                  {item.evidence_quote && (
                                    <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/40 rounded border border-emerald-100 dark:border-emerald-900/50 flex items-start gap-2">
                                      <Quote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                      <p className="text-[11px] text-emerald-950 dark:text-emerald-200 italic leading-relaxed">
                                        "{item.evidence_quote}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Missing or Dropped Competencies */}
                        <div className="p-4 bg-red-50/40 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/40 flex flex-col gap-3">
                          <div className="flex items-center justify-between pb-2 border-b border-red-100 dark:border-red-900/40">
                            <span className="text-xs font-bold text-red-900 dark:text-red-300 flex items-center gap-1.5">
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span>Not found in resume ({missingDetails.length})</span>
                            </span>
                            <span className="text-[10px] text-red-700 dark:text-red-400 font-medium">
                              Not found / evidence dropped
                            </span>
                          </div>

                          {missingDetails.length === 0 ? (
                            <div className="py-4 text-center text-xs text-emerald-600 font-medium">
                              All role competency requirements were successfully matched!
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                              {missingDetails.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-red-200/60 dark:border-red-900/60 flex flex-col gap-1.5 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      {item.skill}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                      item.category === 'must_have'
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                        : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                    }`}>
                                      {item.category === 'must_have' ? 'Must-Have' : 'Nice-To-Have'}
                                    </span>
                                  </div>
                                  <div className="p-1.5 bg-red-50/60 dark:bg-red-950/40 rounded border border-red-100 dark:border-red-900/50 text-[11px] text-red-800 dark:text-red-300">
                                    {item.dropped_reason || "Not mentioned in resume"}
                                    {item.unverified_quote && (
                                      <p className="mt-1 text-[10px] text-red-600 dark:text-red-400 italic">
                                        Quote not found in resume: "{item.unverified_quote}"
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Candidate Aptitude Test Performance Audit */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                        <Brain className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            Round 2: Aptitude Test Performance & Proctoring Audit
                          </h3>
                          {selectedAppAptitudeAudit && (
                            <Badge className={selectedAppAptitudeAudit.passed ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" : "bg-red-50 text-red-700 border-red-200 text-[10px]"}>
                              {selectedAppAptitudeAudit.passed ? "PASSED" : "FAILED"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Candidate: {selectedAppProgress.application.candidate_name} ({selectedAppProgress.application.candidate_email})
                        </p>
                      </div>
                    </div>

                    {selectedAppAptitudeAudit && (
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <div className="text-xs text-slate-400 font-mono">Cutoff: {selectedAppAptitudeAudit.cutoff}%</div>
                          <div className="text-lg font-black text-blue-700 dark:text-blue-400 font-mono">
                            {selectedAppAptitudeAudit.score.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {isLoadingAptitudeAudit ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">
                      Loading candidate aptitude audit records...
                    </div>
                  ) : selectedAppAptitudeAudit ? (
                    <div className="flex flex-col gap-5">
                      {/* KPI Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Normalized Score</span>
                          <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {selectedAppAptitudeAudit.score.toFixed(1)} / 100
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {selectedAppAptitudeAudit.passed ? 'Met cutoff requirement' : 'Below cutoff threshold'}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Time Taken</span>
                          <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {Math.floor((selectedAppAptitudeAudit.time_spent_seconds || 0) / 60)}m {(selectedAppAptitudeAudit.time_spent_seconds || 0) % 60}s
                          </span>
                          <span className="text-[10px] text-slate-500">Server verified timing</span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Proctoring Signals</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {selectedAppAptitudeAudit.tab_switches || 0}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">switches</span>
                          </div>
                          <span className={`text-[10px] font-medium ${
                            (selectedAppAptitudeAudit.tab_switches || 0) > aptitudeConfig.tab_switch_limit
                              ? 'text-red-600 dark:text-red-400 font-bold'
                              : 'text-slate-500'
                          }`}>
                            {(selectedAppAptitudeAudit.tab_switches || 0) > aptitudeConfig.tab_switch_limit
                              ? `Exceeded limit (${aptitudeConfig.tab_switch_limit})`
                              : `Within limit (${aptitudeConfig.tab_switch_limit})`}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Questions Evaluated</span>
                          <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {selectedAppAptitudeAudit.questions?.length || 0} Total
                          </span>
                          <span className="text-[10px] text-slate-500">Across 3 core sections</span>
                        </div>
                      </div>

                      {/* Section Scores Breakdown */}
                      {selectedAppAptitudeAudit.section_scores && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Section-Wise Calibration & Accuracy
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {Object.entries(selectedAppAptitudeAudit.section_scores).map(([sec, data]) => (
                              <div key={sec} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{sec}</span>
                                  <span className="text-xs font-bold font-mono text-blue-700 dark:text-blue-400">
                                    {data.score.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-700 dark:bg-blue-500 rounded-full"
                                    style={{ width: `${Math.min(100, Math.max(0, data.score))}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {data.correct} of {data.total} correct
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Question-by-Question Audit Table */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <FileCheck2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                            <span>Question-by-Question Response Audit ({selectedAppAptitudeAudit.questions?.length || 0})</span>
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Click question to inspect options and explanation
                          </span>
                        </div>

                        <div className="flex flex-col gap-2">
                          {selectedAppAptitudeAudit.questions?.map((q, qIdx) => {
                            const isAnswered = q.candidate_answer !== null;
                            const isExpanded = expandedQuestionId === q.question_id;

                            return (
                              <div
                                key={q.question_id}
                                className={`rounded-lg border transition-all text-xs ${
                                  q.is_correct
                                    ? 'bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                    : !isAnswered
                                    ? 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                                    : 'bg-red-50/20 dark:bg-red-950/20 border-red-200 dark:border-red-800/60'
                                }`}
                              >
                                <div
                                  onClick={() => setExpandedQuestionId(isExpanded ? null : q.question_id)}
                                  className="p-3 flex items-start justify-between gap-3 cursor-pointer select-none"
                                >
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                      {qIdx + 1}
                                    </span>
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium bg-white dark:bg-slate-900">
                                          {q.section}
                                        </Badge>
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium capitalize bg-white dark:bg-slate-900">
                                          {q.difficulty}
                                        </Badge>
                                      </div>
                                      <p className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                                        {q.question_text}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {q.is_correct ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-semibold text-[10px]">
                                        <Check className="w-3 h-3" /> Correct
                                      </span>
                                    ) : !isAnswered ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                                        Unattempted
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 font-semibold text-[10px]">
                                        <X className="w-3 h-3" /> Incorrect
                                      </span>
                                    )}
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="p-3 pt-0 border-t border-slate-200/60 dark:border-slate-800/60 mt-1 flex flex-col gap-2.5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                      {q.options.map((opt, optIdx) => {
                                        const isCandidateChoice = q.candidate_answer === opt;
                                        const isCorrectChoice = q.correct_answer === opt;

                                        return (
                                          <div
                                            key={optIdx}
                                            className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                              isCorrectChoice
                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 font-semibold text-emerald-900 dark:text-emerald-100'
                                                : isCandidateChoice
                                                ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 font-semibold text-red-900 dark:text-red-100'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}
                                          >
                                            <span className="truncate">{opt}</span>
                                            <div className="flex items-center gap-1 shrink-0">
                                              {isCandidateChoice && (
                                                <Badge className="text-[9px] px-1 py-0 bg-blue-700 text-white">
                                                  Candidate Choice
                                                </Badge>
                                              )}
                                              {isCorrectChoice && (
                                                <Badge className="text-[9px] px-1 py-0 bg-emerald-700 text-white">
                                                  Correct Answer
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {q.explanation && (
                                      <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 rounded border border-blue-200/80 dark:border-blue-800/60 text-[11px] text-blue-900 dark:text-blue-300">
                                        <strong>Explanation:</strong> {q.explanation}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2">
                      <Brain className="w-8 h-8 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        No Round 2 Aptitude Record Available
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-md">
                        This candidate has not attempted Round 2 yet, or sequential gating has not yet unlocked Round 2 for this application. Once the candidate starts the test, live answers and proctoring telemetry will populate here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OVERRIDE AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Recruiter Override Audit Trail
              </h3>
              <span className="text-xs font-mono text-slate-500">{overrides.length} Events Logged</span>
            </div>

            {overrides.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No manual overrides recorded. Gating runs strictly on automated cutoff evaluations.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {overrides.map(ovr => (
                  <div
                    key={ovr.override_id}
                    className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold ${
                          ovr.action === 'promote'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : ovr.action === 'allow_retake'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {ovr.action}
                        </Badge>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{ovr.candidate_email}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Reason: <span className="italic text-slate-700 dark:text-slate-300">"{ovr.reason}"</span>
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      <p className="text-slate-700 dark:text-slate-300 font-semibold">{ovr.overridden_by}</p>
                      <p>{new Date(ovr.overridden_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Recruiter Override Modal */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Confirm Recruiter Override: {overrideTarget.action.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-500">
              This action will bypass automated cutoff evaluation and will be permanently logged in the audit trail.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Business Justification & Reason *
              </label>
              <textarea
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Verified exceptional portfolio project compensating for test score..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-700 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOverrideTarget(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteOverride}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs"
              >
                Confirm & Log Override
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
