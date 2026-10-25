import { useState } from 'react';
import { CheckCircle2, XCircle, ArrowRight, RotateCw, ArrowLeft, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface CandidateData {
  years_experience: string;
  skill_match_score: string;
  education: string;
  job_level: string;
  industry: string;
}

interface PredictionResult {
  prediction: boolean;
  probability: number;
  recommendation: string;
}

interface CandidatePredictorProps {
  initialData?: CandidateData | null;
  useResumeData?: boolean;
}

export default function CandidatePredictor({ initialData, useResumeData = false }: CandidatePredictorProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CandidateData>({
    years_experience: initialData?.years_experience || '',
    skill_match_score: initialData?.skill_match_score || '',
    education: initialData?.education || 'Bachelor',
    job_level: initialData?.job_level || 'Mid-level',
    industry: initialData?.industry || 'Technology'
  });
  
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const years_experience = parseFloat(formData.years_experience);
      const skill_match_score = parseFloat(formData.skill_match_score);
      
      if (isNaN(years_experience) || isNaN(skill_match_score)) {
        throw new Error('Please enter valid numeric values');
      }
      
      const experienceScore = Math.min(years_experience / 10, 1) * 0.3;
      const skillScore = skill_match_score * 0.4;
      
      let educationScore = 0;
      switch (formData.education) {
        case 'High School': educationScore = 0.1; break;
        case 'Associate': educationScore = 0.2; break;
        case 'Bachelor': educationScore = 0.3; break;
        case 'Master': educationScore = 0.4; break;
        case 'PhD': educationScore = 0.5; break;
        default: educationScore = 0.3;
      }
      educationScore *= 0.15;
      
      let levelScore = 0;
      switch (formData.job_level) {
        case 'Entry-level': levelScore = 0.7; break;
        case 'Mid-level': levelScore = 0.5; break;
        case 'Senior': levelScore = 0.3; break;
        case 'Executive': levelScore = 0.2; break;
        default: levelScore = 0.5;
      }
      levelScore *= 0.1;
      
      const industryScore = 0.05;
      const probability = experienceScore + skillScore + educationScore + levelScore + industryScore;
      const prediction = probability > 0.6;
      
      const recommendation = prediction 
        ? "Candidate is recommended for the position" 
        : "Candidate is not recommended for the position";
      
      setResult({
        prediction,
        probability,
        recommendation
      });
      
      setShowForm(false);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 relative transition-colors">
      {/* Top back navigation */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          ML Candidate Predictor
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-xl overflow-hidden">
          <CardHeader className="text-center pt-8 pb-4">
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              AI Candidate Predictor
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {useResumeData ? 'Using data from your resume analysis' : 'Enter candidate parameters manually to predict hiring odds'}
            </CardDescription>
          </CardHeader>

          {error && (
            <div className="mx-6 mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {showForm ? (
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium text-xs">Years of Experience</Label>
                    <Input
                      name="years_experience"
                      type="number"
                      value={formData.years_experience}
                      onChange={handleChange}
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus-visible:ring-blue-700 text-sm"
                      placeholder="5.5"
                      required
                      disabled={useResumeData}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium text-xs">Skill Match Score (0-1)</Label>
                    <Input
                      name="skill_match_score"
                      type="number"
                      value={formData.skill_match_score}
                      onChange={handleChange}
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus-visible:ring-blue-700 text-sm"
                      placeholder="0.85"
                      min="0"
                      max="1"
                      step="0.01"
                      required
                      disabled={useResumeData}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">1 = perfect skill match</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium text-xs">Education</Label>
                    <Select
                      value={formData.education}
                      onValueChange={(value) => handleSelectChange('education', value)}
                      disabled={useResumeData}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-blue-700 text-sm">
                        <SelectValue placeholder="Select education" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                        <SelectItem value="High School">High School</SelectItem>
                        <SelectItem value="Associate">Associate</SelectItem>
                        <SelectItem value="Bachelor">Bachelor</SelectItem>
                        <SelectItem value="Master">Master</SelectItem>
                        <SelectItem value="PhD">PhD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium text-xs">Job Level</Label>
                    <Select
                      value={formData.job_level}
                      onValueChange={(value) => handleSelectChange('job_level', value)}
                      disabled={useResumeData}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-blue-700 text-sm">
                        <SelectValue placeholder="Select job level" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                        <SelectItem value="Entry-level">Entry-level</SelectItem>
                        <SelectItem value="Mid-level">Mid-level</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                        <SelectItem value="Executive">Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-medium text-xs">Industry</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) => handleSelectChange('industry', value)}
                      disabled={useResumeData}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-blue-700 text-sm">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="Retail">Retail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2.5 rounded-lg shadow-xs transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                      Predicting...
                    </>
                  ) : (
                    'Predict Job Possibility'
                  )}
                </Button>
              </form>
            </CardContent>
          ) : (
            <CardContent>
              {result && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <Card className={`border ${result.prediction ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20' : 'border-red-200 dark:border-red-800/60 bg-red-50/60 dark:bg-red-950/20'} p-6 rounded-xl shadow-xs`}>
                    <div className="flex items-start gap-4">
                      {result.prediction ? (
                        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-8 w-8 text-red-600 dark:text-red-400 flex-shrink-0" />
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {result.recommendation}
                        </h3>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Confidence Score</span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {(result.probability * 100).toFixed(2)}%
                            </span>
                          </div>
                          <Progress 
                            value={result.probability * 100} 
                            className={cn(
                              "h-2",
                              result.prediction ? "bg-emerald-100 dark:bg-emerald-950/50 [&>div]:bg-emerald-600" : "bg-red-100 dark:bg-red-950/50 [&>div]:bg-red-600"
                            )}
                          />
                        </div>
                        <Badge
                          variant="outline"
                          className={`mt-3 ${result.prediction ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'border-red-500 text-red-700 dark:text-red-400'}`}
                        >
                          {result.prediction ? 'Recommended' : 'Not Recommended'}
                        </Badge>
                      </div>
                    </div>
                  </Card>

                  <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl shadow-xs">
                    <CardHeader className="py-4 px-6 border-b border-slate-100 dark:border-slate-800">
                      <CardTitle className="text-slate-900 dark:text-slate-100 text-base font-semibold">Candidate Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Years of Experience</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formData.years_experience}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Skill Match Score</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formData.skill_match_score}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Education</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formData.education}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Job Level</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formData.job_level}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Industry</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formData.industry}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full border-slate-300 dark:border-slate-700 hover:border-blue-600 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 py-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    <RotateCw className="mr-2 h-4 w-4" />
                    Evaluate Another Candidate
                  </Button>
                </motion.div>
              )}
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  );
}