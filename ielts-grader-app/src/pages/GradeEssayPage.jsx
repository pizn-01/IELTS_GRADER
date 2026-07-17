import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../marketing/Navbar';
import SeoHead from '../seo/SeoHead';
import GradeEssayForm from '../components/GradeEssayForm';
import { useAuth } from '../context/AuthContext';

const GradeEssayPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <>
      <SeoHead
        title="Grade My Essay: IELTS Writing Feedback in 60 Seconds | IELTSGRADER"
        description="Paste or upload your IELTS essay for criterion band scores, sentence-level fixes, and a clear improvement plan. 1 free evaluation. No card required."
        path="/grade-my-essay"
      />
      <Navbar />
      <main className="h-[calc(100dvh-64px)] overflow-hidden bg-[#F4F6F8] flex flex-col font-sans">
        <div className="max-w-[1440px] w-full mx-auto flex-1 min-h-0 flex flex-col px-3 sm:px-5 py-3">
          {/* Slim tool chrome */}
          <div className="flex items-center gap-3 mb-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
              className="p-2 rounded-[10px] bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors text-[#667085] hover:text-[#101828] shadow-sm"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[18px] sm:text-[22px] font-bold text-[#101828] tracking-tight m-0">
                  Grade my essay
                </h1>
                <span className="bg-[#E0F2FE] text-[#0EA5E9] px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Auto-detect task
                </span>
              </div>
              <p className="text-[12px] sm:text-[13px] text-[#667085] m-0 mt-0.5 truncate">
                Task type is detected from your question prompt (or essay if no prompt is provided).
              </p>
            </div>
          </div>

          {/* Workspace card */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden">
            <GradeEssayForm variant="page" hidePageTitle />
          </div>
        </div>
      </main>
    </>
  );
};

export default GradeEssayPage;
