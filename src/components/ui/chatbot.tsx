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
    "नमस्कार! क्या आप स्मार्ट कृषि के बारे में अधिक जानना चाहेंगे?🌱",  
"हाँ, मुझे आपके समाधानों के बारे में जानना है।",  
"हम IoT सेंसर, AI विश्लेषण और सतत कृषि पद्धतियों के साथ डेटा-चालित खेती समाधान प्रदान करते हैं।🌱",  
"यह तो बहुत रोचक है! मैं इसे कैसे शुरू कर सकता हूँ?",  
"मैं आपको हमारी टीम से जोड़ रहा हूँ !🌱"
  ],
  delay = 1000, // Slower display time
  startDelay = 1000, // First message delay
  restartDelay = 3000, // Delay before restart
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
    <div className={`w-full max-w-sm mx-auto backdrop-blur-md rounded-3xl overflow-hidden border shadow-xl transition-colors ${
      theme === 'dark'
        ? 'bg-cyan-950/40 border-cyan-600/30 shadow-cyan-950/50'
        : 'bg-white border-cyan-100 shadow-slate-200/80'
    }`}>
      <div className={`p-4 border-b transition-colors ${
        theme === 'dark' ? 'bg-cyan-900/50 border-cyan-600/30' : 'bg-cyan-50 border-cyan-100'
      }`}>
        <div className="flex items-center justify-between">
          <h3 
            className={`text-lg font-semibold cursor-pointer transition-colors ${
              theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-700 hover:text-cyan-800'
            }`}
            onClick={() => navigate('/login')}
          >
            AI Assistant
          </h3>
          <button 
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xs font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 shadow-md hover:scale-105 transform"
            onClick={() => navigate('/login')}
          >
            Chat Now
          </button>
        </div>
      </div>

      <div className="h-96 p-4 overflow-y-auto flex flex-col space-y-4">
        {chatMessages.map((message, index) => (
          <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                message.isUser 
                  ? 'bg-blue-600 text-white ml-4 shadow-sm' 
                  : theme === 'dark'
                    ? 'bg-cyan-900/60 text-cyan-50 mr-4 border border-cyan-700/30'
                    : 'bg-slate-100 text-slate-800 mr-4 border border-slate-200'
              } backdrop-blur-sm shadow-md`}
            >
              {message.text}
            </div>
          </div>
        ))}

        {/* Bot typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className={`p-4 rounded-2xl flex space-x-2 backdrop-blur-sm ${
              theme === 'dark' ? 'bg-cyan-800/50' : 'bg-slate-100'
            }`}>
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}

        {/* User typing indicator */}
        {isUserTyping && (
          <div className="flex justify-end">
            <div className="bg-blue-600/50 p-2 rounded-2xl flex items-center gap-1 backdrop-blur-sm">
              <div className="text-xs text-blue-200">typing</div>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

