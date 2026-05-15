import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const GradingModal = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Finalizing Band Score');
  const [completedSteps, setCompletedSteps] = useState([]);

  const steps = [
    "Task Response",
    "Coherence",
    "Lexical Resource",
    "Grammatical"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        
        const next = prev + 1;
        
        if (next === 25) {
          setStatus('Evaluating Task Response');
          setCompletedSteps(prev => [...prev, 0]);
        } else if (next === 50) {
          setStatus('Checking Coherence & Cohesion');
          setCompletedSteps(prev => [...prev, 1]);
        } else if (next === 75) {
          setStatus('Analyzing Lexical Resource');
          setCompletedSteps(prev => [...prev, 2]);
        } else if (next === 90) {
          setStatus('Checking Grammatical Range');
          setCompletedSteps(prev => [...prev, 3]);
        } else if (next === 98) {
          setStatus('Generating Detailed Feedback');
        }
        
        return next;
      });
    }, 80); 

    return () => clearInterval(timer);
  }, [onComplete]);

  // Determine current active step based on progress
  const activeStepIndex = progress < 25 ? 0 : progress < 50 ? 1 : progress < 75 ? 2 : progress < 90 ? 3 : -1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/5 backdrop-blur-[2px]">
      <div className="bg-white w-full max-w-[380px] rounded-[20px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] p-7 relative animate-in zoom-in-95 duration-300">
        <button className="absolute top-5 right-5 text-[#1a1f36] hover:opacity-70 transition-all">
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center">
          {/* Top Progress Circle */}
          <div className="relative w-[56px] h-[56px] mb-4">
            <svg className="w-full h-full rotate-[-90deg]">
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="#EFF6FF"
                strokeWidth="4"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="#0084FF"
                strokeWidth="4"
                strokeDasharray="150.8"
                strokeDashoffset={150.8 - (150.8 * progress) / 100}
                strokeLinecap="round"
                className="transition-all duration-300 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <img 
                src="/images/upload and mock/Group.png" 
                alt="Brain Icon"
                className="w-7 h-7 object-contain animate-brainPulse"
              />
            </div>
          </div>

          <h2 className="text-[18px] font-extrabold text-[#1a1f36] mb-1.5 text-center tracking-tight">AI is grading your easy</h2>
          <p className="text-[12px] text-[#4B5563] mb-5 text-center font-medium opacity-80">
            This takes 45-60 seconds. Please keep this tab open.
          </p>

          {/* Detailed Progress Bar */}
          <div className="w-full bg-[#EBF5FF] rounded-[12px] p-4 mb-5 border border-[#DBEAFE]/50">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[12px] font-bold text-[#1a1f36]">{status}</span>
              <span className="text-[12px] font-bold text-[#1a1f36] opacity-60">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#0084FF] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Checklist */}
          <div className="w-full space-y-3.5">
            {steps.map((step, i) => {
              const isCompleted = completedSteps.includes(i);
              const isActive = activeStepIndex === i;
              
              return (
                <div key={i} className="flex items-center gap-3.5">
                  <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-500 ${
                    isCompleted 
                      ? 'bg-[#8ED9D4] border-none' 
                      : isActive 
                        ? 'border-2 border-[#0084FF] border-t-transparent animate-spin' 
                        : 'border-2 border-[#E5E7EB]'
                  }`}>
                    {isCompleted ? (
                      <svg width="11" height="8" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1.5 5L5 8.5L12.5 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : isActive ? (
                      <div className="w-full h-full rounded-full border-2 border-[#0084FF] opacity-20"></div>
                    ) : null}
                  </div>
                  <span className={`text-[13px] font-medium transition-all duration-500 ${
                    isCompleted 
                      ? 'text-[#9CA3AF]' 
                      : isActive 
                        ? 'text-[#1a1f36] font-bold' 
                        : 'text-[#9CA3AF]'
                  }`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes brainPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        .animate-brainPulse {
          animation: brainPulse 2s ease-in-out infinite;
        }
      ` }} />
    </div>
  );
};

export default GradingModal;
