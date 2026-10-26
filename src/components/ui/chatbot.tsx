'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

interface Message {
  text: string;
  isUser: boolean;
}

interface ChatbotProps {
  messages?: string[];
  delay?: number;
  startDelay?: number;
  restartDelay?: number;
  loop?: boolean;
}

export default function Chatbot({
  messages = [
    "Hello! Welcome to AI Recruitment System Talent Intelligence.",
    "Can AI Recruitment System conduct automated technical screening?",
    "Yes. We offer structured technical interviews, live code evaluation, and calibrated scorecards.",
    "How does it integrate with our hiring pipeline?",
    "Direct integrations with Greenhouse, Lever, and Ashby are supported out of the box."
  ],
  delay = 1200,
  startDelay = 800,
  restartDelay = 3500,
  loop = true
}: ChatbotProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex >= messages.length) {
      if (loop) {
        setTimeout(() => {
          setChatMessages([]);
          setCurrentIndex(0);
        }, restartDelay);
      }
      return;
    }

    const isNextMessageFromUser = currentIndex % 2 !== 0;
    
    // Show appropriate typing indicator
    if (isNextMessageFromUser) {
      setIsUserTyping(true);
      setIsTyping(false);
    } else {
      setIsTyping(true);
      setIsUserTyping(false);
    }

    const messageDelay = currentIndex === 0 ? startDelay : delay;

    const messageTimeout = setTimeout(() => {
      setIsTyping(false);
      setIsUserTyping(false);
      setChatMessages(prev => [
        ...prev,
        {
          text: messages[currentIndex],
          isUser: currentIndex % 2 !== 0
        }
      ]);
      setCurrentIndex(prev => prev + 1);
    }, messageDelay);

    return () => clearTimeout(messageTimeout);
  }, [currentIndex, messages, delay, startDelay, restartDelay, loop]);

  return (
    <div className={`w-full max-w-sm mx-auto rounded-xl overflow-hidden border shadow-sm transition-colors ${
      theme === 'dark'
        ? 'bg-slate-900 border-slate-800'
        : 'bg-white border-slate-200'
    }`}>
      <div className={`px-4 py-3 border-b transition-colors flex items-center justify-between ${
        theme === 'dark' ? 'bg-slate-800/60 border-slate-800' : 'bg-slate-50 border-slate-100'
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <h3 
            className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 cursor-pointer"
            onClick={() => navigate('/login')}
          >
            Talent Assistant
          </h3>
        </div>
        <button 
          className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-md transition-colors shadow-xs"
          onClick={() => navigate('/login')}
        >
          Open App
        </button>
      </div>

      <div className="h-80 p-4 overflow-y-auto flex flex-col space-y-3">
        {chatMessages.map((message, index) => (
          <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3.5 py-2 rounded-lg text-xs leading-relaxed ${
                message.isUser 
                  ? 'bg-blue-700 text-white ml-4 shadow-xs' 
                  : theme === 'dark'
                    ? 'bg-slate-800 text-slate-200 mr-4 border border-slate-700'
                    : 'bg-slate-100 text-slate-800 mr-4 border border-slate-200'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}

        {/* Bot typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className={`p-2.5 rounded-lg flex space-x-1.5 ${
              theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-slate-100 border border-slate-200'
            }`}>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}

        {/* User typing indicator */}
        {isUserTyping && (
          <div className="flex justify-end">
            <div className="bg-blue-700/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-white">
              <span className="text-[10px] text-blue-100">typing</span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

