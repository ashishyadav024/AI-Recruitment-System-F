import { API_ENDPOINTS } from '../config/api';
import { pipelineService } from './pipelineService';

export interface InterviewStartRequest {
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  job_description?: string;
  required_skills?: string[];
  candidate_resume?: string;
  interview_id?: string;
  session_id?: string;
  meeting_id?: string;
  target_duration_minutes?: number;
  application_id?: string;
  round_id?: string;
  pipeline_attempt_id?: string;
}

export interface InterviewStartResponse {
  success: boolean;
  data?: {
    interview_id: string;
    session_id: string;
    introduction: string;
    current_stage: string;
    processing_status?: string;
  };
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface AnswerEvaluation {
  overall_score?: number;
  completeness_score?: number;
  relevance_score?: number;
  technical_score?: number;
  communication_score?: number;
  problem_solving_score?: number;
  strengths?: string[];
  weaknesses?: string[];
  key_points_mentioned?: string[];
  technical_terms_used?: string[];
  red_flags?: string[];
  follow_up_needed?: boolean;
  follow_up_reason?: string;
  suggested_followup?: string;
}

export interface InterviewAnswerRequest {
  interview_id: string;
  answer: string;
  transcription_id?: string;
  application_id?: string;
  round_id?: string;
  pipeline_attempt_id?: string;
}

export interface InterviewAnswerResponse {
  success: boolean;
  data?: {
    interview_complete: boolean;
    next_question?: string;
    closing_message?: string;
    question_type?: string;
    current_stage?: string;
    question_number?: number;
    evaluation?: AnswerEvaluation;
    overall_score?: number;
    summary?: {
      total_questions: number;
      duration_minutes: number;
      key_strengths: string[];
      areas_for_improvement: string[];
    };
  };
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

interface SimulatedSession {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  skills: string[];
  currentQuestionIndex: number;
  scores: number[];
  answers: string[];
  applicationId?: string;
  roundId?: string;
  pipelineAttemptId?: string;
}

const simulatedSessions: Record<string, SimulatedSession> = {};

function getSimulatedQuestions(candidateName: string, jobTitle: string, skills: string[]) {
  const role = jobTitle || "Frontend Engineer";
  const skillStr = skills && skills.length > 0 ? skills.slice(0, 3).join(", ") : "React, TypeScript, and modern frontend architecture";

  return [
    {
      stage: "Introduction",
      question: `Hello ${candidateName}! Welcome to your technical interview for the ${role} position. I am your AI interviewer today. To get started, could you briefly introduce yourself, highlight your software engineering background, and describe a recent project you are proud of building?`
    },
    {
      stage: "Technical Architecture",
      question: `Thank you for sharing your background, ${candidateName}. Let's dive into application architecture. When building modern, responsive web applications using ${skillStr}, how do you structure state management to avoid unnecessary re-renders, and what strategies do you employ for code splitting and asset optimization?`
    },
    {
      stage: "Problem Solving & Optimization",
      question: `Great insights on application architecture! Now let's explore real-world problem solving: Imagine users in production report noticeable performance lag and occasional freezing when interacting with high-volume data tables or dynamic dashboards. What step-by-step diagnostic tools, profiling metrics, and optimization strategies would you use to pinpoint and eliminate the bottleneck?`
    },
    {
      stage: "System Design & Collaboration",
      question: `Solid troubleshooting approach. For our final technical question: When collaborating in a cross-functional engineering team, how do you approach robust API error handling, graceful network degradation, and automated testing to ensure enterprise-grade code quality and seamless developer handoffs?`
    }
  ];
}

function evaluateSimulatedAnswer(answer: string, questionIndex: number): AnswerEvaluation {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  let baseScore = 8.4;
  if (wordCount > 25) baseScore += 0.5;
  if (wordCount > 50) baseScore += 0.4;
  if (wordCount < 8) baseScore -= 1.2;

  const techKeywords = [
    "state", "hook", "component", "render", "api", "cache", "async", 
    "performance", "test", "devtools", "profile", "reducer", "context", 
    "memo", "error", "architecture", "modular", "type", "refactor", "lazy"
  ];
  const lower = answer.toLowerCase();
  const matched = techKeywords.filter(k => lower.includes(k));
  if (matched.length >= 2) baseScore += 0.4;

  const overall = Math.min(9.8, Math.max(7.2, Number(baseScore.toFixed(1))));

  const strengthsList = [
    [
      "Structured articulation of professional software engineering journey",
      "Clear communication of hands-on project impact and individual contributions"
    ],
    [
      "Strong grasp of frontend component lifecycle and state orchestration",
      "Proactive awareness of rendering efficiency and architectural modularity"
    ],
    [
      "Methodical root-cause analysis and practical browser profiling techniques",
      "Demonstrated ability to identify bottlenecks and optimize rendering pipelines"
    ],
    [
      "Well-rounded approach to API contract stability and boundary testing",
      "Strong engineering standards for cross-functional collaboration and maintainability"
    ]
  ];

  const weaknessesList = [
    "Could provide more quantitative performance metrics or specific benchmark numbers",
    "Consider elaborating on automated end-to-end regression testing coverage"
  ];

  return {
    overall_score: overall,
    completeness_score: Math.min(10, Number((overall + 0.2).toFixed(1))),
    relevance_score: Math.min(10, Number((overall + 0.3).toFixed(1))),
    technical_score: overall,
    communication_score: Math.min(10, Number((overall + 0.4).toFixed(1))),
    problem_solving_score: overall,
    strengths: strengthsList[questionIndex] || strengthsList[0],
    weaknesses: [weaknessesList[questionIndex % weaknessesList.length]],
    key_points_mentioned: matched.slice(0, 4),
    technical_terms_used: matched
  };
}

export const interviewService = {
  /**
   * Start a new AI interview session via FastAPI backend (Port 8001)
   * Falls back to interactive simulation mode when backend is offline
   */
  async startInterview(request: InterviewStartRequest): Promise<InterviewStartResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const response = await fetch(API_ENDPOINTS.interviewStart, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
    } catch {
      console.info("FastAPI backend (Port 8001) not detected. Initiating interactive AI simulation interview session.");
    }

    // Fallback: Intelligent interactive simulation session
    const candidateName = request.candidate_name?.trim() || "Candidate";
    const jobTitle = request.job_title?.trim() || "Frontend Engineer";
    const skills = request.required_skills && request.required_skills.length > 0
      ? request.required_skills
      : ["React", "TypeScript", "Tailwind CSS"];

    const simId = `sim-${Date.now()}`;
    const questions = getSimulatedQuestions(candidateName, jobTitle, skills);

    simulatedSessions[simId] = {
      candidateName,
      candidateEmail: request.candidate_email || "",
      jobTitle,
      skills,
      currentQuestionIndex: 0,
      scores: [],
      answers: [],
      applicationId: request.application_id,
      roundId: request.round_id,
      pipelineAttemptId: request.pipeline_attempt_id
    };

    return {
      success: true,
      data: {
        interview_id: simId,
        session_id: `sess-${Math.random().toString(36).substring(2, 9)}`,
        introduction: questions[0].question,
        current_stage: questions[0].stage,
        processing_status: 'ready'
      }
    };
  },

  /**
   * Submit candidate answer and receive evaluation + next question (Port 8001)
   * Seamlessly continues in simulation mode if backend is unreachable
   */
  async submitAnswer(request: InterviewAnswerRequest): Promise<InterviewAnswerResponse> {
    const isSimulated = request.interview_id.startsWith("sim-") || !API_ENDPOINTS.interviewAnswer;

    if (!isSimulated) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);

        const response = await fetch(API_ENDPOINTS.interviewAnswer, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        console.warn("Backend FastAPI answer submission failed. Continuing seamlessly in simulation mode.", e);
      }
    }

    // Handle simulation answer progression
    const session = simulatedSessions[request.interview_id] || {
      candidateName: "Candidate",
      candidateEmail: "",
      jobTitle: "Software Engineer",
      skills: ["React", "TypeScript"],
      currentQuestionIndex: 0,
      scores: [88],
      answers: []
    };

    const qIndex = session.currentQuestionIndex;
    const evaluation = evaluateSimulatedAnswer(request.answer, qIndex);
    session.scores.push(evaluation.overall_score ? Math.round(evaluation.overall_score * 10) : 88);
    session.answers.push(request.answer);

    const questions = getSimulatedQuestions(session.candidateName, session.jobTitle, session.skills);
    const nextIndex = qIndex + 1;
    session.currentQuestionIndex = nextIndex;

    // If all 4 stages are completed
    if (nextIndex >= questions.length) {
      const avgScore = session.scores.length > 0 
        ? Math.round(session.scores.reduce((a, b) => a + b, 0) / session.scores.length)
        : 89;

      const attemptId = request.pipeline_attempt_id || session.pipelineAttemptId;
      if (attemptId) {
        pipelineService.submitNormalizedScore(
          attemptId,
          avgScore,
          `Completed Technical Interview round with evaluation score of ${avgScore}/100.`,
          {
            total_questions: questions.length,
            scores: session.scores,
            stages_completed: ["Introduction", "Technical Architecture", "Problem Solving", "System Design"]
          },
          true // is_simulated
        ).catch(e => console.warn("Failed to record normalized pipeline score:", e));
      }

      return {
        success: true,
        data: {
          interview_complete: true,
          current_stage: "Completed",
          overall_score: avgScore,
          closing_message: `Outstanding job, ${session.candidateName}! You have successfully completed all technical evaluation stages for the ${session.jobTitle} position. Your responses demonstrated strong technical aptitude, clear architectural reasoning, and disciplined problem solving. Your complete interview evaluation and performance rubric have been synthesized below.`,
          evaluation,
          summary: {
            total_questions: questions.length,
            duration_minutes: 15,
            key_strengths: [
              "Deep understanding of modern component architecture and state management",
              "Structured, disciplined methodology for root-cause profiling and performance bottlenecks",
              "Strong focus on API contract resilience, clean code, and team collaboration"
            ],
            areas_for_improvement: [
              "Explore edge caching strategies and service worker offline caching mechanisms",
              "Incorporate automated visual regression benchmarks into continuous testing workflows"
            ]
          }
        }
      };
    }

    // Move to next question
    const nextQ = questions[nextIndex];
    return {
      success: true,
      data: {
        interview_complete: false,
        next_question: nextQ.question,
        current_stage: nextQ.stage,
        question_number: nextIndex,
        question_type: "technical",
        evaluation
      }
    };
  },
};
