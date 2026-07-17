import React, { useState, useRef } from 'react';
import { ChevronLeft, Paperclip, Maximize2 } from 'lucide-react';
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
 * @param {boolean} [showMaximize]
 * @param {() => void} [onMaximize]
 * @param {boolean} [hidePageTitle] when page chrome provides the title
 */
export default function GradeEssayForm({
  variant = 'card',
  onBack,
  showMaximize = false,
  onMaximize,
  hidePageTitle = false,
}) {
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
  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

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

  const handlePromptFile = async (e) => {
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
  };

  const handleEssayFile = async (e) => {
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
  };

  /* ─── Page variant: full-viewport split workspace ─── */
  if (isPage) {
    return (
      <div className="h-full flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Prompt pane */}
          <div className="w-full md:w-[40%] lg:w-[420px] max-h-[42%] md:max-h-none flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-[#E5E7EB] bg-[#F8FAFC] shrink-0 md:shrink">
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 pt-3.5 pb-2 shrink-0">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#667085] m-0">
                Question / Prompt
                <span className="font-medium normal-case tracking-normal text-[#98A2B3] ml-1.5">(optional)</span>
              </label>
              <button
                type="button"
                onClick={() => promptFileRef.current?.click()}
                title="Upload prompt"
                className="p-1.5 rounded-[8px] text-[#667085] hover:text-[#101828] hover:bg-white border border-transparent hover:border-[#E5E7EB] transition-colors"
              >
                <Paperclip size={15} />
              </button>
              <input
                ref={promptFileRef}
                type="file"
                accept={UPLOAD_ACCEPT}
                className="hidden"
                onChange={handlePromptFile}
              />
            </div>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Paste or upload your IELTS question…"
              className="flex-1 min-h-0 w-full px-4 sm:px-5 pb-4 bg-transparent outline-none resize-none text-[14px] sm:text-[15px] text-[#344054] leading-[1.7] placeholder:text-[#D0D5DD] custom-scrollbar"
            />
            {questionChartImage && (
              <p className="px-4 sm:px-5 pb-3 text-[11px] text-[#059669] shrink-0">
                Question image retained for chart grading.
              </p>
            )}
          </div>

          {/* Essay pane */}
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 pt-3.5 pb-2 shrink-0 border-b border-[#F2F4F7]">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#667085] m-0">
                Your essay
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#98A2B3] tabular-nums">
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </span>
                <button
                  type="button"
                  onClick={() => essayFileRef.current?.click()}
                  title="Upload essay"
                  className="p-1.5 rounded-[8px] text-[#667085] hover:text-[#101828] hover:bg-[#F8FAFC] border border-transparent hover:border-[#E5E7EB] transition-colors"
                >
                  <Paperclip size={15} />
                </button>
                <input
                  ref={essayFileRef}
                  type="file"
                  accept={UPLOAD_ACCEPT}
                  className="hidden"
                  onChange={handleEssayFile}
                />
              </div>
            </div>
            <textarea
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              placeholder="Start writing, paste, or upload PDF / DOCX / image…"
              className="flex-1 min-h-0 w-full px-4 sm:px-5 py-3 outline-none resize-none text-[15px] md:text-[16px] text-[#475467] leading-[1.75] placeholder:text-[#D0D5DD] custom-scrollbar"
            />
          </div>
        </div>

        {/* Sticky footer CTA */}
        <div className="shrink-0 border-t border-[#E5E7EB] bg-white px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
          {fileReadError && (
            <p className="text-[12px] text-red-500 m-0 sm:flex-1 order-first sm:order-none">
              {fileReadError}
            </p>
          )}
          <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${fileReadError ? '' : 'sm:ml-auto'} w-full sm:w-auto`}>
            {!user && (
              <p className="text-[12px] text-[#667085] m-0 text-center sm:text-right order-last sm:order-first">
                Free account includes 1 full evaluation. No card required.
              </p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isUploadFormValid || isSubmitting}
              className={`w-full sm:w-auto sm:min-w-[200px] h-[48px] px-6 rounded-[14px] font-semibold text-[14px] transition-all shadow-sm ${
                isUploadFormValid && !isSubmitting
                  ? 'bg-[#2C3E50] text-white hover:bg-[#1D2939]'
                  : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Analyzing…' : user ? 'Analyze My Essay' : 'Get my free tutor report'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Card variant: compact landing hero form ─── */
  const labelClass = 'block text-[13px] font-medium text-[#4B5563] mb-1.5';
  const textareaClass =
    'w-full min-h-[72px] px-4 py-2.5 pr-11 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] text-[#1a1f36] placeholder-[#D0D5DD] outline-none focus:border-[#3B82F6] transition-all resize-y';
  const essayTextareaClass =
    'w-full min-h-[120px] px-4 py-2.5 pr-11 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] text-[#1a1f36] placeholder-[#D0D5DD] outline-none focus:border-[#3B82F6] transition-all resize-y';

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-fadeIn">
      <div className="flex items-center gap-2 mb-6">
        <button type="button" onClick={onBack} className="p-1.5 hover:bg-[#F3F4F6] rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5 text-[#1a1f36]" />
        </button>
        <h3 className="text-[18px] font-bold text-[#1a1f36] flex-1">Grade my essay</h3>
        {showMaximize && onMaximize && (
          <button
            type="button"
            onClick={onMaximize}
            title="Open full editor"
            className="p-1.5 hover:bg-[#EFF6FF] rounded-full transition-colors text-[#6B7280] hover:text-[#3B82F6]"
          >
            <Maximize2 className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        <p className="text-[12px] text-[#6B7280]">
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
              rows={3}
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
              onChange={handlePromptFile}
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
              rows={5}
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
              onChange={handleEssayFile}
            />
          </div>
          {fileReadError && (
            <p className="text-[11px] text-red-500 mt-1">{fileReadError}</p>
          )}
        </div>
      </div>

      <div className="shrink-0 mt-6">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isUploadFormValid || isSubmitting}
          className={`w-full h-[52px] rounded-[10px] font-bold text-[15px] transition-all ${
            isUploadFormValid && !isSubmitting
              ? 'bg-[#1a1f36] text-white hover:bg-[#2a2f46] shadow-lg'
              : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Analyzing…' : user ? 'Analyze My Essay' : 'Get my free tutor report'}
        </button>
        {!user && (
          <p className="text-[12px] text-[#6B7280] text-center mt-3 mb-0">
            Free account includes 1 full evaluation. No card required.
          </p>
        )}
      </div>
    </div>
  );
}
