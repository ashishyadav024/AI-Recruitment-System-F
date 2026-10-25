import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { Mail, Lock, User, LogOut, CheckCircle2, Building2, Briefcase, UserCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { registerUser, loginUser } from '../../services/authService';
import { useTheme } from '../../context/ThemeContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'hr' | 'employee' | ''>('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [userRole, setUserRole] = useState<'hr' | 'employee' | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (auth) {
        // Sign in with Firebase if configured
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        try {
          const response = await loginUser(firebaseUser.uid, firebaseUser.email || email);
          if (response.success && response.user) {
            setUserRole(response.user.role);
          } else {
            setUserRole('hr');
          }
        } catch {
          setUserRole('hr');
        }
      } else {
        // Local / Demo Mode when Firebase credentials are not configured
        const savedUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
        const existing = savedUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
        const detectedRole = existing ? existing.role : (email.toLowerCase().includes('candidate') ? 'employee' : 'hr');
        setUserRole(detectedRole);
      }

      setSuccess('Successfully signed in!');
      setShowWelcome(true);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Login failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    
    if (!role) {
      setError('Please select your role (HR or Employee)');
      return;
    }
    
    if (role === 'hr' && !company.trim()) {
      setError('Please enter your company name');
      return;
    }
    
    setLoading(true);
    
    try {
      if (auth) {
        // Create user in Firebase if configured
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        try {
          await registerUser(
            firebaseUser.uid,
            firebaseUser.email || email,
            name,
            role as 'hr' | 'employee',
            role === 'hr' ? company : null,
            phone || null
          );
        } catch (err) {
          console.warn("MongoDB sync skipped:", err);
        }
      } else {
        // Local / Demo Mode storage
        const savedUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
        savedUsers.push({ email, name, role, company, phone });
        localStorage.setItem('registered_users', JSON.stringify(savedUsers));
      }

      setSuccess('Account created successfully! You can now sign in.');
      setActiveTab('signin');
      // Clear form
      setEmail('');
      setPassword('');
      setName('');
      setRole('');
      setCompany('');
      setPhone('');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await auth.signOut();
      }
      setShowWelcome(false);
      navigate('/');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  const handleGetStarted = () => {
    if (userRole === 'hr') {
      navigate('/dashboard');
    } else {
      navigate('/employee-resume-analysis');
    }
  };

  if (showWelcome) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 relative transition-colors duration-200 ${
        theme === 'dark' 
          ? 'bg-slate-950 text-slate-100' 
          : 'bg-slate-50 text-slate-900'
      }`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-md relative z-10"
        >
          <Card className={`rounded-xl border shadow-sm transition-all duration-200 ${
            theme === 'dark' 
              ? 'bg-slate-900 border-slate-800' 
              : 'bg-white border-slate-200'
          }`}>
            <CardHeader className="text-center space-y-2 pb-4">
              <div className="mx-auto w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Authenticated Successfully
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                Active session verified. Select your destination workspace:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-2">
              <Button 
                onClick={() => navigate('/dashboard')}
                className="w-full h-10 bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs rounded-lg shadow-xs transition-colors"
              >
                Open Recruiter Dashboard
              </Button>
              <Button 
                onClick={handleGetStarted}
                variant="outline"
                className="w-full h-10 font-medium text-xs rounded-lg border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Go to {userRole === 'hr' ? 'HR Resume Analyzer' : 'Candidate Portal'}
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="w-full text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors pt-2"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 relative transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-slate-950 text-slate-100' 
        : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top back navigation button */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-lg text-xs font-medium px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-[420px] relative z-10 my-10"
      >
        <Card className={`rounded-xl border shadow-sm transition-all duration-200 ${
          theme === 'dark' 
            ? 'bg-slate-900 border-slate-800' 
            : 'bg-white border-slate-200'
        }`}>
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="mx-auto w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              R
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Sign in to ResumeAI
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Structured hiring intelligence and automated evaluations
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 1-Click Sandbox Demo Login */}
            <div className={`p-3 rounded-lg border flex flex-col gap-2 ${
              theme === 'dark' 
                ? 'bg-slate-950/60 border-slate-800' 
                : 'bg-slate-50 border-slate-200/90'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <ShieldCheck size={14} className="text-blue-700 dark:text-blue-400" />
                  Instant Sandbox Access
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Demo
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUserRole('hr');
                    setSuccess('Logged in as HR Recruiter Demo');
                    setShowWelcome(true);
                  }}
                  className="text-xs font-medium h-8 rounded-lg border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-700 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40"
                >
                  <Briefcase className="w-3.5 h-3.5 mr-1.5 text-blue-700 dark:text-blue-400" />
                  HR Recruiter
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUserRole('employee');
                    setSuccess('Logged in as Candidate Demo');
                    setShowWelcome(true);
                  }}
                  className="text-xs font-medium h-8 rounded-lg border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-700 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40"
                >
                  <UserCircle className="w-3.5 h-3.5 mr-1.5 text-slate-600 dark:text-slate-400" />
                  Candidate
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full grid-cols-2 p-1 rounded-lg mb-4 ${
                theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-slate-100 border border-slate-200'
              }`}>
                <TabsTrigger value="signin" className="rounded-md text-xs font-semibold py-1.5">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-md text-xs font-semibold py-1.5">Create Account</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-3.5">
                <form onSubmit={handleSignIn} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Work Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <Input
                        id="email"
                        type="email"
                        placeholder="recruiter@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg border-slate-300 dark:border-slate-700 focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg border-slate-300 dark:border-slate-700 focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                        required
                      />
                    </div>
                  </div>
                  {error && (
                    <div className="p-2.5 rounded-lg text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 font-medium">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="p-2.5 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 font-medium">
                      {success}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full h-9 bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs rounded-lg shadow-xs transition-colors"
                    disabled={loading}
                  >
                    {loading ? 'Authenticating...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-3.5">
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <Input
                        id="name"
                        type="text"
                        placeholder="e.g. Alex Morgan"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg border-slate-300 dark:border-slate-700 focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Role Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Role Selection *
                    </Label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="cursor-pointer">
                        <input 
                          type="radio" 
                          name="role" 
                          value="hr" 
                          checked={role === 'hr'}
                          onChange={(e) => setRole(e.target.value as 'hr')}
                          className="sr-only"
                          required
                        />
                        <div className={`border rounded-lg p-2.5 text-center transition-all ${
                          role === 'hr'
                            ? 'border-blue-700 bg-blue-50/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-1 ring-blue-700'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}>
                          <Briefcase className={`w-5 h-5 mx-auto mb-1 ${
                            role === 'hr' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400'
                          }`} />
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Recruiter / HR
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Screen & evaluate
                          </p>
                        </div>
                      </label>
                      
                      <label className="cursor-pointer">
                        <input 
                          type="radio" 
                          name="role" 
                          value="employee" 
                          checked={role === 'employee'}
                          onChange={(e) => setRole(e.target.value as 'employee')}
                          className="sr-only"
                          required
                        />
                        <div className={`border rounded-lg p-2.5 text-center transition-all ${
                          role === 'employee'
                            ? 'border-blue-700 bg-blue-50/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-1 ring-blue-700'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}>
                          <UserCircle className={`w-5 h-5 mx-auto mb-1 ${
                            role === 'employee' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400'
                          }`} />
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Candidate
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Practice interview
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Company Name - Only for HR */}
                  {role === 'hr' && (
                    <div className="space-y-1">
                      <Label htmlFor="company" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Organization *
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <Input
                          id="company"
                          type="text"
                          placeholder="e.g. Acme Tech Labs"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          className="pl-9 h-9 text-xs rounded-lg border-slate-300 dark:border-slate-700 focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                          required
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="signup-email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Work Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg border-slate-300 dark:border-slate-700 focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="signup-password" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg border-slate-300 dark:border-slate-700 focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  {error && (
                    <div className="p-2.5 rounded-lg text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 font-medium">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="p-2.5 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 font-medium">
                      {success}
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full h-9 bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs rounded-lg shadow-xs transition-colors"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <Separator />
          <CardFooter className="py-3">
            <p className="text-[11px] text-center text-slate-500 w-full">
              Enterprise SOC-2 Type II Certified · 256-bit TLS encrypted transmission
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;