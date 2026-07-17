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
      <main className="bg-[#F4F6F8] min-h-[calc(100dvh-64px)] flex flex-col">
        <div className="flex-1 flex flex-col max-w-[960px] w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* Slim tool chrome */}
          <div className="flex items-start gap-3 mb-4 shrink-0">
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
              className="mt-0.5 p-2 rounded-full hover:bg-white border border-transparent hover:border-[#E5E7EB] transition-colors text-[#6B7280] hover:text-[#1a1f36]"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-[20px] sm:text-[24px] font-bold text-[#1a1f36] tracking-tight m-0 font-['Nunito',_sans-serif]">
                Grade my essay
              </h1>
              <p className="text-[13px] text-[#6B7280] m-0 mt-1">
                Task type is detected automatically from your question prompt (or essay if no prompt is provided).
              </p>
            </div>
          </div>

          {/* Workspace card */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[16px] border border-[#E8ECF1] shadow-[0_8px_30px_rgba(26,31,54,0.06)] p-4 sm:p-6 lg:p-8">
            <GradeEssayForm variant="page" hidePageTitle />
          </div>
        </div>
      </main>
    </>
  );
};

export default GradeEssayPage;
