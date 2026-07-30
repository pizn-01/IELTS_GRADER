import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Paperclip, Maximize2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGrade } from '../context/GradeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { extractFileText, UPLOAD_ACCEPT } from '../utils/extractFileText';
import { normalizeParagraphBreaks } from '../utils/normalizeParagraphBreaks';
import { setPendingGradePayload } from '../utils/authStorage';
import { FREE_TRIAL_CREDITS } from '../constants/subscriptionPlans';
import { redirectIfNeedsDashboardBridge } from '../utils/dashboardBridge';

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
 * @param {(draft: { questionText: string, essayText: string, questionChartImage: string|null }) => void} [onMaximize]
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
  const location = useLocation();
  const { updateEssayData, setGradingStatus, setSubmissionId } = useGrade();
  const { user } = useAuth();

  const draft =
    variant === 'page' && location.state && typeof location.state === 'object'
      ? location.state
      : null;

  const [fileReadError, setFileReadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionText, setQuestionText] = useState(draft?.questionText || '');
  const [essayText, setEssayText] = useState(draft?.essayText || '');
  const [questionChartImage, setQuestionChartImage] = useState(
    draft?.questionChartImage || null,
  );
  const [showChartImageNote, setShowChartImageNote] = useState(false);
  const promptFileRef = useRef(null);
  const essayFileRef = useRef(null);

  // Keep chart image for grading; only auto-hide the status note.
  useEffect(() => {
    if (!questionChartImage) {
      setShowChartImageNote(false);
      return undefined;
    }
    setShowChartImageNote(true);
    const timer = setTimeout(() => setShowChartImageNote(false), 3000);
    return () => clearTimeout(timer);
  }, [questionChartImage]);

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
      if (await redirectIfNeedsDashboardBridge({ userId: user.id, navigate })) {
        setIsSubmitting(false);
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

  /* ─── Page variant: Mock Exam–aligned full-bleed workspace ─── */
  if (isPage) {
    const exitTo = user ? '/dashboard' : '/';
    const activePill =
      'inline-flex items-center justify-center px-2.5 md:px-5 h-[30px] md:h-[36px] bg-[#2C3E50] text-white rounded-[8px] text-[11px] md:text-[14px] font-semibold leading-none';
    const idlePill =
      'inline-flex items-center justify-center px-2.5 md:px-5 h-[30px] md:h-[36px] border border-gray-200 rounded-[8px] text-[11px] md:text-[14px] font-semibold leading-none text-[#344054]';

    return (
      <div className="h-full flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Prompt pane — Mock dimensions */}
          <div className="w-full md:w-[400px] lg:w-[480px] max-h-[46vh] md:max-h-none border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto p-4 md:p-10 bg-[#F8FAFC] shrink-0 md:shrink flex flex-col min-h-0">
            <div className="mb-4 md:mb-6 flex items-center justify-between gap-3 shrink-0">
              <span className="bg-[#E0F2FE] text-[#0EA5E9] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Exam Question
              </span>
              <button
                type="button"
                onClick={() => promptFileRef.current?.click()}
                title="Upload prompt"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold text-[#344054] border border-gray-200 hover:bg-white transition-all"
              >
                <Paperclip size={14} />
                <span className="hidden sm:inline">Upload</span>
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
              className="flex-1 min-h-[120px] w-full bg-transparent outline-none resize-none text-[15px] md:text-[16px] text-[#475467] leading-[1.8] placeholder:text-gray-300 custom-scrollbar"
            />
          </div>

          {/* Essay pane — Mock borderless editor */}
          <div className="flex-1 flex flex-col bg-white min-h-0">
            <textarea
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              placeholder="Start writing your essay here..."
              className="flex-1 p-4 md:p-10 outline-none text-[15px] md:text-[16px] text-[#475467] leading-[1.8] font-normal resize-none placeholder:text-gray-300 custom-scrollbar min-h-0"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Status strip (errors / chart image note — chart note auto-hides) */}
        {(fileReadError || showChartImageNote) && (
          <div
            className={`px-4 md:px-8 py-1.5 text-[12px] font-medium flex items-center gap-2 border-t shrink-0 ${
              fileReadError
                ? 'bg-red-50 border-red-100 text-red-500'
                : 'bg-[#F0F9FF] border-[#DBEAFE] text-[#1A96F3]'
            }`}
          >
            <Paperclip size={13} className="shrink-0" />
            {fileReadError || 'Question image retained for chart grading.'}
          </div>
        )}

        {/* Mock-style footer */}
        <footer className="border-t border-gray-100 flex items-center justify-between px-2 md:px-8 h-[52px] md:h-[64px] bg-white shrink-0 gap-2">
          <div className="flex gap-1.5" aria-label="Grade essay workspace">
            <span className={idlePill}>Prompt</span>
            <span className={activePill} aria-current="true">Essay</span>
          </div>

          <div className="text-[12px] md:text-[14px] font-medium text-gray-500 tabular-nums">
            {wordCount} words
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            {!user && (
              <p className="hidden lg:block text-[11px] text-gray-500 m-0 max-w-[160px] text-right leading-snug">
                {FREE_TRIAL_CREDITS} free evaluations. No card required.
              </p>
            )}
            <button
              type="button"
              onClick={() => essayFileRef.current?.click()}
              title="Upload essay"
              className="w-[30px] h-[30px] md:w-[34px] md:h-[34px] flex items-center justify-center rounded-[8px] text-[#344054] hover:bg-gray-50 transition-all"
            >
              <Paperclip size={17} />
            </button>
            <input
              ref={essayFileRef}
              type="file"
              accept={UPLOAD_ACCEPT}
              className="hidden"
              onChange={handleEssayFile}
            />
            <button
              type="button"
              onClick={() => navigate(exitTo)}
              className="flex items-center px-2.5 md:px-4 h-[30px] md:h-[34px] border border-gray-200 rounded-[8px] text-[11px] md:text-[13px] font-semibold text-[#344054] hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isUploadFormValid || isSubmitting}
              className="px-2.5 md:px-5 h-[30px] md:h-[36px] bg-[#2C3E50] text-white rounded-[8px] text-[11px] md:text-[14px] font-semibold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isSubmitting
                ? 'Analyzing…'
                : (
                  <>
                    <span className="hidden sm:inline">{user ? 'Analyze My Essay' : 'Get my free tutor report'}</span>
                    <span className="sm:hidden">{user ? 'Analyze' : 'Get report'}</span>
                  </>
                )}
            </button>
          </div>
        </footer>
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
        {showMaximize && (
          <button
            type="button"
            onClick={() => {
              const payload = { questionText, essayText, questionChartImage };
              if (onMaximize) {
                onMaximize(payload);
              } else {
                navigate('/grade-my-essay', { state: payload });
              }
            }}
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
            Exam Question
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
          {showChartImageNote && (
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
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
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
            Free account includes {FREE_TRIAL_CREDITS} full evaluations. No card required.
          </p>
        )}
      </div>
    </div>
  );
}
