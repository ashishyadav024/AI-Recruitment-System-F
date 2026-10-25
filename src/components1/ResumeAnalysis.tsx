import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Upload, ArrowLeft } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_ENDPOINTS } from '@/config/api';
import * as pdfjsLib from 'pdfjs-dist';
import '@/lib/pdfWorker';

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorker: false // Disable worker for simpler operation
    }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ');
      fullText += pageText + ' ';
    }
    
    return fullText.trim();
  } catch (err) {
    console.error('Error extracting text from PDF:', err);
    throw new Error('Failed to extract text from PDF');
  }
};

const IT_ROLES = [
  "Software Engineer",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Data Engineer",
  "Machine Learning Engineer",
  "Cloud Architect",
  "Security Engineer"
];

interface AnalysisResult {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  strengths: string[];
  areas_for_improvement: string[];
}

interface ResumeAnalysisProps {
  onResumeUpload: (file: File, text: string) => void;
  onAnalysisComplete: (analysis: AnalysisResult) => void;
}

export const ResumeAnalysis: React.FC<ResumeAnalysisProps> = ({ onResumeUpload, onAnalysisComplete }) => {
  const navigate = useNavigate();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('demo')) {
      return {
        match_score: 92,
        matching_skills: ['Python', 'PyTorch', 'FastAPI', 'Docker', 'REST APIs', 'PostgreSQL', 'Distributed Systems'],
        missing_skills: ['Kubernetes', 'AWS CloudWatch'],
        strengths: [
          '5+ years experience building low-latency inference pipelines and distributed AI services.',
          'Demonstrated expertise in Python, PyTorch fine-tuning, and scalable microservices.',
          'Strong system design and API engineering track record in production environments.'
        ],
        areas_for_improvement: [
          'Hands-on Kubernetes cluster orchestration for multi-GPU training nodes.',
          'Enterprise telemetry and CloudWatch metric alarm configuration.'
        ]
      };
    }
    return null;
  });
  const [isUploadHovered, setIsUploadHovered] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      console.log('File uploaded:', file.name);
      setResumeFile(file);
      setError(null);

      try {
        const extractedText = await extractTextFromPdf(file);
        console.log('Text extracted from PDF:', extractedText.substring(0, 100) + '...');
        onResumeUpload(file, extractedText);
      } catch (err) {
        console.error('Error extracting text from PDF:', err);
        setError('Failed to extract text from PDF. Please try another file.');
      }
    } else {
      setError('Please upload a PDF file');
      setResumeFile(null);
    }
  };

  // Cleanup URL when component unmounts
  React.useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleAnalyze = async () => {
    if (!resumeFile) {
      setError('Please upload a resume first');
      return;
    }

    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('job_description', jobDescription);

      const response = await fetch(API_ENDPOINTS.analyze, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const result = await response.json();
      setAnalysisResult(result);
      onAnalysisComplete(result);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div 
        className="flex justify-between items-center"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button
          variant="ghost"
          onClick={() => navigate('/resumeAnalyzer')}
          className="gap-2 text-white font-sans"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Multi Resume Analyzer
        </Button>
      </motion.div>

      {analysisResult && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-blue-200 dark:border-blue-800 shadow-md">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">
                    Semantic Matching Engine
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Aarav Sharma — Machine Learning Engineer Analysis
                  </CardTitle>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-blue-700 dark:text-blue-400">
                    {analysisResult.match_score}%
                  </div>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Strong Role Alignment
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span>ATS Competency Match</span>
                  <span>{analysisResult.match_score}% of role criteria met</span>
                </div>
                <Progress
                  value={analysisResult.match_score}
                  className="h-2.5 bg-slate-100 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Matching Verified Skills ({analysisResult.matching_skills.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.matching_skills.map((skill: string) => (
                      <Badge key={skill} variant="default" className="bg-emerald-600 text-white font-medium text-xs">
                        ✓ {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Identified Competency Gaps ({analysisResult.missing_skills.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.missing_skills.map((skill: string) => (
                      <Badge key={skill} variant="outline" className="border-amber-300 text-amber-800 dark:text-amber-300 bg-white dark:bg-slate-900 font-medium text-xs">
                        ! {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Primary Strengths
                  </h3>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                    {analysisResult.strengths.map((str, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Interview Probing Areas
                  </h3>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                    {analysisResult.areas_for_improvement.map((area, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{area}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!analysisResult && (
        <>
        <Card>
        <CardHeader>
          <CardTitle>Upload Resume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <motion.div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById('resume-upload')?.click()}
              onMouseEnter={() => setIsUploadHovered(true)}
              onMouseLeave={() => setIsUploadHovered(false)}
            >
              <input
                id="resume-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={isAnalyzing}
              />
              <motion.div
                animate={{
                  scale: isUploadHovered ? 1.1 : 1,
                  transition: { duration: 0.3 }
                }}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <motion.p 
                  className="text-lg font-medium"
                  animate={{
                    scale: isUploadHovered ? 1.1 : 1,
                    transition: { duration: 0.3 }
                  }}
                >
                  {resumeFile ? resumeFile.name : 'Click to upload or drag and drop'}
                </motion.p>
                <p className="text-sm text-muted-foreground mt-2">
                  PDF files only
                </p>
              </motion.div>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Role</label>
              <Select onValueChange={setSelectedRole} value={selectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {IT_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Role</label>
              <Input
                placeholder="Or enter custom role"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Job Description</label>
            <Textarea
              placeholder="Enter the job description, including required skills, experience, and qualifications..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[200px]"
              disabled={isAnalyzing}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !resumeFile || !jobDescription}
            className="w-full"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
          </Button>
        </CardContent>
      </Card>
      </>
      )}

      {isAnalyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground">Analyzing your resume...</p>
              <Progress value={33} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};