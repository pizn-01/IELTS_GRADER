import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, HelpCircle, RotateCcw, RefreshCw, Paperclip, ChevronDown, Clock, Loader2, ToggleRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useGrade } from '../context/GradeContext';
import { extractFileText, UPLOAD_ACCEPT } from '../utils/extractFileText';
import ExamQuestionPanel, { noteForTimeLimit } from './ExamQuestionPanel';
import { isGeneralTask1Letter } from '../utils/parseLetterQuestion';
import { detectChartType } from './QuestionChart';

const QUESTION_BANK = {
  'Academic-Task 2': [
    { prompt: "Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime. Discuss both these views and give your own opinion.", note: "Write at least 250 words. You have 40 minutes." },
    { prompt: "Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree?", note: "Write at least 250 words. You have 40 minutes." },
    { prompt: "In many countries, the proportion of older people is steadily increasing. Some think this is good; others believe this creates problems for society. Discuss both views and give your opinion.", note: "Write at least 250 words. You have 40 minutes." },
    { prompt: "Some people think that a sense of competition in children should be encouraged. Others believe that children who are taught to co-operate rather than compete become more useful adults. Discuss both views and give your own opinion.", note: "Write at least 250 words. You have 40 minutes." },
  ],
  'Academic-Task 1': [
    {
      prompt: 'The graph below shows the proportion of the population aged 65 and over between 1940 and 2040 in three different countries.',
      note: 'You should spend about 20 minutes on this task.\n\nWrite at least 150 words.',
      chartType: 'line',
    },
    {
      prompt: 'The charts below show the percentage of water used for different purposes in six areas of the world.',
      note: 'You should spend about 20 minutes on this task.\n\nWrite at least 150 words.',
      chartType: 'pie',
    },
  ],
  'General-Task 2': [
    { prompt: "Some people think that parents should teach children how to be good members of society. Others believe that school is the place to learn this. Discuss both these views and give your own opinion.", note: "Write at least 250 words. You have 40 minutes." },
    { prompt: "Some people think that governments should ban dangerous sports activities. Others believe people should have freedom to choose their activities. Discuss both views and give your own opinion.", note: "Write at least 250 words. You have 40 minutes." },
  ],
  'General-Task 1': [
    {
      prompt: `You have recently started work at a new company. Write a letter to an English-speaking friend.

In your letter:
1. Explain why you changed jobs
2. Describe your new job
3. Tell them your other news`,
      note: 'You should spend about 20 minutes on this task.\n\nWrite at least 150 words.',
    },
    {
      prompt: `You have seen an advertisement for part-time work in a local shop. Write a letter to the shop manager.

In your letter:
1. Explain why you want the job
2. Describe your relevant experience
3. Say when you are available to work`,
      note: 'You should spend about 20 minutes on this task.\n\nWrite at least 150 words.',
    },
  ],
};

function seenStorageKey(examType, taskType) {
  return `mock_seen_${examType || 'Academic'}_${taskType || 'Task 2'}`;
}

function currentTaskStorageKey(examType, taskType) {
  return `mock_current_task_${examType || 'Academic'}_${taskType || 'Task 2'}`;
}

/** Pick a random unseen question from the offline bank; resets when all have been shown. */
function pickFallbackQuestion(bank, storageKey, excludeIndex = null) {
  let seen = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
  let indices = bank.map((_, i) => i).filter(i => i !== excludeIndex && !seen.includes(i));
  if (indices.length === 0) {
    seen = [];
    indices = bank.map((_, i) => i).filter(i => i !== excludeIndex);
    sessionStorage.setItem(storageKey, '[]');
  }
  if (indices.length === 0) indices = [0];
  const idx = indices[Math.floor(Math.random() * indices.length)];
  sessionStorage.setItem(storageKey, JSON.stringify([...seen, idx]));
  return { question: bank[idx], index: idx };
}

const MockExam = ({ examType, taskType, onExit }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSubmissionId: setContextSubmissionId, updateEssayData } = useGrade();
  const isAcademicTask1 = examType === 'Academic' && (taskType || '').includes('1');
  const isLetterTask = isGeneralTask1Letter(examType, taskType);
  const isTask1 = (taskType || '').includes('1');
  const startSeconds = isTask1 ? 1199 : 2399;
  const key = `${examType || 'Academic'}-${taskType || 'Task 2'}`;
  const bank = QUESTION_BANK[key] || QUESTION_BANK['Academic-Task 2'];

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [examTaskId, setExamTaskId] = useState(null);
  const [questionLoading, setQuestionLoading] = useState(true);
  const [essay, setEssay] = useState('');
  const examTaskIdRef = useRef(null);

  const loadNextQuestion = useCallback(async ({ clearEssay = false } = {}) => {
    const resolvedExam = examType || 'Academic';
    const resolvedTask = taskType || 'Task 2';
    const seenKey = seenStorageKey(resolvedExam, resolvedTask);
    const currentKey = currentTaskStorageKey(resolvedExam, resolvedTask);
    const excludeId = examTaskIdRef.current || sessionStorage.getItem(currentKey) || undefined;

    setQuestionLoading(true);

    // Try the API twice before falling back to the tiny offline bank —
    // a transient failure would otherwise silently repeat hardcoded questions.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data } = await api.getNextTask({
          exam_type: resolvedExam,
          task_type: resolvedTask,
          session_type: 'mock',
          exclude_task_id: excludeId || undefined,
        });

        if (data?.question_text) {
          const q = {
            prompt: data.question_text,
            note: noteForTimeLimit(data.time_limit_seconds, resolvedExam, resolvedTask),
            chartSvg: data.chart_svg || null,
            chartImage: data.chart_image || null,
          };
          setCurrentQuestion(q);
          setExamTaskId(data.id);
          examTaskIdRef.current = data.id;
          sessionStorage.setItem(currentKey, data.id);
          if (clearEssay) setEssay('');
          return;
        }
      } catch {
        // retry once, then fall through to offline bank
      }
      if (attempt === 0) await new Promise(r => setTimeout(r, 800));
    }

    const excludeIndex = excludeId?.startsWith('fallback-')
      ? parseInt(excludeId.replace('fallback-', ''), 10)
      : null;
    const { question: fallbackQ, index } = pickFallbackQuestion(bank, seenKey, Number.isNaN(excludeIndex) ? null : excludeIndex);
    const fallbackId = `fallback-${index}`;
    setCurrentQuestion(fallbackQ);
    setExamTaskId(fallbackId);
    examTaskIdRef.current = fallbackId;
    sessionStorage.setItem(currentKey, fallbackId);
    if (clearEssay) setEssay('');
  }, [examType, taskType, bank]);

  useEffect(() => {
    let cancelled = false;
    loadNextQuestion().finally(() => {
      if (!cancelled) setQuestionLoading(false);
    });
    return () => { cancelled = true; };
  }, [loadNextQuestion]);

  const question = currentQuestion || bank[0];

  const questionChartType = useMemo(() => {
    if (!isAcademicTask1) return null;
    return question.chartType || detectChartType(question.prompt);
  }, [question, isAcademicTask1]);

  // Derive display name and initials from auth user
  const displayName = user?.full_name || 'Candidate';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  const [timeLeft, setTimeLeft] = useState(startSeconds);
  const [wordCount, setWordCount] = useState(0);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [submissionId, setSubmissionId] = useState(null);
  const [gradingError, setGradingError] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [showAttachmentTooltip, setShowAttachmentTooltip] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminActionError, setAdminActionError] = useState('');
  const progressRef = useRef(0);
  const startTimeRef = useRef(null);
  const fileInputRef = useRef(null);

  // Derive completed criteria from real progress — no closure issues
  const completedCriteria = [15, 42, 68, 100]
    .map((checkpoint, idx) => gradingProgress >= checkpoint ? idx : -1)
    .filter(v => v !== -1);

  // ─── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setShowTimeUp(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setWordCount(essay.trim() ? essay.trim().split(/\s+/).length : 0);
  }, [essay]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Submit to real backend ───────────────────────────────────────────────
  const submitEssay = async () => {
    const timeSpent = startSeconds + 1 - timeLeft;
    startTimeRef.current = Date.now();
    try {
      const res = await api.submitAttempt({
        exam_type: examType || 'Academic',
        task_type: taskType || 'Task 2',
        essay_content: essay,
        time_spent_seconds: timeSpent,
        exam_task_id: examTaskId?.startsWith('fallback-') ? null : examTaskId,
      });
      setSubmissionId(res.submission_id);
      setContextSubmissionId(res.submission_id); // persist for AnalysisReadyPage polling
    } catch (err) {
      if (err.message && err.message.includes('Insufficient evaluation credits')) {
        navigate('/analysis-ready', { state: { outOfCredits: true } });
        return;
      }
      // If server is reachable and threw a real error (e.g. no credits), surface it
      if (err.message && !err.message.toLowerCase().includes('offline') && !err.message.toLowerCase().includes('demo')) {
        setGradingError(err.message);
        setIsGrading(false);
        return;
      }
      // Network unreachable: use the mock submission_id from offline fallback
      setSubmissionId(`offline-${Date.now()}`);
    }
  };

  const handleStartGrading = () => {
    setShowTimeUp(false);
    if (!user) {
      updateEssayData({ essayContent: essay, examType: examType || 'Academic', taskType: taskType || 'Task 2' });
      navigate('/selection', { state: { flow: 'mock' } });
      return;
    }
    setIsGrading(true);
    submitEssay();
  };

  const handleSubmit = () => {
    if (wordCount < 10) return;
    if (!user) {
      updateEssayData({ essayContent: essay, examType: examType || 'Academic', taskType: taskType || 'Task 2' });
      navigate('/selection', { state: { flow: 'mock' } });
      return;
    }
    setIsGrading(true);
    submitEssay();
  };

  // ─── Smooth visual progress (0 → 88% over ~44 seconds) ───────────────────
  useEffect(() => {
    if (!isGrading) {
      progressRef.current = 0;
      setGradingProgress(0);
      return;
    }
    progressRef.current = 0;
    const interval = setInterval(() => {
      if (progressRef.current < 88) {
        progressRef.current = Math.min(88, progressRef.current + 0.4);
        setGradingProgress(Math.round(progressRef.current));
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isGrading]);

  // ─── Real status polling — fires once submissionId is set ─────────────────
  useEffect(() => {
    if (!submissionId || !isGrading) return;

    // For offline mock submissions, simulate completion after the visual animation
    if (submissionId.startsWith('offline-')) {
      const t = setTimeout(() => {
        setGradingProgress(100);
        setTimeout(() => onExit('report', { essay, examType, taskType }), 800);
      }, 11000);
      return () => clearTimeout(t);
    }

    let cancelled = false;

    const poll = async () => {
      // Wait a bit before first poll (grading starts async on backend)
      await new Promise(r => setTimeout(r, 4000));

      while (!cancelled) {
        try {
          const { status } = await api.checkStatus(submissionId);

          if (status === 'graded') {
            if (!cancelled) {
              progressRef.current = 100;
              setGradingProgress(100);
              // Small delay so the 100% completion animation is visible
              setTimeout(() => {
                if (!cancelled) {
                  onExit('report', { submissionId, essay, examType, taskType });
                }
              }, 800);
            }
            return;
          }

          if (status === 'failed') {
            if (!cancelled) {
              setGradingError('Grading failed. Please try again or check your credits.');
              setIsGrading(false);
            }
            return;
          }
        } catch {
          // Network blip — keep polling
        }

        await new Promise(r => setTimeout(r, 3000));
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [submissionId, isGrading, essay, examType, taskType, onExit]);

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your essay?')) setEssay('');
  };

  const handleRefreshQuestion = async () => {
    if (isGrading || showTimeUp) return;
    if (essay.trim() && !window.confirm('Load a new question? Your current essay will be cleared.')) return;
    setQuestionLoading(true);
    await loadNextQuestion({ clearEssay: true });
    setQuestionLoading(false);
  };

  const isAdmin = Boolean(user?.is_admin);
  const isDbTask = Boolean(examTaskId && !examTaskId.startsWith('fallback-'));
  const adminControlsDisabled = questionLoading || adminActionLoading || isGrading || showTimeUp;

  const clearCurrentTaskSession = () => {
    const currentKey = currentTaskStorageKey(examType || 'Academic', taskType || 'Task 2');
    examTaskIdRef.current = null;
    sessionStorage.removeItem(currentKey);
    setExamTaskId(null);
  };

  const handleAdminDeactivate = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = examTaskIdRef.current;
    if (!isAdmin || !taskId || taskId.startsWith('fallback-') || adminControlsDisabled) return;
    if (!window.confirm('Deactivate this question? It will no longer appear in exams.')) return;
    setAdminActionError('');
    setAdminActionLoading(true);
    setQuestionLoading(true);
    try {
      const res = await api.admin.updateTask(taskId, { is_active: false });
      if (res.is_active !== false) {
        throw new Error('Task was not deactivated. Please try again.');
      }
      clearCurrentTaskSession();
      await loadNextQuestion({ clearEssay: true });
    } catch (err) {
      setAdminActionError(err.message || 'Failed to deactivate question.');
    } finally {
      setAdminActionLoading(false);
      setQuestionLoading(false);
    }
  };

  const handleAdminDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = examTaskIdRef.current;
    if (!isAdmin || !taskId || taskId.startsWith('fallback-') || adminControlsDisabled) return;
    if (!window.confirm('Permanently delete this question from the database? This cannot be undone.')) return;
    setAdminActionError('');
    setAdminActionLoading(true);
    setQuestionLoading(true);
    try {
      await api.admin.deleteTask(taskId);
      clearCurrentTaskSession();
      await loadNextQuestion({ clearEssay: true });
    } catch (err) {
      setAdminActionError(err.message || 'Failed to delete question.');
    } finally {
      setAdminActionLoading(false);
      setQuestionLoading(false);
    }
  };

  const handleFileAttach = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setAttachedFile(file);
    setExtractError('');
    setExtracting(true);
    try {
      const text = await extractFileText(file);
      setEssay(text.trim());
    } catch (err) {
      setExtractError(err.message || 'Could not read file. Try a PDF, DOCX, or image.');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[200] flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-[64px] border-b border-gray-100 flex items-center justify-between px-4 md:px-6 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex w-8 h-8 rounded-full bg-[#E0F2FE] items-center justify-center text-[#0EA5E9] font-bold text-[12px]">
            {initials || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-[13px] md:text-[14px] font-semibold text-[#101828]">{displayName}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
            <div className="text-[10px] md:text-[11px] text-gray-500 font-medium truncate max-w-[120px] md:max-w-none">
              IELTS Writing {examType} {taskType || 'Task 2'}
            </div>
          </div>
        </div>

        <div className="bg-[#FFE4E6] px-3 md:px-4 py-1.5 rounded-[12px] flex items-center gap-2">
          <Clock size={16} className="text-[#EF4444]" strokeWidth={2.5} />
          <span className="text-[13px] md:text-[14px] font-bold text-[#EF4444] font-sans">
            {formatTime(timeLeft).split(':').slice(1).join(':')}
          </span>
        </div>

        <button className="flex items-center gap-2 px-3 h-[36px] border border-gray-200 rounded-[8px] text-[12px] md:text-[13px] font-medium text-[#344054] hover:bg-gray-50 transition-all">
          <HelpCircle size={16} />
          <span className="hidden sm:inline">Help</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-[400px] lg:w-[480px] border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto p-4 md:p-10 bg-[#F8FAFC]">
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-3">
            <span className="bg-[#E0F2FE] text-[#0EA5E9] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {examType} {taskType || 'Task 2'}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {isAdmin && isDbTask && (
                <>
                  <button
                    type="button"
                    onClick={handleAdminDeactivate}
                    disabled={adminControlsDisabled}
                    title="Deactivate question"
                    className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ToggleRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleAdminDelete}
                    disabled={adminControlsDisabled}
                    title="Permanently delete question"
                    className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleRefreshQuestion}
                disabled={questionLoading || isGrading || showTimeUp}
                title="New question"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold text-[#344054] border border-gray-200 hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {questionLoading
                  ? <Loader2 size={14} className="animate-spin" />
                  : <RefreshCw size={14} />
                }
                <span className="hidden sm:inline">New question</span>
              </button>
            </div>
          </div>
          {adminActionError && (
            <p className="mb-3 text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-[8px] px-3 py-2">
              {adminActionError}
            </p>
          )}
          {questionLoading && !currentQuestion ? (
            <div className="flex items-center gap-2 text-[13px] text-gray-500 py-8">
              <Loader2 size={18} className="animate-spin text-[#0EA5E9]" />
              Loading question…
            </div>
          ) : (
            <ExamQuestionPanel
              examType={examType}
              taskType={taskType}
              questionText={question.prompt}
              chartSvg={question.chartSvg}
              chartImage={question.chartImage}
              chartType={questionChartType}
              timeNote={question.note}
              showBadge={false}
            />
          )}
        </div>

        <div className="flex-1 flex flex-col bg-white">
          <textarea
            className="flex-1 p-4 md:p-10 outline-none text-[15px] md:text-[16px] text-[#475467] leading-[1.8] font-normal resize-none placeholder:text-gray-300 custom-scrollbar"
            placeholder={isLetterTask ? 'Type your letter here…' : 'Start writing your essay here...'}
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            disabled={showTimeUp || isGrading}
          />
        </div>
      </div>

      {/* Attachment status bar — filename or error, shown only when relevant */}
      {(attachedFile || extractError) && (
        <div className={`px-8 py-1.5 text-[12px] font-medium flex items-center gap-2 border-t ${extractError ? 'bg-red-50 border-red-100 text-red-500' : 'bg-[#F0F9FF] border-[#DBEAFE] text-[#1A96F3]'}`}>
          {extractError
            ? <><X size={13} className="shrink-0" />{extractError}</>
            : <><Paperclip size={13} className="shrink-0" />{attachedFile.name} — imported</>
          }
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 flex items-center justify-between px-2 md:px-8 h-[52px] md:h-[64px] bg-white shrink-0">
        {/* Left — Task buttons */}
        <div className="flex gap-1.5">
          <button className="px-2.5 md:px-5 h-[30px] md:h-[36px] border border-gray-200 rounded-[8px] text-[11px] md:text-[14px] font-semibold text-[#344054] hover:bg-gray-50 transition-all">Task 1</button>
          <button className="px-2.5 md:px-5 h-[30px] md:h-[36px] bg-[#2C3E50] text-white rounded-[8px] text-[11px] md:text-[14px] font-semibold transition-all">Task 2</button>
        </div>

        {/* Word count */}
        <div className="text-[12px] md:text-[14px] font-medium text-gray-500">
          {wordCount} words
        </div>

        {/* Right — Icon actions + Cancel + Submit */}
        <div className="flex items-center gap-1 md:gap-3">
          <button onClick={handleClear} title="Reset essay" className="w-[30px] h-[30px] md:w-[34px] md:h-[34px] flex items-center justify-center rounded-[8px] text-[#344054] hover:bg-gray-50 transition-all">
            <RotateCcw size={17} />
          </button>

          {/* Paperclip — file upload */}
          <div className="relative">
            <button
              onClick={() => !extracting && fileInputRef.current?.click()}
              onMouseEnter={() => setShowAttachmentTooltip(true)}
              onMouseLeave={() => setShowAttachmentTooltip(false)}
              className="w-[30px] h-[30px] md:w-[34px] md:h-[34px] flex items-center justify-center rounded-[8px] text-[#344054] hover:bg-gray-50 transition-all disabled:opacity-50"
              disabled={extracting}
            >
              {extracting
                ? <Loader2 size={17} className="animate-spin text-[#1A96F3]" />
                : <Paperclip size={17} />
              }
            </button>
            {showAttachmentTooltip && !extracting && (
              <div className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 bg-[#101828] text-white text-[13px] font-semibold px-4 py-2 rounded-[8px] whitespace-nowrap pointer-events-none z-10">
                Attachments
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#101828]" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={UPLOAD_ACCEPT}
              className="hidden"
              onChange={handleFileAttach}
            />
          </div>

          <button
            onClick={() => onExit && onExit('cancel')}
            className="flex items-center px-2.5 md:px-4 h-[30px] md:h-[34px] border border-gray-200 rounded-[8px] text-[11px] md:text-[13px] font-semibold text-[#344054] hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={wordCount < 10}
            className="px-2.5 md:px-5 h-[30px] md:h-[36px] bg-[#2C3E50] text-white rounded-[8px] text-[11px] md:text-[14px] font-semibold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <span className="hidden sm:inline">Submit Exam</span>
            <span className="sm:hidden">Submit</span>
          </button>
        </div>
      </footer>

      {/* Time's Up Modal */}
      <AnimatePresence>
        {showTimeUp && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-[380px] rounded-[20px] p-7 shadow-2xl flex flex-col items-center text-center">
              <button onClick={() => setShowTimeUp(false)} className="absolute top-4 right-5 text-gray-300 hover:text-gray-500 transition-colors">
                <X size={20} strokeWidth={2} />
              </button>
              <div className="w-14 h-14 bg-[#00A3FF] rounded-full flex items-center justify-center text-white mb-5 shadow-lg shadow-[#00A3FF44]">
                <Clock size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-[18px] font-bold text-[#111827] mb-2.5">Time's Up!</h3>
              <div className="text-[13px] text-gray-500 leading-[1.6] mb-7 max-w-[280px]">
                In the real IELTS, your screen will lock exactly like this. Let's see how you did.
              </div>
              <button onClick={handleStartGrading} className="w-full bg-[#344054] text-white h-[44px] rounded-[10px] text-[14px] font-bold transition-all hover:bg-[#1D2939]">
                Grade What I Have
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Grading Modal */}
      <AnimatePresence>
        {isGrading && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-[400px] rounded-[24px] p-8 shadow-2xl flex flex-col items-center text-center font-sans">
              <button onClick={() => setIsGrading(false)} className="absolute top-5 right-6 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} strokeWidth={1.5} />
              </button>

              {gradingError ? (
                <div className="py-6 space-y-4">
                  <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-500 mx-auto">
                    <X size={28} strokeWidth={2} />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#111827]">Grading Failed</h3>
                  <p className="text-[13px] text-gray-500">{gradingError}</p>
                  <button onClick={() => { setGradingError(''); setIsGrading(false); }} className="w-full bg-[#344054] text-white h-[44px] rounded-[10px] text-[14px] font-bold">
                    Go Back
                  </button>
                </div>
              ) : (
                <>
                  {/* Brain Circle Animation */}
                  <div className="relative w-[70px] h-[70px] mb-8">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="35" cy="35" r="32" fill="transparent" stroke="#F0F9FF" strokeWidth="4" />
                      <motion.circle cx="35" cy="35" r="32" fill="transparent" stroke="#00A3FF" strokeWidth="4" strokeDasharray={2 * Math.PI * 32} initial={{ strokeDashoffset: 2 * Math.PI * 32 }} animate={{ strokeDashoffset: (2 * Math.PI * 32) * (1 - gradingProgress / 100) }} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[#00A3FF]">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z"/>
                        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z"/>
                      </svg>
                    </div>
                  </div>

                  <h3 className="text-[20px] font-bold text-[#111827] mb-2">AI is grading your essay</h3>
                  <p className="text-[13px] text-[#475467] font-medium mb-8">
                    This takes 45–60 seconds. Please keep this tab open.
                  </p>

                  {/* Progress Card */}
                  <div className="w-full bg-[#F0F9FF] rounded-[16px] p-5 mb-8">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[14px] font-bold text-[#111827]">Finalizing Band Score</span>
                      <span className="text-[12px] font-bold text-gray-500">{gradingProgress}%</span>
                    </div>
                    <div className="w-full h-[10px] bg-[#D1E9FF] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${gradingProgress}%` }} className="h-full bg-[#00A3FF] rounded-full" />
                    </div>
                  </div>

                  {/* Criteria Checklist */}
                  <div className="w-full space-y-5 px-1">
                    {["Task Response", "Coherence", "Lexical Resource", "Grammatical"].map((item, idx) => {
                      const isDone = completedCriteria.includes(idx);
                      const isCurrent = !isDone && completedCriteria.length === idx;
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {isDone ? (
                              <div className="w-6 h-6 bg-[#66E0C2] rounded-full flex items-center justify-center text-white">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </div>
                            ) : isCurrent ? (
                              <div className="relative w-6 h-6">
                                <div className="absolute inset-0 border-2 border-gray-100 rounded-full" />
                                <motion.div className="absolute inset-0 border-2 border-[#00A3FF] rounded-full border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                              </div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-gray-100 rounded-full" />
                            )}
                          </div>
                          <span className={`text-[15px] font-medium transition-colors duration-300 ${isDone ? "text-gray-400" : isCurrent ? "text-[#111827]" : "text-gray-300"}`}>
                            {item}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MockExam;
