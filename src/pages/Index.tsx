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
  Sun
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

const Index = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [scrollY, setScrollY] = useState(0);

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
      icon: <Brain size={24} />,
      title: 'AI-Powered Screening',
      description: 'Our advanced machine learning algorithms analyze resumes to find the best candidates based on your requirements.'
    },
    {
      icon: <BarChart3 size={24} />,
      title: 'Analytics Dashboard',
      description: 'Get comprehensive insights about your candidate pool with visualization tools and reporting.'
    },
    {
      icon: <Search size={24} />,
      title: 'Intelligent Search',
      description: 'Quickly locate candidates with specific skills, experience, or qualifications through semantic search.'
    },
    {
      icon: <ClipboardCheck size={24} />,
      title: 'Automated Shortlisting',
      description: 'Automatically rank candidates based on job descriptions and custom criteria to streamline your hiring.'
    },
    {
      icon: <Clock size={24} />,
      title: 'Time-Saving Automation',
      description: 'Reduce manual screening time by up to 75% with our intelligent processing system.'
    },
    {
      icon: <Shield size={24} />,
      title: 'Bias Reduction',
      description: 'Our system is designed to minimize unconscious bias in the hiring process for more diverse teams.'
    }
  ];

  const teamMembers = [
    {
      name: 'Swarup Kakade',
      role: 'ML Engineer',
      image: '/639a63a4-b7ca-42ac-aa29-89350e59fb4f.jpeg',
      social: {
        linkedin: '#',
        twitter: '#',
        github: '#'
      }
    },
    {
      name: 'Pratik Avhad',
      role: 'Frontend Develpor',
      image: '/9d871ecd-e516-4947-9d4b-a5cb16036a46.jpeg',
      social: {
        linkedin: '#',
        twitter: '#',
        github: '#'
      }
    },
    {
      name: 'Vaibhav Narute',
      role: 'Backend Developer',
      image: '/ff8e142e-68ae-4fba-bde7-af65d65e6070.jpeg',
      social: {
        linkedin: '#',
        twitter: '#',
        github: '#'
      }
    },
    {
      name: 'Nitish Jha',
      role: 'Full Stack Developer',
      image: '/432a0ba5-ac27-4b26-8456-70c061d6f7c2.jpeg',
      social: {
        linkedin: '#',
        twitter: '#',
        github: '#'
      }
    }
  ];

  const galleryImages = [
    {
      src: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      alt: 'Dashboard overview with candidate analytics',
      caption: 'Interactive Dashboard'
    },
    {
      src: 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      alt: 'AI analysis of resume content',
      caption: 'AI Resume Processing'
    },
    {
      src: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      alt: 'Team using the platform collaboratively',
      caption: 'Collaborative Hiring'
    },
    {
      src: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      alt: 'Code view of the AI algorithm',
      caption: 'Advanced Algorithms'
    }
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${
      theme === 'dark' 
        ? 'from-slate-950 via-slate-900 to-slate-950' 
        : 'from-slate-50 via-white to-slate-100'
    }`}>
      {/* Navigation */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrollY > 50 
            ? theme === 'dark'
              ? 'bg-slate-950/80 backdrop-blur-md shadow-lg border-b border-slate-800'
              : 'bg-white/80 backdrop-blur-md shadow-lg border-b border-slate-200'
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4 flex items-center justify-between h-20">
          <div className="flex items-center">
            <span className="font-bold text-3xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              ResumeAI
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <ul className="flex space-x-8">
              {[
                { name: 'Home', id: 'home', ref: homeRef },
                { name: 'Features', id: 'features', ref: featuresRef },
                { name: 'Gallery', id: 'gallery', ref: galleryRef },
                { name: 'About Us', id: 'about', ref: aboutRef },
                { name: 'Our Team', id: 'team', ref: teamRef },
                { name: 'Contact Us', id: 'contact', ref: contactRef }
              ].map((item) => (
                <li key={item.name}>
                  <button 
                    onClick={() => scrollToSection(item.ref)}
                    className={`text-sm font-medium transition-colors hover:text-cyan-400 ${
                      activeSection === item.id 
                        ? 'text-cyan-500 font-semibold' 
                        : theme === 'dark' 
                          ? 'text-slate-300' 
                          : 'text-slate-600'
                    }`}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className={`${
                  theme === 'dark' 
                    ? 'text-slate-300 hover:text-cyan-400' 
                    : 'text-slate-600 hover:text-cyan-600'
                }`}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </Button>
              <Link to="/dashboard">
                <Button 
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium shadow-sm text-sm"
                >
                  Recruiter Dashboard
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className={`${
                  theme === 'dark'
                    ? 'border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950'
                    : 'border-cyan-600 text-cyan-600 hover:bg-cyan-600 hover:text-white'
                }`}
                onClick={handleGetStarted}
              >
                Login
              </Button>
            </div>
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-4 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className={`${
                theme === 'dark' 
                  ? 'text-slate-300 hover:text-cyan-400' 
                  : 'text-slate-600 hover:text-cyan-600'
              }`}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={`${
                theme === 'dark'
                  ? 'text-slate-300 hover:text-cyan-400'
                  : 'text-slate-600 hover:text-cyan-600'
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`md:hidden ${
              theme === 'dark'
                ? 'bg-slate-950/95 backdrop-blur-md shadow-lg border-b border-slate-800'
                : 'bg-white/95 backdrop-blur-md shadow-lg border-b border-slate-200'
            }`}
          >
            <ScrollArea className="h-[calc(100vh-5rem)]">
              <div className="px-4 py-6 space-y-4">
                <ul className="space-y-4">
                  {[
                    { name: 'Home', id: 'home', ref: homeRef },
                    { name: 'Features', id: 'features', ref: featuresRef },
                    { name: 'Gallery', id: 'gallery', ref: galleryRef },
                    { name: 'About Us', id: 'about', ref: aboutRef },
                    { name: 'Our Team', id: 'team', ref: teamRef },
                    { name: 'Contact Us', id: 'contact', ref: contactRef }
                  ].map((item) => (
                    <li key={item.name}>
                      <button 
                        onClick={() => scrollToSection(item.ref)}
                        className={`block w-full text-left px-4 py-2 rounded-md transition-colors ${
                          activeSection === item.id
                            ? 'text-cyan-500 font-semibold bg-cyan-50/50 dark:bg-slate-800'
                            : theme === 'dark'
                              ? 'text-slate-300 hover:bg-slate-800 hover:text-cyan-400'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-cyan-600'
                        }`}
                      >
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
                <Button 
                  variant="outline" 
                  className={`w-full ${
                    theme === 'dark'
                      ? 'border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950'
                      : 'border-cyan-600 text-cyan-600 hover:bg-cyan-600 hover:text-white'
                  }`}
                  onClick={handleGetStarted}
                >
                  Login
                </Button>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section ref={homeRef} id="home" className="pt-36 pb-20 px-4 scroll-mt-24">
          <div className="container mx-auto flex flex-col md:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="md:w-1/2 space-y-8"
            >
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Badge variant="secondary" className="text-lg px-4 py-1 bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                    AI-Powered Resume Analysis
                  </Badge>
                </motion.div>
                <motion.h1 
                  className={`text-6xl font-bold tracking-tight ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  Streamline Your Hiring Process
                </motion.h1>
                <motion.p 
                  className={`text-xl ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  Get instant insights and make data-driven decisions with our advanced resume screening technology.
                </motion.p>
              </div>
              <motion.div 
                className="flex gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Button 
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-slate-950 font-semibold"
                >
                  Get Started <ArrowRight className="ml-2" size={18} />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => scrollToSection(featuresRef)}
                  className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950"
                >
                  Learn More
                </Button>
              </motion.div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="md:w-1/2"
            >
              <div className="flex items-center gap-4">
                <h2 className={`text-2xl font-bold sans-serif mb-6 text-center w-full ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  Get deep insights about your resume through chat!
                </h2>
              </div>
              
              <Card className={`overflow-hidden border shadow-2xl rounded-3xl transition-colors ${
                theme === 'dark' 
                  ? 'border-slate-800 bg-slate-900/60 backdrop-blur-sm' 
                  : 'border-slate-200 bg-white/90 backdrop-blur-sm shadow-slate-200/50'
              }`}>
                <CardContent className="p-0">
                  <Chatbot 
                    messages={[
                      "Hello! I'm your AI HR assistant. How can I help you today? 👋",
                      "I'd like to know more about your resume analysis features.",
                      "We offer comprehensive resume analysis, Q&A about resumes, and interview question generation. What interests you most? 📝",
                      "Tell me more about the resume analysis feature.",
                      "Our AI-powered resume analysis provides detailed insights about candidate skills, experience, and match with job requirements. Would you like to try it out? 🚀"
                    ]}
                    delay={1500}
                    startDelay={1000}
                    restartDelay={5000}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
          <motion.div 
            className="container mx-auto mt-20 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronDown size={30} className="text-cyan-400 mx-auto" />
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section ref={featuresRef} id="features" className={`py-20 px-4 relative z-10 transition-colors duration-300 scroll-mt-24 ${
          theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-100/70 border-y border-slate-200/80'
        }`}>
          <div className="container mx-auto">
            <motion.div 
              className="text-center space-y-6 mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={isFeaturesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className={`text-4xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Powerful Features</h2>
              <p className={`text-xl ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
              } max-w-2xl mx-auto`}>
                Discover how our AI-powered platform can transform your recruitment process
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isFeaturesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative z-10"
                >
                  <Card className={`h-full hover:shadow-xl transition-all duration-300 border backdrop-blur-sm ${
                    theme === 'dark'
                      ? 'border-slate-800 bg-slate-800/50 hover:bg-slate-800/70'
                      : 'border-slate-200 bg-white hover:bg-slate-50/80 shadow-sm'
                  }`}>
                    <CardHeader>
                      <div className="w-14 h-14 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mb-4">
                        <div className="text-cyan-400">
                          {feature.icon}
                        </div>
                      </div>
                      <CardTitle className={`text-xl ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery Section */}
        <section ref={galleryRef} id="gallery" className="py-20 px-4 scroll-mt-24">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isGalleryInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-6 mb-16"
            >
              
              <h2 className={`text-4xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Our Platform in Action</h2>
              <p className={`text-xl ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
              } max-w-2xl mx-auto`}>
                Explore how our AI-powered platform revolutionizes the recruitment process
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-8 mt-12">
              {galleryImages.map((image, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isGalleryInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="rounded-xl overflow-hidden shadow-lg"
                >
                  <div className="relative">
                    <img 
                      src={image.src} 
                      alt={image.alt} 
                      className="w-full h-64 object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white p-4">
                      <p className="font-semibold">{image.caption}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section ref={aboutRef} id="about" className={`py-20 px-4 scroll-mt-24 ${
          theme === 'dark' ? '' : 'bg-slate-100/40 border-y border-slate-200/60'
        }`}>
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isAboutInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-6 mb-16"
            >
              
              <h2 className={`text-4xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Our Story</h2>
              <p className={`text-xl ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
              } max-w-2xl mx-auto`}>
                Learn about our mission to transform recruitment through AI innovation
              </p>
            </motion.div>
            <div className="flex flex-col md:flex-row items-center gap-12">
              <motion.div 
                className="md:w-1/2"
                initial={{ opacity: 0, x: -30 }}
                animate={isAboutInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=700&q=80" 
                  alt="Our team working together"
                  className="rounded-xl shadow-xl"
                />
              </motion.div>
              <motion.div 
                className="md:w-1/2 space-y-6"
                initial={{ opacity: 0, x: 30 }}
                animate={isAboutInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h3 className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>Revolutionizing Recruitment with AI</h3>
                <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                  ResumeAI was founded with a simple mission: to make recruitment more efficient and effective through the power of artificial intelligence.
                </p>
                <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                  Our team of AI experts and HR professionals has developed a state-of-the-art resume screening system that analyzes applications more thoroughly than any human could, while eliminating unconscious bias.
                </p>
                <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                  We're passionate about helping companies find the right talent quickly, while ensuring candidates are matched to roles where they'll truly excel.
                </p>
                <div className="pt-4">
                  <Button 
                    onClick={() => scrollToSection(contactRef)}
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-slate-950 font-semibold"
                  >
                    Get in Touch
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section ref={teamRef} id="team" className="py-20 px-4 scroll-mt-24">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isTeamInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-6 mb-16"
            >
              
              <h2 className={`text-4xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Meet the Experts</h2>
              <p className={`text-xl ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
              } max-w-2xl mx-auto`}>
                Get to know the talented individuals behind ResumeAI
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
              {teamMembers.map((member, index) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, y: 30 }}
                  animate={isTeamInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="team-card"
                >
                  <div className="relative overflow-hidden h-64">
                    <img 
                      src={member.image} 
                      alt={member.name} 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className={`text-xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>{member.name}</h3>
                    <p className={`${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                    } mb-4`}>{member.role}</p>
                    <div className="flex space-x-4">
                      <a href={member.social.linkedin} className={`text-slate-400 hover:text-cyan-400 transition-colors ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        <Linkedin size={18} />
                      </a>
                      <a href={member.social.twitter} className={`text-slate-400 hover:text-cyan-400 transition-colors ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        <Twitter size={18} />
                      </a>
                      <a href={member.social.github} className={`text-slate-400 hover:text-cyan-400 transition-colors ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        <Github size={18} />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section ref={contactRef} id="contact" className={`py-20 px-4 scroll-mt-24 ${
          theme === 'dark' ? 'bg-slate-900/40' : 'bg-slate-100/50 border-t border-slate-200/80'
        }`}>
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isContactInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-6 mb-16"
            >
              
              <h2 className={`text-4xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Get in Touch</h2>
              <p className={`text-xl ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
              } max-w-2xl mx-auto`}>
                Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </p>
            </motion.div>
            <div className="flex flex-col md:flex-row gap-12 mt-12">
              <motion.div 
                className="md:w-1/2"
                initial={{ opacity: 0, x: -30 }}
                animate={isContactInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className={`block text-sm font-medium ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      } mb-1`}>Name</label>
                      <input
                        type="text"
                        id="name"
                        className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                          theme === 'dark'
                            ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className={`block text-sm font-medium ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      } mb-1`}>Email</label>
                      <input
                        type="email"
                        id="email"
                        className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                          theme === 'dark'
                            ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="subject" className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    } mb-1`}>Subject</label>
                    <input
                      type="text"
                      id="subject"
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                        theme === 'dark'
                          ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                      placeholder="How can we help you?"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    } mb-1`}>Message</label>
                    <textarea
                      id="message"
                      rows={4}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                        theme === 'dark'
                          ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                      placeholder="Your message here..."
                    ></textarea>
                  </div>
                  <div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium py-2.5 rounded-lg shadow transition-all duration-150"
                    >
                      Send Message
                    </Button>
                  </div>
                </form>
              </motion.div>
              
              <motion.div 
                className={`md:w-1/2 p-8 rounded-xl shadow-md backdrop-blur-sm border transition-colors ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-slate-200/50'
                }`}
                initial={{ opacity: 0, x: 30 }}
                animate={isContactInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h3 className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                } mb-6`}>Contact Information</h3>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <Mail className={`mr-4 ${
                      theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'
                    }`} size={24} />
                    <div>
                      <p className={`font-medium ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>Email</p>
                      <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                        contact@resumeai.com
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Phone className={`mr-4 ${
                      theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'
                    }`} size={24} />
                    <div>
                      <p className={`font-medium ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>Phone</p>
                      <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                        +1 (555) 123-4567
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <MapPin className={`mr-4 ${
                      theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'
                    }`} size={24} />
                    <div>
                      <p className={`font-medium ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>Address</p>
                      <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                        123 Innovation Street<br />
                        Tech Hub, CA 94103<br />
                        United States
                      </p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Follow Us</h4>
                    <div className="flex space-x-3">
                      {[
                        { icon: <Twitter size={18} />, href: "#" },
                        { icon: <Linkedin size={18} />, href: "#" },
                        { icon: <Github size={18} />, href: "#" }
                      ].map((social, idx) => (
                        <a 
                          key={idx} 
                          href={social.href} 
                          className={`p-2.5 rounded-full border transition-all ${
                            theme === 'dark'
                              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-700'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-cyan-600 hover:border-cyan-400 hover:bg-white shadow-sm'
                          }`}
                        >
                          {social.icon}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 text-slate-300">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <span className="font-bold text-2xl bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                ResumeAI
              </span>
              <p className="text-slate-400 mt-2 text-sm">Revolutionizing recruitment through AI</p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-6">
              {[
                { name: 'Home', ref: homeRef },
                { name: 'Features', ref: featuresRef },
                { name: 'Gallery', ref: galleryRef },
                { name: 'About', ref: aboutRef },
                { name: 'Team', ref: teamRef },
                { name: 'Contact', ref: contactRef }
              ].map((item) => (
                <button 
                  key={item.name}
                  onClick={() => scrollToSection(item.ref)} 
                  className="text-slate-300 hover:text-cyan-400 transition-colors text-sm font-medium"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <Separator className="my-8 bg-slate-800" />
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <p className="text-slate-400">© 2026 ResumeAI. All rights reserved.</p>
            <div className="flex space-x-6">
              <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Privacy Policy</a>
              <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
