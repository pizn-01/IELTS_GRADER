import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SeoHead from '../seo/SeoHead';
import GradeEssayForm from '../components/GradeEssayForm';
import { useAuth } from '../context/AuthContext';

const GradeEssayPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <>
      <SeoHead
        title="Grade My Essay: IELTS AI Tutor Feedback | IELTSGRADER"
        description="Paste or upload your IELTS essay for criterion scores, sentence-level fixes, and a personalized plan toward your target band. 1 free evaluation. No card required."
        path="/grade-my-essay"
      />
      <div className="fixed inset-0 z-[200] bg-white flex flex-col font-sans overflow-hidden">
        <header className="h-[64px] border-b border-gray-100 flex items-center justify-between px-4 md:px-6 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
              className="flex items-center justify-center w-8 h-8 rounded-[8px] border border-gray-200 text-[#344054] hover:bg-gray-50 transition-all shrink-0"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="text-[13px] md:text-[14px] font-semibold text-[#101828] truncate">
                Grade my essay
              </div>
              <div className="text-[10px] md:text-[11px] text-gray-500 font-medium truncate">
                Task type detected automatically
              </div>
            </div>
          </div>

          <span className="bg-[#E0F2FE] text-[#0EA5E9] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
            Auto-detect task
          </span>
        </header>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <GradeEssayForm variant="page" hidePageTitle />
        </div>
      </div>
    </>
  );
};

export default GradeEssayPage;
