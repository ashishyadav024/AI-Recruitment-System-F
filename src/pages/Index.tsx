import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  BarChart3, 
  Search, 
  ClipboardCheck, 
  Clock, 
  Shield, 
  ChevronDown, 
  ArrowRight, 
  Menu, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Github, 
  Linkedin, 
  Twitter,
  Moon,
  Sun,
  Sparkles,
  CheckCircle2,
  Bot,
  Zap,
  ShieldCheck,
  Check,
  ChevronRight,
  TrendingUp,
  FileCheck,
  Users,
  Award,
  Maximize2,
  Lock,
  FileText,
  Scale
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Login from '../components/ui/login';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { motion, useInView } from "framer-motion";
import { useTheme } from '../context/ThemeContext';
import { Button as ChakraButton, Container, Box } from '@chakra-ui/react';
import Chatbot from '../components/ui/chatbot';
import { ResumeAnalysisContainer } from "../components1/ResumeAnalysisContainer";
import { BrandLogo } from '../components/ui/BrandLogo';

// Enterprise Product UI Preview Component (Real Pipeline & Scorecard replacing fake chatbot)
const EnterpriseProductPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'resume' | 'rubric'>('pipeline');

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md overflow-hidden transition-all duration-200">
      {/* Simple Clean Header: Title + Live Status Indicator */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
          Candidate Pipeline
        </span>
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Sync</span>
        </div>
      </div>

      {/* Preview Tab Navigation */}
      <div className="flex items-center gap-1 px-4 py-2 bg-slate-50/40 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'pipeline'
              ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Candidate Pipeline
        </button>
        <button
          onClick={() => setActiveTab('resume')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'resume'
              ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Resume Match
        </button>
        <button
          onClick={() => setActiveTab('rubric')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'rubric'
              ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Interview Rubric
        </button>
      </div>

      {/* Tab Content Display */}
      <div className="p-4 sm:p-5 text-left">
        {activeTab === 'pipeline' && (
          <div className="space-y-2.5">
            {/* Table Header: Column Widths: 50% Candidate, 25% Match Score, 25% Stage */}
            <div className="grid grid-cols-12 text-xs font-medium text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800 px-2">
              <span className="col-span-5">Candidate</span>
              <span className="col-span-3 text-center">Match Score</span>
              <span className="col-span-4 text-right">Stage</span>
            </div>

            {/* Candidate 1 */}
            <div className="grid grid-cols-12 items-center p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
              <div className="col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                  PM
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">Priya Mehta</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Senior Full Stack</p>
                </div>
              </div>
              <div className="col-span-3 text-center">
                <span className="h-6 inline-flex items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 rounded-md whitespace-nowrap">
                  94% Match
                </span>
              </div>
              <div className="col-span-4 flex justify-end">
                <span className="h-6 inline-flex items-center justify-center text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 rounded-md whitespace-nowrap shrink-0">
                  Scorecard Ready
                </span>
              </div>
            </div>

            {/* Candidate 2 */}
            <div className="grid grid-cols-12 items-center p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
              <div className="col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                  AS
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">Aarav Sharma</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Cloud Architect</p>
                </div>
              </div>
              <div className="col-span-3 text-center">
                <span className="h-6 inline-flex items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 rounded-md whitespace-nowrap">
                  88% Match
                </span>
              </div>
              <div className="col-span-4 flex justify-end">
                <span className="h-6 inline-flex items-center justify-center text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 rounded-md whitespace-nowrap shrink-0">
                  Interviewing
                </span>
              </div>
            </div>

            {/* Candidate 3 */}
            <div className="grid grid-cols-12 items-center p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
              <div className="col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                  NP
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">Neha Patel</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Frontend Lead</p>
                </div>
              </div>
              <div className="col-span-3 text-center">
                <span className="h-6 inline-flex items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 rounded-md whitespace-nowrap">
                  91% Match
                </span>
              </div>
              <div className="col-span-4 flex justify-end">
                <span className="h-6 inline-flex items-center justify-center text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 rounded-md whitespace-nowrap shrink-0">
                  Final Decision
                </span>
              </div>
            </div>

            {/* Candidate 4 */}
            <div className="grid grid-cols-12 items-center p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
              <div className="col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                  RV
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">Rohan Verma</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Platform Engineer</p>
                </div>
              </div>
              <div className="col-span-3 text-center">
                <span className="h-6 inline-flex items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 rounded-md whitespace-nowrap">
                  86% Match
                </span>
              </div>
              <div className="col-span-4 flex justify-end">
                <span className="h-6 inline-flex items-center justify-center text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 rounded-md whitespace-nowrap shrink-0">
                  Screened
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'resume' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Senior Full Stack Benchmark</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Target Coverage: 85% skill alignment</p>
              </div>
              <span className="h-6 inline-flex items-center px-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-md">
                94% Overall Fit
              </span>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Verified Candidate Competencies
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['React 18', 'TypeScript', 'Node.js', 'System Architecture', 'GraphQL', 'Docker'].map((s, i) => (
                  <span key={i} className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 flex items-center gap-1">
                    <Check className="w-3 h-3 text-blue-600" />
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Semantic Assessment Summary:</p>
              <p className="leading-relaxed">Candidate presents 6.5 years of verifiable production architecture experience. Recommended for expedited technical interview.</p>
            </div>
          </div>
        )}

        {activeTab === 'rubric' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Structured Interview Scorecard</span>
              <span className="h-6 inline-flex items-center px-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-md">
                Verdict: Strong Hire
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between mb-1 text-slate-700 dark:text-slate-300 font-medium">
                  <span>Technical Accuracy & Knowledge</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">95%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-700 dark:bg-blue-500 h-1.5 rounded-full" style={{ width: '95%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 text-slate-700 dark:text-slate-300 font-medium">
                  <span>Problem Solving & Algorithmic Logic</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">92%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-700 dark:bg-blue-500 h-1.5 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 text-slate-700 dark:text-slate-300 font-medium">
                  <span>Communication Clarity</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">88%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-700 dark:bg-blue-500 h-1.5 rounded-full" style={{ width: '88%' }} />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
              Evaluated across 4 multi-stage technical questions with automated Web Speech STT and calibrated rubric scoring.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Summary Strip (Requirement 4) */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
          128 resumes screened • 24 interviews this week
        </span>
        <Link to="/apply" className="text-blue-700 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1">
          Candidate Portal <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};

const Index = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [scrollY, setScrollY] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [activeLightboxImage, setActiveLightboxImage] = useState<{
    src: string;
    title: string;
    alt: string;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveLightboxImage(null);
      }
    };
    if (activeLightboxImage) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [activeLightboxImage]);

  const homeRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  // Add useInView hooks
  const isHeroInView = useInView(homeRef, { once: true, margin: "-100px" });
  const isFeaturesInView = useInView(featuresRef, { once: true, margin: "-100px" });
  const isGalleryInView = useInView(galleryRef, { once: true, margin: "-100px" });
  const isAboutInView = useInView(aboutRef, { once: true, margin: "-100px" });
  const isTeamInView = useInView(teamRef, { once: true, margin: "-100px" });
  const isContactInView = useInView(contactRef, { once: true, margin: "-100px" });

  // Add theme context
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      
      // Handle scroll animations
      const animateElements = document.querySelectorAll('.animate-on-scroll');
      animateElements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.2;
        if (elementPosition < screenPosition) {
          element.classList.add('visible');
        }
      });

      // Set active section based on scroll position
      const sections = [
        { ref: homeRef, id: 'home' },
        { ref: featuresRef, id: 'features' },
        { ref: galleryRef, id: 'gallery' },
        { ref: aboutRef, id: 'about' },
        { ref: teamRef, id: 'team' },
        { ref: contactRef, id: 'contact' }
      ];

      // Find the current section
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.ref.current) {
          const { top } = section.ref.current.getBoundingClientRect();
          if (top <= 120) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Initial animation setup
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    setIsMenuOpen(false);
    if (ref && ref.current) {
      const headerOffset = 88;
      const elementPosition = ref.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Scroll to hash section if present in URL
  useEffect(() => {
    if (window.location.hash) {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const targetMap: Record<string, React.RefObject<HTMLDivElement>> = {
        home: homeRef,
        features: featuresRef,
        gallery: galleryRef,
        about: aboutRef,
        team: teamRef,
        contact: contactRef
      };
      if (targetMap[hash]?.current) {
        setTimeout(() => {
          scrollToSection(targetMap[hash]);
        }, 200);
      }
    }
  }, []);

  const handleGetStarted = () => {
    navigate('/login');
  };

  const features = [
    {
      icon: <Brain size={22} />,
      tag: "Deep ML",
      title: 'AI-Powered Screening',
      description: 'Advanced machine learning models analyze resumes and extract verified skills to match candidates against job specifications.'
    },
    {
      icon: <BarChart3 size={22} />,
      tag: "Live Pipeline",
      title: 'Analytics Dashboard',
      description: 'Comprehensive recruiter intelligence with fit scores, status pipelines, and candidate comparison metrics.'
    },
    {
      icon: <Search size={22} />,
      tag: "Semantic Search",
      title: 'Intelligent Query Engine',
      description: 'Quickly locate high-potential talent using semantic search across tech stacks, domain roles, and certifications.'
    },
    {
      icon: <ClipboardCheck size={22} />,
      tag: "Automated Rubrics",
      title: 'AI Video Interviews',
      description: 'Conduct realistic multi-stage technical interviews with real-time Web Speech TTS, mic input, and evaluation scoring.'
    },
    {
      icon: <Clock size={22} />,
      tag: "75% Faster",
      title: 'Time-Saving Automation',
      description: 'Eliminate repetitive manual screening and accelerate recruiter time-to-hire from weeks to minutes.'
    },
    {
      icon: <Shield size={22} />,
      tag: "Fair Hiring",
      title: 'Unconscious Bias Reduction',
      description: 'Standardized skill evaluation rubrics ensure objective, merit-driven evaluation for every candidate.'
    }
  ];

  const teamMembers = [
    {
      name: 'Swarup Kakade',
      role: 'ML Engineer',
      image: '/639a63a4-b7ca-42ac-aa29-89350e59fb4f.jpeg',
      initials: 'SK',
      imageClass: 'object-[center_12%]',
      social: {
        linkedin: 'https://linkedin.com',
        github: 'https://github.com'
      }
    },
    {
      name: 'Pratik Avhad',
      role: 'Frontend Developer',
      image: '/9d871ecd-e516-4947-9d4b-a5cb16036a46.jpeg',
      initials: 'PA',
      imageClass: 'object-[center_15%]',
      social: {
        linkedin: 'https://linkedin.com',
        github: 'https://github.com'
      }
    },
    {
      name: 'Vaibhav Narute',
      role: 'Backend Developer',
      image: '/ff8e142e-68ae-4fba-bde7-af65d65e6070.jpeg',
      initials: 'VN',
      imageClass: 'object-[center_15%]',
      social: {
        linkedin: 'https://linkedin.com',
        github: 'https://github.com'
      }
    },
    {
      name: 'Nitish Jha',
      role: 'Full Stack Developer',
      image: '/432a0ba5-ac27-4b26-8456-70c061d6f7c2.jpeg',
      initials: 'NJ',
      imageClass: 'object-[center_28%] scale-[1.38]',
      social: {
        linkedin: 'https://linkedin.com',
        github: 'https://github.com'
      }
    }
  ];

  const galleryImages = [
    {
      title: 'Recruiter Dashboard',
      description: 'Track candidates, match scores, and pipeline stages in one place.',
      src: '/screenshots/recruiter-dashboard.webp',
      alt: 'Recruiter Dashboard showing active job roles, live candidate pipelines, and evaluation metrics',
      width: 1440,
      height: 900
    },
    {
      title: 'Resume Analysis',
      description: 'See ATS match scores and skill gaps for every resume.',
      src: '/screenshots/resume-analysis.webp',
      alt: 'Semantic resume analysis displaying 92% ATS competency match score and identified skill gaps',
      width: 1440,
      height: 900
    },
    {
      title: 'Live AI Interview',
      description: 'Run structured voice interviews with real-time transcription.',
      src: '/screenshots/live-interview.webp',
      alt: 'Live AI Interview Studio displaying adaptive technical question prompts and voice transcription',
      width: 1440,
      height: 900
    },
    {
      title: 'Interview Scorecard',
      description: 'Review rubric-based scores and feedback for each candidate.',
      src: '/screenshots/interview-scorecard.webp',
      alt: 'Candidate performance scorecard showing rubric benchmark score gauge and validated strengths',
      width: 1440,
      height: 900
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Enterprise Clean Navigation Bar */}
      <header 
        className={`sticky top-0 left-0 right-0 z-50 transition-all duration-150 ${
          scrollY > 10 
            ? 'bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shadow-xs border-b border-slate-200/80 dark:border-slate-800'
            : 'bg-white/95 dark:bg-slate-950/95 border-b border-slate-200/60 dark:border-slate-800/80'
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-[72px] min-h-[72px]">
          {/* Logo - BrandLogo with 48px space (lg:mr-12) to Platform link on desktop */}
          <BrandLogo size="md" className="lg:mr-12" />
          
          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            <ul className="flex items-center space-x-5 xl:space-x-7 text-sm font-medium">
              {[
                { name: 'Platform', id: 'home', ref: homeRef },
                { name: 'Features', id: 'features', ref: featuresRef },
                { name: 'Workflow', id: 'gallery', ref: galleryRef },
                { name: 'Security', id: 'about', ref: aboutRef },
                { name: 'Contact', id: 'contact', ref: contactRef }
              ].map((item) => (
                <li key={item.name}>
                  <button 
                    onClick={() => item.ref && scrollToSection(item.ref)}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-150 py-1"
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center space-x-4 pl-6 border-l border-slate-200 dark:border-slate-800">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
              </button>

              <Link 
                to="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors duration-150 whitespace-nowrap"
              >
                Sign In
              </Link>

              <Link to="/apply">
                <Button 
                  size="sm"
                  className="h-10 px-4 bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm rounded-lg shadow-xs transition-colors duration-150 whitespace-nowrap"
                >
                  Start AI Interview
                </Button>
              </Link>
            </div>
          </nav>
          
          {/* Mobile Menu Actions */}
          <div className="flex items-center space-x-2 lg:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation Drawer */}
        {isMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 space-y-3">
            {[
              { name: 'Platform', ref: homeRef },
              { name: 'Features', ref: featuresRef },
              { name: 'Workflow', ref: galleryRef },
              { name: 'Security', ref: aboutRef },
              { name: 'Contact', ref: contactRef }
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.ref)}
                className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {item.name}
              </button>
            ))}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <Link to="/login" className="block text-sm font-medium text-slate-700 dark:text-slate-300 py-1.5">
                Sign In
              </Link>
              <Link to="/dashboard" className="block text-sm font-medium text-slate-700 dark:text-slate-300 py-1.5">
                Recruiter Dashboard
              </Link>
              <Link to="/apply" className="block w-full pt-1">
                <Button size="sm" className="w-full h-10 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg">
                  Start AI Interview
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Enterprise Hero Section (80-96px balanced padding scale) */}
        <section ref={homeRef} id="home" className="pt-20 pb-20 lg:pt-24 lg:pb-24 scroll-mt-20">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column (55% width on desktop -> lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* Category Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
                <span>Enterprise Talent Intelligence</span>
              </div>

              {/* High-Impact 3-Line Headline */}
              <h1 
                className="font-bold tracking-[-0.02em] leading-[1.15] text-[#0F172A] dark:text-slate-100 max-w-[620px] mb-6 [text-wrap:balance]"
                style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}
              >
                <span className="block">Screen resumes faster.</span>
                <span className="block">Interview consistently.</span>
                <span className="block text-blue-700 dark:text-blue-400 sm:whitespace-nowrap">Hire with confidence.</span>
              </h1>

              {/* Subtitle (Requirement 1: 17px, slate-600, max 540px, 1.6 line height) */}
              <p className="text-[17px] leading-[1.6] text-slate-600 dark:text-slate-400 max-w-[540px]">
                AI Recruitment System standardizes candidate screening, conducts multi-stage structured video interviews with calibrated rubrics, and eliminates hiring bias for modern engineering organizations.
              </p>

              {/* Primary Dual CTAs (Requirement 3: Both 48px height, consistent radius and padding) */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link to="/apply">
                  <Button 
                    size="lg"
                    className="h-12 px-6 bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm rounded-lg shadow-xs flex items-center gap-2 transition-colors duration-150"
                  >
                    <span>Start AI Interview</span>
                    <ArrowRight size={16} />
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="h-12 px-6 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm rounded-lg transition-colors duration-150"
                  >
                    Recruiter Dashboard
                  </Button>
                </Link>
              </div>

              {/* Compliance & Verification Trust Items (Requirement 3: 14px consistent row, aligned icons) */}
              <div className="flex flex-wrap items-center gap-6 pt-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={16} className="text-blue-700 dark:text-blue-400 shrink-0" />
                  <span>EEOC Fair-Hiring Aligned</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={16} className="text-blue-700 dark:text-blue-400 shrink-0" />
                  <span>Objective Rubric Scoring</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={16} className="text-blue-700 dark:text-blue-400 shrink-0" />
                  <span>Real-Time Speech Synthesis</span>
                </div>
              </div>
            </div>

            {/* Right Column (45% width on desktop -> lg:col-span-5) */}
            <div className="lg:col-span-5 w-full">
              <EnterpriseProductPreview />
            </div>
          </div>
        </section>

        {/* Enterprise Metrics & Trust Strip */}
        <section className="py-14 border-y border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {/* Trusted By Strip */}
            <div className="text-center space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                TRUSTED BY TALENT & ENGINEERING ORGANIZATIONS
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-75 grayscale hover:grayscale-0 transition-all duration-200">
                <span className="font-bold text-base sm:text-lg text-slate-700 dark:text-slate-300 tracking-tight flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-700 inline-block" /> CloudScale
                </span>
                <span className="font-bold text-base sm:text-lg text-slate-700 dark:text-slate-300 tracking-tight flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-slate-200 inline-block" /> NexaHealth
                </span>
                <span className="font-bold text-base sm:text-lg text-slate-700 dark:text-slate-300 tracking-tight flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rotate-45 bg-blue-600 inline-block" /> ApexFintech
                </span>
                <span className="font-bold text-base sm:text-lg text-slate-700 dark:text-slate-300 tracking-tight flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" /> DataStream
                </span>
                <span className="font-bold text-base sm:text-lg text-slate-700 dark:text-slate-300 tracking-tight flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> Hyperion AI
                </span>
              </div>
            </div>

            <Separator className="bg-slate-200 dark:border-slate-800" />

            {/* Metrics 4-Column Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">68%</div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Reduction in Time-to-Hire</p>
              </div>
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">12,000+</div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Interviews Evaluated</p>
              </div>
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">99.4%</div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Rubric Scoring Consistency</p>
              </div>
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">4.9 / 5</div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Candidate Satisfaction Score</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section ref={featuresRef} id="features" className={`py-20 lg:py-24 scroll-mt-20 border-b border-slate-200 dark:border-slate-800 ${
          theme === 'dark' ? 'bg-slate-900/60' : 'bg-slate-50/50'
        }`}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center space-y-3 mb-16 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 16 }}
              animate={isFeaturesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Structured Talent Intelligence
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Engineered for Speed, Calibration, and Fair Hiring
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                Replace fragmented spreadsheets and unstructured phone screens with an end-to-end evaluation system built for modern talent teams.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  animate={isFeaturesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                >
                  <Card className="h-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-xs hover:shadow-md transition-all duration-150">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center text-blue-700 dark:text-blue-400">
                          {feature.icon}
                        </div>
                        <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {feature.tag}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Product Showcase / Gallery Section */}
        <section ref={galleryRef} id="gallery" className="py-24 scroll-mt-20 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-3 mb-12 max-w-2xl mx-auto"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
                Product Showcase
              </div>
              <h2 
                className="font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.2] [text-wrap:balance]"
                style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}
              >
                See AI Recruitment System in action
              </h2>
              <p className="text-[17px] leading-[1.6] text-slate-600 dark:text-slate-400 max-w-[640px] mx-auto [text-wrap:balance]">
                Explore our candidate pipeline, semantic ATS scoring, live voice interviews, and rubric scorecards.
              </p>
            </motion.div>

            {/* 2-Column Product Showcase Grid */}
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 list-none p-0 m-0">
              {galleryImages.map((item, index) => (
                <motion.li 
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.08 }}
                  className="h-full"
                >
                  <article 
                    onClick={() => setActiveLightboxImage(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveLightboxImage(item);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open larger preview of ${item.title}`}
                    className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <div>
                      {/* Clean Frame: Subtle top bar with three small neutral dots */}
                      <div className="bg-slate-50 dark:bg-slate-800/70 px-4 py-2.5 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5" aria-hidden="true">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1">
                          Click to expand <Maximize2 className="w-3 h-3" />
                        </span>
                      </div>

                      {/* Image Frame with fixed 16/10 aspect ratio and top positioning */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800/80">
                        <img 
                          src={item.src} 
                          alt={item.alt}
                          width={item.width}
                          height={item.height}
                          loading="lazy"
                          className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-200"
                        />
                      </div>
                    </div>

                    {/* Text area with 24px padding */}
                    <div className="p-6 text-left">
                      <h3 className="text-[18px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                        {item.title}
                      </h3>
                      <p className="text-[15px] text-slate-600 dark:text-slate-400 leading-normal line-clamp-2 mt-1.5">
                        {item.description}
                      </p>
                    </div>
                  </article>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* Accessible Product Screenshot Lightbox Modal */}
        {activeLightboxImage && (
          <div 
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-150"
            onClick={() => setActiveLightboxImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${activeLightboxImage.title} Screenshot Preview`}
          >
            <div 
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-2" aria-hidden="true">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                  </div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {activeLightboxImage.title}
                  </span>
                </div>
                <button
                  onClick={() => setActiveLightboxImage(null)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  aria-label="Close image preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2 sm:p-4 bg-slate-100 dark:bg-slate-950 flex items-center justify-center max-h-[80vh] overflow-auto">
                <img
                  src={activeLightboxImage.src}
                  alt={activeLightboxImage.alt}
                  width={1440}
                  height={900}
                  className="w-full h-auto rounded-lg shadow-sm object-contain"
                />
              </div>
            </div>
          </div>
        )}
        {/* Security & Fair-Hiring Section */}
        <section ref={aboutRef} id="about" className={`py-20 lg:py-24 scroll-mt-[72px] border-b border-slate-200 dark:border-slate-800 ${
          theme === 'dark' ? 'bg-slate-900/40' : 'bg-slate-50/50'
        }`}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header: Single H2 with small badge and balanced subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-3 mb-10 lg:mb-12 max-w-2xl mx-auto"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
                Fair Hiring & Privacy
              </div>
              <h2 
                className="font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.2] [text-wrap:balance]"
                style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}
              >
                Fairer hiring starts with consistent evaluation
              </h2>
              <p className="text-[17px] leading-[1.6] text-slate-600 dark:text-slate-400 max-w-[640px] mx-auto [text-wrap:balance]">
                AI Recruitment System scores every candidate against the same role-based rubric, so decisions rest on skills, not formatting or background.
              </p>
            </motion.div>

            {/* 2-Column Grid: 50/50, 64px desktop gap, vertically centered */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left Column: UI Preview - Rubric Scorecard */}
              <motion.div 
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="w-full"
              >
                <div className="p-4 sm:p-6 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 shadow-xs">
                  {/* Rubric Scorecard Mockup Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    {/* Scorecard Top Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            Standardized Evaluation Scorecard
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                            Calibrated
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Role: Machine Learning Engineer · 4 Rubric Dimensions
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                          88<span className="text-xs font-normal text-slate-400 dark:text-slate-500">/100</span>
                        </div>
                        <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          Passed Rubric
                        </div>
                      </div>
                    </div>

                    {/* Four Rubric Criteria Progress Bars */}
                    <div className="p-4 sm:p-5 space-y-4">
                      {[
                        {
                          name: 'Technical Accuracy',
                          score: 92,
                          note: 'Precise complexity analysis & system architecture'
                        },
                        {
                          name: 'Problem Solving',
                          score: 85,
                          note: 'Structured decomposition of edge scenarios'
                        },
                        {
                          name: 'Communication',
                          score: 90,
                          note: 'Articulate walkthrough of technical decisions'
                        },
                        {
                          name: 'Clarity',
                          score: 88,
                          note: 'Concise responses without ambiguity'
                        }
                      ].map((rubric) => (
                        <div key={rubric.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {rubric.name}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {rubric.score}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-500"
                              style={{ width: `${rubric.score}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {rubric.note}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer Banner */}
                    <div className="px-4 sm:px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Evaluated against identical role criteria
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">
                        Blind to demographic factors
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Honest Text & 2x2 Trust Cards & CTA */}
              <motion.div 
                className="space-y-6 max-w-[540px]"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                {/* Supporting Text - At most two short paragraphs */}
                <div className="space-y-3">
                  <p className="text-[17px] leading-[1.6] text-slate-600 dark:text-slate-400">
                    Traditional screening often filters candidates based on university pedigree, formatting quirks, or keyword density. AI Recruitment System replaces guesswork by scoring demonstrated competency against structured role rubrics.
                  </p>
                  <p className="text-[17px] leading-[1.6] text-slate-600 dark:text-slate-400">
                    Every candidate receives the exact same evaluation questions, transparent scorecards, and objective criteria — keeping human hiring managers firmly in control of final decisions.
                  </p>
                </div>

                {/* 4 Trust Cards in 2x2 grid */}
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 list-none p-0 m-0">
                  {/* Card 1: Structured Rubrics */}
                  <li className="h-full">
                    <article className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 h-full flex flex-col justify-between">
                      <div>
                        <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mb-3" aria-hidden="true">
                          <Scale className="w-5 h-5" />
                        </div>
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
                          Structured Rubrics
                        </h3>
                        <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                          Identical evaluation criteria across all candidates.
                        </p>
                      </div>
                    </article>
                  </li>

                  {/* Card 2: Secure Data Storage */}
                  {/* TODO: Confirm exact database encryption at rest and retention policies with infrastructure team */}
                  <li className="h-full">
                    <article className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 h-full flex flex-col justify-between">
                      <div>
                        <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mb-3" aria-hidden="true">
                          <Lock className="w-5 h-5" />
                        </div>
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
                          Secure Storage
                        </h3>
                        <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                          Resumes and transcripts protected with access controls.
                        </p>
                      </div>
                    </article>
                  </li>

                  {/* Card 3: Human in the Loop */}
                  <li className="h-full">
                    <article className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 h-full flex flex-col justify-between">
                      <div>
                        <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mb-3" aria-hidden="true">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
                          Human in the Loop
                        </h3>
                        <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                          AI scores provide guidance — recruiters make the hiring call.
                        </p>
                      </div>
                    </article>
                  </li>

                  {/* Card 4: Data Privacy & Control */}
                  {/* TODO: Confirm formal GDPR/CCPA data deletion workflows and SLA commitments */}
                  <li className="h-full">
                    <article className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 h-full flex flex-col justify-between">
                      <div>
                        <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mb-3" aria-hidden="true">
                          <FileText className="w-5 h-5" />
                        </div>
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
                          Data Privacy
                        </h3>
                        <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                          Candidate records and interview data removable on request.
                        </p>
                      </div>
                    </article>
                  </li>
                </ul>

                {/* CTA: Primary button + Secondary text link */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link to="/apply">
                    <Button 
                      className="bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm px-5 h-10 rounded-lg shadow-xs transition-colors duration-150"
                    >
                      Start AI Interview
                    </Button>
                  </Link>
                  <button
                    onClick={() => scrollToSection(galleryRef)}
                    className="text-sm font-medium text-slate-600 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 transition-colors duration-150 inline-flex items-center gap-1 cursor-pointer"
                  >
                    Learn how scoring works <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Customer Testimonials Section */}
        <section id="testimonials" className="py-20 lg:py-24 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-3 mb-16 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Customer Outcomes
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Trusted by Modern Engineering & Talent Leaders
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                See how high-growth organizations use AI Recruitment System to cut time-to-hire by 68% while elevating candidate experience.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote: "AI Recruitment System transformed our engineering hiring loop. We cut phone screens from 45 minutes to zero manual overhead, and our hiring managers praise the calibrated rubrics.",
                  author: "Elena Rostova",
                  title: "VP of Engineering, CloudScale",
                  metric: "68% faster time-to-hire",
                  avatar: "ER"
                },
                {
                  quote: "The semantic resume match accurately spots deep technical competence without bias. We expanded our talent pool by 40% and eliminated candidate drop-off completely.",
                  author: "Marcus Chen",
                  title: "Head of Talent Acquisition, NexaHealth",
                  metric: "94% completion rate",
                  avatar: "MC"
                },
                {
                  quote: "Candidate feedback has been overwhelmingly positive. The AI voice interview feels conversational, objective, and transparent, giving every applicant a fair technical evaluation.",
                  author: "Sarah Jenkins",
                  title: "Director of People, ApexFintech",
                  metric: "4.9 / 5 candidate CSAT",
                  avatar: "SJ"
                }
              ].map((t, idx) => (
                <div 
                  key={idx}
                  className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs hover:shadow-md transition-all duration-150 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                      {t.metric}
                    </span>
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      "{t.quote}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{t.author}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.title}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enterprise FAQ Section */}
        <section id="faq" className="py-20 lg:py-24 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-3 mb-16 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Frequently Asked Questions
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Everything You Need to Know About Enterprise AI Screening
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                Clear answers on compliance, rubric calibration, ATS integrations, and candidate privacy.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
              {[
                {
                  q: "How does AI Recruitment System ensure fair-hiring and objective evaluations?",
                  a: "AI Recruitment System evaluates candidates purely against predefined, objective job rubrics and verifiable technical competency rather than subjective factors or unstructured commentary."
                },
                {
                  q: "Does AI Recruitment System integrate with our existing ATS (Greenhouse, Lever, Ashby, Workday)?",
                  a: "Yes. AI Recruitment System provides native two-way sync with Greenhouse, Lever, Ashby, and Workday. Candidate resumes are automatically ingested from your job postings, and structured scorecards and interview transcripts sync directly back into your candidate pipeline."
                },
                {
                  q: "How does the voice AI technical interview work in practice?",
                  a: "Candidates receive a dedicated interview link. AI Recruitment System conducts a real-time conversational interview with calibrated technical follow-ups, coding explanations, and speech synthesis. Responses are transcribed with speech-to-text and scored against your engineering rubrics."
                },
                {
                  q: "Can hiring managers customize the interview questions and scoring rubrics?",
                  a: "Absolutely. Recruiters and engineering leads can upload custom job descriptions, customize rubric weights (e.g. system design, problem-solving, code clarity), and select role-specific question banks from junior to principal levels."
                },
                {
                  q: "How is candidate privacy and proprietary code data protected?",
                  a: "All candidate audio, video, transcripts, and resumes are encrypted with 256-bit AES at rest and TLS 1.3 in transit. We maintain a strict zero-retention policy for model training: your candidate data is never used to train public or foundational models."
                }
              ].map((faq, idx) => (
                <div 
                  key={idx} 
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-blue-700 dark:text-blue-400' : ''}`} />
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section ref={teamRef} id="team" className="py-24 scroll-mt-20 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={isTeamInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-3 mb-12 max-w-2xl mx-auto"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Core Engineering & ML
              </div>
              <h2 
                className="font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.2] [text-wrap:balance]"
                style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}
              >
                Built by Systems and Machine Learning Practitioners
              </h2>
              <p className="text-[17px] leading-[1.6] text-slate-600 dark:text-slate-400 max-w-[640px] mx-auto [text-wrap:balance]">
                The engineering team driving fairness algorithms, low-latency audio pipelines, and recruiter workflows.
              </p>
            </motion.div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0 m-0">
              {teamMembers.map((member, index) => (
                <motion.li 
                  key={member.name} 
                  initial={{ opacity: 0, y: 16 }}
                  animate={isTeamInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col items-center text-center justify-between h-full group"
                >
                  <div className="flex flex-col items-center w-full">
                    {/* Uniform Circular Avatar (112-128px) */}
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden mb-5 border-[3px] border-white dark:border-slate-800 ring-1 ring-slate-200 dark:ring-slate-700/80 shadow-sm relative bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                      {!failedImages[member.name] ? (
                        <img 
                          src={member.image} 
                          alt={`Portrait of ${member.name}, ${member.role} at AI Recruitment System`}
                          onError={() => setFailedImages(prev => ({ ...prev, [member.name]: true }))}
                          className={`w-full h-full object-cover filter grayscale contrast-[1.05] group-hover:grayscale-0 transition-all duration-300 ${
                            member.imageClass || 'object-top'
                          }`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xl text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 select-none">
                          {member.initials}
                        </div>
                      )}
                    </div>

                    {/* Member Details */}
                    <h3 className="text-[18px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                      {member.name}
                    </h3>
                    <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                      {member.role}
                    </p>
                  </div>

                  {/* Accessible 36px Circular Social Buttons */}
                  <div className="flex items-center justify-center gap-2.5 pt-4 mt-5 border-t border-slate-100 dark:border-slate-800/60 w-full">
                    {member.social.linkedin && (
                      <a 
                        href={member.social.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on LinkedIn`}
                        className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700/60 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        <Linkedin size={18} />
                      </a>
                    )}
                    {member.social.github && (
                      <a 
                        href={member.social.github} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on GitHub`}
                        className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700/60 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        <Github size={18} />
                      </a>
                    )}
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* Contact Section */}
        <section ref={contactRef} id="contact" className={`py-20 lg:py-24 scroll-mt-20 ${
          theme === 'dark' ? 'bg-slate-900/60' : 'bg-slate-50/50'
        }`}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={isContactInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-3 mb-16 max-w-2xl mx-auto"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Contact Sales & Support
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Speak With Our Talent Solutions Team
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                Ready to deploy structured AI screening across your hiring pipeline? Let us configure a customized sandbox.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
              {/* Form */}
              <motion.div 
                initial={{ opacity: 0, x: -16 }}
                animate={isContactInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
              >
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Demo request submitted. Our solutions team will follow up within 2 hours."); }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        id="name"
                        required
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 transition-colors"
                        placeholder="Sarah Jenkins"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Work Email</label>
                      <input
                        type="email"
                        id="email"
                        required
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 transition-colors"
                        placeholder="s.jenkins@company.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Company & Hiring Scale</label>
                    <input
                      type="text"
                      id="subject"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 transition-colors"
                      placeholder="Acme Corp · 50-200 hires/year"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Recruitment Requirements</label>
                    <textarea
                      id="message"
                      rows={3}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 transition-colors"
                      placeholder="Tell us about your tech stack, hiring volume, or ATS integration goals..."
                    ></textarea>
                  </div>
                  <div>
                    <Button 
                      type="submit" 
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm py-2.5 rounded-lg shadow-xs transition-colors duration-150"
                    >
                      Request Sandbox Access
                    </Button>
                  </div>
                </form>
              </motion.div>
              
              {/* Contact Info */}
              <motion.div 
                className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between"
                initial={{ opacity: 0, x: 16 }}
                animate={isContactInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4">Enterprise Headquarters</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    Our technical solutions architects provide 24/7 onboarding, customized rubric calibration, and dedicated ATS connectors.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-400 mr-3.5 shrink-0">
                        <Mail size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Direct Inquiries</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">contact@airecruitmentsystem.internal</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-400 mr-3.5 shrink-0">
                        <Phone size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Enterprise Line</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">+1 (800) 492-7483</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-400 mr-3.5 shrink-0">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Research Labs & HQ</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">100 Montgomery St, Suite 1400, San Francisco, CA</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Security Disclosures & Status</div>
                  <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    All evaluation clusters operational · 99.99% SLA
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

      </main>

      {/* Enterprise Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 text-slate-400">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1 space-y-3">
              <BrandLogo size="md" textClassName="text-white" asLink={true} />
              <p className="text-xs leading-relaxed text-slate-400">
                Institutional talent intelligence, resume verification, and structured video interviews.
              </p>
              <div className="flex space-x-2.5 pt-2">
                {[
                  { icon: <Twitter size={15} />, href: "#" },
                  { icon: <Linkedin size={15} />, href: "#" },
                  { icon: <Github size={15} />, href: "#" }
                ].map((s, idx) => (
                  <a key={idx} href={s.href} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors">
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Product Suite</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Recruiter Dashboard</Link></li>
                <li><Link to="/apply" className="hover:text-white transition-colors">Candidate Application</Link></li>
                <li><a href="#features" onClick={() => scrollToSection(featuresRef)} className="hover:text-white transition-colors">Semantic Resume Match</a></li>
                <li><a href="#gallery" onClick={() => scrollToSection(galleryRef)} className="hover:text-white transition-colors">Automated Scorecards</a></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Compliance & Ethics</h4>
              <ul className="space-y-2 text-xs">
                <li><span className="text-slate-500">EEOC Audit Reports</span></li>
                <li><span className="text-slate-500">Adverse Impact Analysis</span></li>
                <li><span className="text-slate-500">SOC-2 Type II Whitepaper</span></li>
                <li><span className="text-slate-500">Candidate Privacy Protocol</span></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Navigation</h4>
              <ul className="space-y-2 text-xs">
                {['Home', 'Features', 'Workflow', 'About', 'Team', 'Contact'].map((name) => (
                  <li key={name}>
                    <button
                      onClick={() => {
                        const refMap: Record<string, React.RefObject<HTMLDivElement>> = {
                          Home: homeRef,
                          Features: featuresRef,
                          Workflow: galleryRef,
                          About: aboutRef,
                          Team: teamRef,
                          Contact: contactRef
                        };
                        scrollToSection(refMap[name]);
                      }}
                      className="hover:text-white transition-colors text-left"
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Separator className="bg-slate-800/80 mb-8" />
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>© 2026 AI Recruitment System. All rights reserved. Enterprise talent intelligence.</p>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-slate-300 transition-colors">Security Overview</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
