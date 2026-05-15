import React, { useState, useEffect } from 'react';
import { Check, X, Brain } from 'lucide-react';

const AIProcessingModal = ({ isOpen, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  const steps = [
    "Task Response",
    "Coherence",
    "Lexical Resource",
    "Grammatical"
  ];

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCompletedSteps([]);
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 89) {
          clearInterval(interval);
          setTimeout(onComplete, 1200);
          return 89;
        }
        return prev + 1.2;
      });
    }, 400); 

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (progress > 20 && !completedSteps.includes(0)) setCompletedSteps(prev => [...prev, 0]);
    if (progress > 45 && !completedSteps.includes(1)) setCompletedSteps(prev => [...prev, 1]);
    if (progress > 70 && !completedSteps.includes(2)) setCompletedSteps(prev => [...prev, 2]);
    if (progress > 85 && !completedSteps.includes(3)) setCompletedSteps(prev => [...prev, 3]);
  }, [progress]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-md transition-all duration-500"></div>
      
      {/* Modal Container */}
      <div className="bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-8 w-full max-w-[380px] relative z-10 animate-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button onClick={onComplete} className="absolute top-5 right-5 p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          {/* Top Progress Circle */}
          <div className="relative w-16 h-16 mb-6">
            <svg className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r="29" fill="transparent" stroke="#F1F5F9" strokeWidth="4" />
              <circle 
                cx="32" 
                cy="32" 
                r="29" 
                fill="transparent" 
                stroke="#3B82F6" 
                strokeWidth="4" 
                strokeDasharray="182.2" 
                strokeDashoffset={182.2 - (182.2 * progress / 100)} 
                strokeLinecap="round" 
                className="transition-all duration-300" 
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-6 h-6 text-[#3B82F6] animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-[20px] font-bold text-[#1a1f36] mb-2 text-center">AI is grading your essay</h2>
          <p className="text-[13px] text-[#64748B] mb-8 text-center font-medium opacity-80">
            This takes 45-60 seconds. Please keep this tab open.
          </p>

          {/* Progress Section */}
          <div className="w-full bg-[#F0F7FF] rounded-[16px] p-5 mb-8 border border-[#DBEAFE]/50">
            <div className="flex justify-between text-[13px] font-bold text-[#1a1f36] mb-3">
              <span>Finalizing Band Score</span>
              <span className="opacity-60">{Math.floor(progress)}%</span>
            </div>
            <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#3B82F6] transition-all duration-500 ease-out rounded-full" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps List */}
          <div className="w-full space-y-4 px-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3.5">
                <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-500 ${
                  completedSteps.includes(index) 
                    ? 'bg-[#2DD4BF]' 
                    : 'bg-white border-2 border-[#E5E7EB]'
                }`}>
                  {completedSteps.includes(index) ? (
                    <Check className="w-3 h-3 text-white" strokeWidth={4} />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]/20"></div>
                  )}
                </div>
                <span className={`text-[13px] font-medium ${
                  completedSteps.includes(index) ? 'text-[#1a1f36]' : 'text-[#9CA3AF]'
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIProcessingModal;
