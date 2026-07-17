import React, { useState, useRef } from 'react';
import { ChevronLeft, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGrade } from '../context/GradeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { extractFileText, UPLOAD_ACCEPT } from '../utils/extractFileText';
import { normalizeParagraphBreaks } from '../utils/normalizeParagraphBreaks';
import { setPendingGradePayload } from '../utils/authStorage';

const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });

const isImageFile = (file) =>
  file && (file.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(file.name || ''));

/**
 * Shared grade essay form used by the landing hero card and /grade-my-essay page.
 * @param {'card' | 'page'} variant
 * @param {() => void} [onBack] shown only for card variant
 */
export default function GradeEssayForm({ variant = 'card', onBack }) {
  const navigate = useNavigate();
  const { updateEssayData, setGradingStatus, setSubmissionId } = useGrade();
  const { user } = useAuth();

  const [fileReadError, setFileReadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [essayText, setEssayText] = useState('');
  const [questionChartImage, setQuestionChartImage] = useState(null);
  const promptFileRef = useRef(null);
  const essayFileRef = useRef(null);

  const isPage = variant === 'page';
  const isUploadFormValid = essayText.trim().length > 0;

  const handleSubmit = async () => {
    if (!essayText.trim()) return;
    setFileReadError('');
    setIsSubmitting(true);
    try {
      const detectSource = (questionText || essayText).trim();
      const detected = await api.detectTask(detectSource);
      const promptForGrading = normalizeParagraphBreaks(
        (questionText || detected.prompt || '').trim(),
      );
      const essayForGrading = normalizeParagraphBreaks(essayText);
      const gradePayload = {
        essayContent: essayForGrading,
        questionContent: promptForGrading,
        examType: detected.exam_type,
        taskType: detected.task_type,
        bulletPoints: detected.bulletPoints || [],
        letterType: detected.letterType || null,
        openingLine: detected.openingLine || '',
        chartType: detected.chartType || null,
        taskVariant: detected.task || null,
        chartImage:
          detected.task === 'task1-report' ? questionChartImage : null,
        timeSpentSeconds: 0,
      };
      updateEssayData(gradePayload);

      if (!user) {
        setPendingGradePayload(gradePayload);
        setIsSubmitting(false);
        navigate('/login', {
          state: { from: { pathname: '/analysis-ready' } },
        });
        return;
      }
      if (user.credits_remaining > 0) {
        const res = await api.submitAttempt({
          exam_type: detected.exam_type,
          task_type: detected.task_type,
          essay_content: essayForGrading,
          question_text: promptForGrading,
          bullet_points: detected.bulletPoints || [],
          letter_type: detected.letterType || undefined,
          opening_line: detected.openingLine || undefined,
          chart_type: detected.chartType || undefined,
          chart_image:
            detected.task === 'task1-report' && questionChartImage
              ? questionChartImage
              : undefined,
          time_spent_seconds: 0,
        });
        setSubmissionId(res.submission_id);
        setGradingStatus('processing');
        navigate('/analysis-ready');
      } else {
        navigate('/analysis-ready');
      }
    } catch (err) {
      if (err.message && err.message.includes('Insufficient evaluation credits')) {
        navigate('/analysis-ready', { state: { outOfCredits: true } });
      } else {
        setFileReadError(err.message || 'Submission failed. Please try again.');
        setIsSubmitting(false);
      }
    }
  };

  const promptRows = isPage ? 5 : 3;
  const essayRows = isPage ? 10 : 5;
  const promptMinH = isPage ? 'min-h-[120px]' : 'min-h-[72px]';
  const essayMinH = isPage ? 'min-h-[220px]' : 'min-h-[120px]';
  const labelClass = isPage
    ? 'block text-[14px] font-medium text-[#4B5563] mb-2'
    : 'block text-[13px] font-medium text-[#4B5563] mb-1.5';
  const textareaClass = isPage
    ? `w-full ${promptMinH} px-4 py-3 pr-11 bg-white border border-[#E5E7EB] rounded-[12px] text-[14px] text-[#1a1f36] placeholder-[#D0D5DD] outline-none focus:border-[#3B82F6] transition-all resize-y`
    : `w-full ${promptMinH} px-4 py-2.5 pr-11 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] text-[#1a1f36] placeholder-[#D0D5DD] outline-none focus:border-[#3B82F6] transition-all resize-y`;
  const essayTextareaClass = isPage
    ? `w-full ${essayMinH} px-4 py-3 pr-11 bg-white border border-[#E5E7EB] rounded-[12px] text-[14px] text-[#1a1f36] placeholder-[#D0D5DD] outline-none focus:border-[#3B82F6] transition-all resize-y`
    : `w-full ${essayMinH} px-4 py-2.5 pr-11 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] text-[#1a1f36] placeholder-[#D0D5DD] outline-none focus:border-[#3B82F6] transition-all resize-y`;

  return (
    <div className={`flex-1 flex flex-col ${isPage ? '' : 'animate-fadeIn'}`}>
      {!isPage && (
        <div className="flex items-center gap-3 mb-6">
          <button type="button" onClick={onBack} className="p-1.5 hover:bg-[#F3F4F6] rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-[#1a1f36]" />
          </button>
          <h3 className="text-[18px] font-bold text-[#1a1f36]">Grade my essay</h3>
        </div>
      )}

      {isPage && (
        <h2 className="text-[22px] font-bold text-[#1a1f36] mb-2 tracking-tight">Grade my essay</h2>
      )}

      <div className={`flex-1 ${isPage ? 'space-y-5' : 'space-y-4'}`}>
        <p className={isPage ? 'text-[14px] text-[#6B7280] mb-1' : 'text-[12px] text-[#6B7280]'}>
          Task type is detected automatically from your question prompt (or essay if no prompt is provided).
        </p>

        <div>
          <label className={labelClass}>
            Your Question / Prompt <span className="text-[#9CA3AF] font-normal">(recommended)</span>
          </label>
          <div className="relative">
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Type, paste, or upload PDF / DOCX / image (paragraphs preserved)"
              rows={promptRows}
              className={textareaClass}
            />
            <button
              type="button"
              onClick={() => promptFileRef.current?.click()}
              className="absolute right-3 top-3 text-[#6B7280] hover:text-[#1a1f36] transition-colors p-0.5"
            >
              <Paperclip size={16} />
            </button>
            <input
              ref={promptFileRef}
              type="file"
              accept={UPLOAD_ACCEPT}
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files[0];
                e.target.value = '';
                if (!file) return;
                setFileReadError('');
                try {
                  if (isImageFile(file)) {
                    setQuestionChartImage(await readAsDataURL(file));
                  } else {
                    setQuestionChartImage(null);
                  }
                  const text = normalizeParagraphBreaks(await extractFileText(file));
                  setQuestionText(text.trim());
                } catch (err) {
                  setFileReadError(err.message || 'Could not read the question file.');
                }
              }}
            />
          </div>
          {questionChartImage && (
            <p className="text-[11px] text-[#059669] mt-1">
              Question image retained for chart grading (not shown in the text box).
            </p>
          )}
        </div>

        <div>
          <label className={labelClass}>Your Essay</label>
          <div className="relative">
            <textarea
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              placeholder="Type, paste, or upload PDF / DOCX / image (paragraphs preserved)"
              rows={essayRows}
              className={essayTextareaClass}
            />
            <button
              type="button"
              onClick={() => essayFileRef.current?.click()}
              className="absolute right-3 top-3 text-[#6B7280] hover:text-[#1a1f36] transition-colors p-0.5"
            >
              <Paperclip size={16} />
            </button>
            <input
              ref={essayFileRef}
              type="file"
              accept={UPLOAD_ACCEPT}
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files[0];
                e.target.value = '';
                if (!file) return;
                setFileReadError('');
                try {
                  const text = normalizeParagraphBreaks(await extractFileText(file));
                  setEssayText(text.trim());
                } catch (err) {
                  setFileReadError(err.message || 'Could not read file.');
                }
              }}
            />
          </div>
          {fileReadError && (
            <p className="text-[11px] text-red-500 mt-1">{fileReadError}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isUploadFormValid || isSubmitting}
        className={`w-full h-[50px] rounded-[10px] font-bold text-[15px] ${isPage ? 'mt-8' : 'mt-6'} transition-all ${
          isUploadFormValid && !isSubmitting
            ? 'bg-[#1a1f36] text-white hover:bg-[#2a2f46] shadow-lg'
            : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
        }`}
      >
        {isSubmitting ? 'Analyzing…' : user ? 'Analyze My Essay' : 'Get my free tutor report'}
      </button>
      {!user && (
        <p className={`text-[12px] text-[#6B7280] text-center ${isPage ? 'mt-4' : 'mt-3'}`}>
          Free account includes 1 full evaluation. No card required.
        </p>
      )}
    </div>
  );
}
