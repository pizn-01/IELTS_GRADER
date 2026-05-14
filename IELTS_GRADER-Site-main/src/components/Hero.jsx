import React, { useState } from 'react';
import { Upload, Clock, Info, Star, Zap, ShieldCheck, ChevronDown, ChevronLeft, FileText, X } from 'lucide-react';
import { useGrade } from '../context/GradeContext';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();
  const { essayData, updateEssayData, userStatus } = useGrade();
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [cardView, setCardView] = useState('default'); // 'default', 'mock', 'upload'
  const [files, setFiles] = useState({ prompt: null, essay: null });

  const tooltips = {
    essay: { text: "Upload both your IELTS question prompt and your written answer for accurate evaluation." },
    mock: { text: "Practice under exam conditions to simulate a real computer-based IELTS environment." }
  };

  const Tooltip = ({ text }) => (
    <div className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-[240px] bg-[#1a1f36] rounded-lg p-4 shadow-2xl z-50 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-200">
      <p className="m-0 text-[13px] leading-relaxed font-normal text-white opacity-95">{text}</p>
      <div className="absolute top-[-5px] left-1/2 -translate-x-1/2 rotate-45 w-[10px] h-[10px] bg-[#1a1f36]"></div>
    </div>
  );

  const handleFileChange = (type, file) => {
    setFiles(prev => ({ ...prev, [type]: file }));
    updateEssayData({ [`${type}File`]: file });
  };

  const removeFile = (type) => {
    setFiles(prev => ({ ...prev, [type]: null }));
    updateEssayData({ [`${type}File`]: null });
  };

  const isUploadFormValid = essayData.examType && essayData.taskType && files.essay;

  return (
    <header id="about" className="bg-[#1A96F30D] relative min-h-[700px] overflow-hidden flex items-center">
      <div className="max-w-[1280px] mx-auto px-10 lg:px-16 py-12 lg:py-20 w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        
        {/* Left Column - Hero Content */}
        <div className="w-full lg:w-[55%] animate-fadeIn">
          <div className="inline-flex items-center px-4 py-1.5 bg-[#FEF9C3] border border-[#FDE68A] rounded-full text-[13px] font-medium text-[#78350F] mb-6">
            Trusted by <span className="font-bold text-[#1a1f36] mx-1">1 million+</span> students and <span className="font-bold text-[#1a1f36] mx-1">20k+</span> schools
          </div>

          <h1 className="text-[48px] lg:text-[62px] font-bold text-[#1a1f36] leading-[1.05] tracking-[-0.03em] mb-8 font-['Nunito',_sans-serif]">
            Get Your IELTS Band<br />
            Score & Fix Cards in<br />
            <span className="text-[#3B82F6]">60 Seconds.</span>
          </h1>

          <p className="text-[17px] text-[#6B7280] leading-[1.6] mb-10 max-w-[540px]">
            Stop guessing your score. Upload your essay and get a full AI-powered breakdown with corrections, band score, and improvement plan — completely free.
          </p>

          <div className="space-y-5 mb-10">
            <div className="flex items-center gap-4 text-[16px] font-medium text-[#1a1f36]">
              <Star className="w-5 h-5 text-[#F59E0B]" fill="#F59E0B" strokeWidth={2} />
              Used by 10,000+ IELTS students
            </div>
            <div className="flex items-center gap-4 text-[16px] font-medium text-[#1a1f36]">
              <Zap className="w-5 h-5 text-[#2DD4BF]" strokeWidth={2} />
              Results in 60 seconds
            </div>
            <div className="flex items-center gap-4 text-[16px] font-medium text-[#1a1f36]">
              <ShieldCheck className="w-5 h-5 text-[#2DD4BF]" strokeWidth={2} />
              Aligned with official IELTS criteria
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[ 'photo-1534528741775-53994a69daeb', 'photo-1506794778202-cad84cf45f1d', 'photo-1494790108377-be9c29b29330', 'photo-1500648767791-00dcc994a43e' ].map((id, i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                  <img src={`https://images.unsplash.com/${id}?w=100&h=100&fit=crop`} alt="User" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-[#F59E0B]" fill="#F59E0B" />)}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold text-[#1a1f36]">4.9/5</span>
                <span className="text-[14px] text-[#9CA3AF]">from 2,400+ reviews</span>
              </div>
            </div>
          </div>
        </div>        {/* Right Column - Dynamic Card */}
        <div className="w-full lg:w-[45%] flex justify-center lg:justify-end animate-fadeIn">
          <div className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-7 w-full max-w-[480px] flex flex-col transition-all duration-500">
            
            {cardView === 'default' ? (
              <div className="flex-1 flex flex-col animate-fadeIn">
                <h3 className="text-[20px] font-bold text-[#1a1f36] mb-6">Evaluate Your Essay Writing Skills</h3>
                
                <div 
                  onClick={() => setSelectedOption('upload')} 
                  className={`group border rounded-[12px] p-5 mb-3 cursor-pointer transition-all text-center relative bg-white ${
                    selectedOption === 'upload' 
                      ? 'border-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                      : 'border-[#E5E7EB] hover:border-[#3B82F6] hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  }`}
                >
                  <div className="flex justify-center mb-3">
                    <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center transition-colors ${
                      selectedOption === 'upload' ? 'bg-[#EFF6FF]' : 'bg-[#F9FAFB] group-hover:bg-[#EFF6FF]'
                    }`}>
                      <Upload className={`w-5 h-5 transition-colors ${selectedOption === 'upload' ? 'text-[#3B82F6]' : 'text-[#9CA3AF] group-hover:text-[#3B82F6]'}`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className={`text-[16px] font-bold transition-colors ${selectedOption === 'upload' ? 'text-[#1a1f36]' : 'text-[#4B5563] group-hover:text-[#1a1f36]'}`}>Upload Essay</span>
                    <span className="relative flex items-center">
                      <Info 
                        onMouseEnter={() => setActiveTooltip('upload')}
                        onMouseLeave={() => setActiveTooltip(null)}
                        className={`w-[14px] h-[14px] cursor-help transition-colors ${selectedOption === 'upload' ? 'text-[#3B82F6]' : 'text-[#9CA3AF] group-hover:text-[#3B82F6]'}`} 
                      />
                      {activeTooltip === 'upload' && <Tooltip text={tooltips.essay.text} />}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#9CA3AF] leading-relaxed max-w-[320px] mx-auto">Upload your question and answer (PDF, Word, JPG, etc.)</p>
                </div>

                <div 
                  onClick={() => setSelectedOption('mock')} 
                  className={`group border rounded-[12px] p-5 mb-3 cursor-pointer transition-all text-center relative bg-white ${
                    selectedOption === 'mock' 
                      ? 'border-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                      : 'border-[#E5E7EB] hover:border-[#3B82F6] hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  }`}
                >
                  <div className="flex justify-center mb-3">
                    <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center transition-colors ${
                      selectedOption === 'mock' ? 'bg-[#EFF6FF]' : 'bg-[#F9FAFB] group-hover:bg-[#EFF6FF]'
                    }`}>
                      <Clock className={`w-5 h-5 transition-colors ${selectedOption === 'mock' ? 'text-[#3B82F6]' : 'text-[#9CA3AF] group-hover:text-[#3B82F6]'}`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className={`text-[16px] font-bold transition-colors ${selectedOption === 'mock' ? 'text-[#1a1f36]' : 'text-[#4B5563] group-hover:text-[#1a1f36]'}`}>Mock Exam</span>
                    <span className="relative flex items-center">
                      <Info 
                        onMouseEnter={() => setActiveTooltip('mock')}
                        onMouseLeave={() => setActiveTooltip(null)}
                        className={`w-[14px] h-[14px] cursor-help transition-colors ${selectedOption === 'mock' ? 'text-[#3B82F6]' : 'text-[#9CA3AF] group-hover:text-[#3B82F6]'}`} 
                      />
                      {activeTooltip === 'mock' && <Tooltip text={tooltips.mock.text} />}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#9CA3AF] leading-relaxed max-w-[320px] mx-auto">Practice in a real IELTS computer-based environment with timer</p>
                </div>

                <button 
                  onClick={() => selectedOption && setCardView(selectedOption)} 
                  disabled={!selectedOption}
                  className={`w-full h-[50px] rounded-[10px] font-bold text-[16px] mt-2 transition-all shadow-md active:scale-[0.98] ${
                    selectedOption ? 'bg-[#1a1f36] text-white hover:bg-[#2a2f46]' : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ) : cardView === 'mock' ? (
              <div className="flex-1 flex flex-col animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setCardView('default')} className="p-1.5 hover:bg-[#F3F4F6] rounded-full transition-colors">
                    <ChevronLeft className="w-5 h-5 text-[#1a1f36]" />
                  </button>
                  <h3 className="text-[18px] font-bold text-[#1a1f36]">Mock Exam</h3>
                </div>

                <div className="space-y-5 flex-1">
                  <div>
                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Exam Type</label>
                    <div className="relative">
                      <select 
                        value={essayData.examType}
                        onChange={(e) => updateEssayData({ examType: e.target.value })}
                        className="w-full h-[46px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[14px] text-[#1a1f36] appearance-none focus:border-[#3B82F6] outline-none transition-all cursor-pointer"
                      >
                        <option value="">Select</option>
                        <option value="Academic">Academic</option>
                        <option value="General">General</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Task Type</label>
                    <div className="relative">
                      <select 
                        value={essayData.taskType}
                        onChange={(e) => updateEssayData({ taskType: e.target.value })}
                        className="w-full h-[46px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[14px] text-[#1a1f36] appearance-none focus:border-[#3B82F6] outline-none transition-all cursor-pointer"
                      >
                        <option value="">Select</option>
                        <option value="Task 1">Task 1</option>
                        <option value="Task 2">Task 2</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/mock-exam')}
                  disabled={!essayData.examType || !essayData.taskType}
                  className={`w-full h-[50px] rounded-[8px] font-bold text-[15px] mt-8 transition-all ${
                    (essayData.examType && essayData.taskType)
                      ? 'bg-[#1a1f36] text-white hover:bg-[#2a2f46] shadow-lg' 
                      : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                  }`}
                >
                  Start Mock Exam
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setCardView('default')} className="p-1.5 hover:bg-[#F3F4F6] rounded-full transition-colors">
                    <ChevronLeft className="w-5 h-5 text-[#1a1f36]" />
                  </button>
                  <h3 className="text-[18px] font-bold text-[#1a1f36]">Upload Essay</h3>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1 pb-2">
                  <div>
                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Exam Type</label>
                    <div className="relative">
                      <select 
                        value={essayData.examType}
                        onChange={(e) => updateEssayData({ examType: e.target.value })}
                        className="w-full h-[44px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[14px] text-[#1a1f36] appearance-none focus:border-[#3B82F6] outline-none transition-all cursor-pointer"
                      >
                        <option value="">Select</option>
                        <option value="Academic">Academic</option>
                        <option value="General">General</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Task Type</label>
                    <div className="relative">
                      <select 
                        value={essayData.taskType}
                        onChange={(e) => updateEssayData({ taskType: e.target.value })}
                        className="w-full h-[44px] px-4 bg-white border border-[#E5E7EB] rounded-[8px] text-[14px] text-[#1a1f36] appearance-none focus:border-[#3B82F6] outline-none transition-all cursor-pointer"
                      >
                        <option value="">Select</option>
                        <option value="Task 1">Task 1</option>
                        <option value="Task 2">Task 2</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    </div>
                  </div>

                  {/* File Uploads */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Upload Prompt / Question</label>
                      {!files.prompt ? (
                        <div className="relative h-[56px] border-[1.5px] border-dashed border-[#3B82F6]/30 bg-[#EFF6FF]/50 rounded-[8px] flex items-center px-4 hover:border-[#3B82F6] transition-colors cursor-pointer group">
                          <input type="file" onChange={(e) => handleFileChange('prompt', e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center mr-3 shadow-sm group-hover:scale-105 transition-transform">
                            <Upload className="w-3.5 h-3.5 text-[#3B82F6]" />
                          </div>
                          <span className="text-[12px] font-bold text-[#3B82F6]">Upload prompt</span>
                        </div>
                      ) : (
                        <div className="h-[56px] bg-[#EFF6FF] border border-[#3B82F6]/20 rounded-[8px] flex items-center px-4">
                          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center mr-3 shadow-sm">
                            <FileText className="w-3.5 h-3.5 text-[#3B82F6]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-[#1a1f36] truncate">{files.prompt.name}</p>
                            <p className="text-[10px] text-[#6B7280]">{(files.prompt.size / 1024).toFixed(0)} KB</p>
                          </div>
                          <button onClick={() => removeFile('prompt')} className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Upload Your Essay</label>
                      {!files.essay ? (
                        <div className="relative h-[56px] border-[1.5px] border-dashed border-[#3B82F6]/30 bg-[#EFF6FF]/50 rounded-[8px] flex items-center px-4 hover:border-[#3B82F6] transition-colors cursor-pointer group">
                          <input type="file" onChange={(e) => handleFileChange('essay', e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center mr-3 shadow-sm group-hover:scale-105 transition-transform">
                            <Upload className="w-3.5 h-3.5 text-[#3B82F6]" />
                          </div>
                          <span className="text-[12px] font-bold text-[#3B82F6]">Upload essay</span>
                        </div>
                      ) : (
                        <div className="h-[56px] bg-[#EFF6FF] border border-[#3B82F6]/20 rounded-[8px] flex items-center px-4">
                          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center mr-3 shadow-sm">
                            <FileText className="w-3.5 h-3.5 text-[#3B82F6]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-[#1a1f36] truncate">{files.essay.name}</p>
                            <p className="text-[10px] text-[#6B7280]">{(files.essay.size / 1024).toFixed(0)} KB</p>
                          </div>
                          <button onClick={() => removeFile('essay')} className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (userStatus.isLoggedIn) {
                      navigate('/analysis-ready');
                    } else {
                      navigate('/selection');
                    }
                  }}
                  disabled={!isUploadFormValid}
                  className={`w-full h-[50px] rounded-[8px] font-bold text-[15px] mt-6 transition-all ${
                    isUploadFormValid 
                      ? 'bg-[#1a1f36] text-white hover:bg-[#2a2f46] shadow-lg' 
                      : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                  }`}
                >
                  Analyze My Essay
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Hero;
