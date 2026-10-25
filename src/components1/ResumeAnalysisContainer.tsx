import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ResumeAnalysis } from './ResumeAnalysis';
import { ResumeQA } from './ResumeQA';
import { InterviewQuestions } from './InterviewQuestions';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, Sun, Moon, Sparkles, FileText, Bot } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface AnalysisResult {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  strengths: string[];
  areas_for_improvement: string[];
}

interface ResumeData {
  file: File | null;
  text: string;
  analysis: any;
}

export const ResumeAnalysisContainer: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('analysis');
  const [resumeData, setResumeData] = useState<ResumeData>({
    file: null,
    text: '',
    analysis: null
  });

  const handleResumeUpload = (file: File, text: string) => {
    console.log('ResumeAnalysisContainer received file and text:', {
      fileName: file.name,
      textLength: text.length,
      textPreview: text.substring(0, 100)
    });
    setResumeData(prev => ({ ...prev, file, text }));
  };

  const handleAnalysisComplete = (analysis: any) => {
    console.log('Analysis completed:', analysis);
    setResumeData(prev => ({ ...prev, analysis }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="container mx-auto py-6 sm:py-8 px-4 max-w-7xl">
        
        {/* Top Navigation & Action Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
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
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              AI Resume Screening
            </span>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              AI Resume Insights & Analysis
            </h2>
            <div className="space-y-1">
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Upload candidate resumes for deep semantic matching, missing skill detection, and real-time interview prep.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <span>⚡ Tip: Upload a resume below, then click "Predict Job Possibility" for ML hiring odds.</span>
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/candidate-predictor')}
            className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2.5 text-xs rounded-lg shadow-xs flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Predict Job Possibility
          </Button>
        </div>

        {/* Two Column Layout: Resume Preview & Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 flex flex-col">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-full min-h-[500px]">
              <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  Document Viewer
                </span>
                {resumeData.file && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate max-w-[200px]">
                    {resumeData.file.name}
                  </span>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center pt-3">
                {resumeData.file ? (
                  <div className="w-full h-full min-h-[480px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <iframe
                      src={URL.createObjectURL(resumeData.file)}
                      className="w-full h-full min-h-[480px]"
                      title="PDF Preview"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
                      <Upload className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No Resume Document Loaded
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                      Upload a PDF resume in the panel to activate real-time document preview and automated screening.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <Card className="border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                    <TabsTrigger value="analysis" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
                      Resume Analysis
                    </TabsTrigger>
                    <TabsTrigger value="qa" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
                      Resume Q&A
                    </TabsTrigger>
                    <TabsTrigger value="questions" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
                      Generated Questions
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="analysis">
                    <ResumeAnalysis
                      onResumeUpload={handleResumeUpload}
                      onAnalysisComplete={handleAnalysisComplete}
                    />
                  </TabsContent>

                  <TabsContent value="qa">
                    <ResumeQA
                      resumeFile={resumeData.file}
                      resumeText={resumeData.text}
                      analysis={resumeData.analysis}
                    />
                  </TabsContent>

                  <TabsContent value="questions">
                    <InterviewQuestions
                      resumeFile={resumeData.file}
                      resumeText={resumeData.text}
                      analysis={resumeData.analysis}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}; 