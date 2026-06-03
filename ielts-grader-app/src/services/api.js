/**
 * api.js — Central API service layer for IELTS Grader.
 *
 * Architecture:
 *   Auth       → Supabase JS SDK (via AuthContext, not this file)
 *   Grading    → /api/* proxied by Vite in dev → https://ielts-grader-backend.fly.dev in prod
 *   Analytics  → Supabase DB queries via this file (using the user's JWT)
 *
 * All functions degrade gracefully: if the backend is unreachable, mock data
 * is returned so the UI never breaks during development.
 */

import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Grading Service (Fly.io backend) — proxied through Vite in dev
// ---------------------------------------------------------------------------
const GRADING_BASE = '/api'; // Vite proxy maps /api → https://ielts-grader-backend.fly.dev
const GRADING_SECRET = import.meta.env.VITE_GRADING_SECRET;

const gradingHeaders = () => ({
  'Authorization': `Bearer ${GRADING_SECRET}`,
});

// ---------------------------------------------------------------------------
// Mock fallback datasets (used when backend is offline or returning errors)
// ---------------------------------------------------------------------------
const mockUser = {
  id: 'mock-user-uuid',
  email: 'candidate@ielts.org',
  full_name: 'John Candidate',
  target_band: 7.5,
  credits_remaining: 4,
  profile_image_url: null,
};

const mockChartData = [
  { name: 'W1', overall: 6.8, response: 6.3, coherence: 6.0, vocabulary: 7.4, grammar: 6.5 },
  { name: '1.5', overall: 7.2, response: 6.7, coherence: 6.4, vocabulary: 7.8, grammar: 6.9 },
  { name: 'W2', overall: 6.8, response: 6.3, coherence: 6.0, vocabulary: 7.4, grammar: 6.5 },
  { name: '2.5', overall: 8.0, response: 7.5, coherence: 7.2, vocabulary: 8.6, grammar: 7.7 },
  { name: 'W3', overall: 7.4, response: 6.9, coherence: 6.6, vocabulary: 8.0, grammar: 7.1 },
  { name: '3.5', overall: 8.0, response: 7.5, coherence: 7.2, vocabulary: 8.6, grammar: 7.7 },
  { name: 'W4', overall: 7.6, response: 7.1, coherence: 6.8, vocabulary: 8.2, grammar: 7.3 },
  { name: '4.5', overall: 7.8, response: 7.3, coherence: 7.0, vocabulary: 8.4, grammar: 7.5 },
  { name: 'W5', overall: 8.2, response: 7.7, coherence: 7.4, vocabulary: 8.8, grammar: 7.9 },
  { name: '5.5', overall: 7.6, response: 7.1, coherence: 6.8, vocabulary: 8.2, grammar: 7.3 },
  { name: 'W6', overall: 8.0, response: 7.5, coherence: 7.2, vocabulary: 8.6, grammar: 7.7 },
  { name: '6.5', overall: 6.4, response: 5.9, coherence: 5.6, vocabulary: 7.0, grammar: 6.1 },
  { name: 'W7', overall: 8.0, response: 7.5, coherence: 7.2, vocabulary: 8.6, grammar: 7.7 },
  { name: '7.5', overall: 7.6, response: 7.1, coherence: 6.8, vocabulary: 8.2, grammar: 7.3 },
  { name: 'W8', overall: 8.2, response: 7.7, coherence: 7.4, vocabulary: 8.8, grammar: 7.9 },
];

const mockFrequentErrors = [
  { label: 'Repetition of Basic Lexis', count: 12, impact: 'High Impact', type: 'red' },
  { label: 'Imprecise Word Choice', count: 9, impact: 'High Impact', type: 'red' },
  { label: 'Ideas Underdeveloped', count: 7, impact: 'Medium Impact', type: 'yellow' },
  { label: 'Unclear Referencing', count: 4, impact: 'Medium Impact', type: 'yellow' },
  { label: 'Logical Progression Gap', count: 2, impact: 'Low Impact', type: 'gray' },
];

const mockReports = [
  { id: '1', type: 'Academic', task: 'Task 1', date: 'Mar 23, 2026', score: 7.0 },
  { id: '2', type: 'Academic', task: 'Task 2', date: 'Mar 18, 2026', score: 7.5 },
  { id: '3', type: 'General', task: 'Task 1', date: 'Mar 21, 2026', score: 6.5 },
  { id: '4', type: 'General', task: 'Task 2', date: 'Mar 15, 2026', score: 6.0 },
];

// ---------------------------------------------------------------------------
// Helper: get the current user's Supabase JWT for authenticated DB calls
// ---------------------------------------------------------------------------
const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

// ---------------------------------------------------------------------------
// AUTH — handled by Supabase SDK (AuthContext calls supabase.auth directly)
// These wrapper functions exist only for backwards-compat / legacy call sites.
// ---------------------------------------------------------------------------
export const api = {

  /** @deprecated — use AuthContext.login() instead */
  login: async (credentials) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) throw new Error(error.message);
    return { token: data.session.access_token, user: formatUser(data.user) };
  },

  /** @deprecated — use AuthContext.register() instead */
  register: async (profile) => {
    const { data, error } = await supabase.auth.signUp({
      email: profile.email,
      password: profile.password,
      options: {
        data: {
          full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          target_band: 7.0,
        },
      },
    });
    if (error) throw new Error(error.message);
    return {
      token: data.session?.access_token || '',
      user: formatUser(data.user),
    };
  },

  /** Get the current authenticated user profile */
  getMe: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error('Not authenticated');
      // Merge Supabase auth user with profile data from `profiles` table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return formatUser(user, profile);
    } catch (err) {
      console.warn('[api.getMe] Falling back to mock user:', err.message);
      return mockUser;
    }
  },

  /** Google OAuth sign-in (redirects to Supabase, then back to /dashboard) */
  loginWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw new Error(error.message);
  },

  /** Forgot password — Supabase sends a reset email */
  forgotPassword: async ({ email }) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return { message: 'Password reset email sent. Check your inbox.' };
  },

  /** Reset password — called after the user clicks the email link */
  resetPassword: async ({ newPassword }) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { message: 'Password reset successfully.' };
  },

  /** Change password — requires current session */
  changePassword: async ({ newPassword }) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { message: 'Password changed successfully.' };
  },

  /** Update profile fields */
  updateProfile: async (updates) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      // Update auth metadata
      await supabase.auth.updateUser({
        data: { full_name: updates.full_name, first_name: updates.first_name, last_name: updates.last_name },
      });

      // Upsert profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() });
      if (error) throw error;
      return { message: 'Profile updated.' };
    } catch (err) {
      console.warn('[api.updateProfile] Error:', err.message);
      throw err;
    }
  },

  // ---------------------------------------------------------------------------
  // ESSAY SUBMISSION & GRADING
  // ---------------------------------------------------------------------------

  /**
   * Extract text from uploaded prompt/essay files.
   * Calls POST /extract-text on the Fly.io backend (via Vite proxy in dev).
   */
  extractText: async (promptFile, essayFile) => {
    try {
      const formData = new FormData();
      if (promptFile) formData.append('prompt_file', promptFile);
      if (essayFile) formData.append('essay_file', essayFile);

      const res = await fetch(`${GRADING_BASE}/extract-text`, {
        method: 'POST',
        headers: gradingHeaders(), // No Content-Type — browser sets multipart boundary
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Extract failed: ${res.status}`);
      }
      return await res.json(); // { question_text, essay_content }
    } catch (err) {
      console.warn('[api.extractText] Fallback mock:', err.message);
      return {
        question_text: 'Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime. Discuss both views and give your own opinion.',
        essay_content: 'Some people argue that imposing longer prison sentences is the most effective way to reduce crime...',
      };
    }
  },

  /**
   * Submit an essay for grading.
   * Calls POST /grade on the Fly.io backend (async — returns 202 immediately).
   * The backend writes results to Supabase asynchronously.
   */
  submitAttempt: async ({ submission_id, task_type, exam_type, essay_content, question_text }) => {
    try {
      const res = await fetch(`${GRADING_BASE}/grade`, {
        method: 'POST',
        headers: { ...gradingHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id, task_type, exam_type, essay_content, question_text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Grade submission failed: ${res.status}`);
      }
      return await res.json(); // { status: 'accepted' }
    } catch (err) {
      console.warn('[api.submitAttempt] Fallback mock:', err.message);
      return { status: 'accepted' };
    }
  },

  /**
   * Create a submission record in Supabase before calling /grade.
   * Returns the submission_id used by /grade and status polling.
   */
  createSubmission: async ({ task_type, exam_type, essay_content, question_text }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('submissions')
        .insert({
          user_id: user?.id,
          task_type,
          exam_type,
          essay_content,
          question_text,
          status: 'pending',
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    } catch (err) {
      console.warn('[api.createSubmission] Fallback to random UUID:', err.message);
      return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
  },

  /**
   * Poll submission status from Supabase (the grading backend writes status there).
   * Returns { status: 'pending' | 'grading' | 'graded' | 'failed', progress_pct }
   */
  checkStatus: async (submissionId) => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('status, progress_pct')
        .eq('id', submissionId)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[api.checkStatus] Fallback:', err.message);
      // Simulate graded for mock IDs
      return { status: 'graded', progress_pct: 100 };
    }
  },

  /**
   * Fetch the full graded report from Supabase.
   */
  getReport: async (submissionId) => {
    try {
      // Fetch main report + errors in one go
      const { data: report, error } = await supabase
        .from('reports')
        .select(`
          *,
          report_errors (*)
        `)
        .eq('submission_id', submissionId)
        .single();
      if (error) throw error;
      return normalizeReport(report);
    } catch (err) {
      console.warn('[api.getReport] Fallback mock report:', err.message);
      return getMockReport(submissionId);
    }
  },

  /**
   * Fetch the user's most recent report (used when navigating directly to /report).
   */
  getLatestReport: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: submission, error } = await supabase
        .from('submissions')
        .select('id')
        .eq('user_id', user?.id)
        .eq('status', 'graded')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return await api.getReport(submission.id);
    } catch (err) {
      console.warn('[api.getLatestReport] Fallback mock report:', err.message);
      return getMockReport('latest');
    }
  },

  // ---------------------------------------------------------------------------
  // ANALYTICS
  // ---------------------------------------------------------------------------

  /** Dashboard analytics: skill growth chart + recent reports list */
  getDashboardAnalytics: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch last 15 graded submissions ordered by date
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select('id, task_type, exam_type, created_at')
        .eq('user_id', user.id)
        .eq('status', 'graded')
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      // Fetch band scores for each submission
      const reportIds = submissions?.map(s => s.id) || [];
      const { data: reports } = await supabase
        .from('reports')
        .select('submission_id, overall_band, task_response_band, coherence_band, lexical_band, grammar_band, created_at')
        .in('submission_id', reportIds)
        .order('created_at', { ascending: true });

      // Build chart series
      const chartData = (reports || []).map((r, i) => ({
        name: `W${Math.ceil((i + 1) / 2)}`,
        overall: r.overall_band,
        response: r.task_response_band,
        coherence: r.coherence_band,
        vocabulary: r.lexical_band,
        grammar: r.grammar_band,
      }));

      // Build recent reports list
      const dynamicReports = (submissions || []).slice(0, 4).map(s => {
        const rep = reports?.find(r => r.submission_id === s.id);
        return {
          id: s.id,
          type: s.exam_type || 'Academic',
          task: s.task_type || 'Task 2',
          date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          score: rep?.overall_band || 0,
        };
      });

      return { chartData, dynamicReports };
    } catch (err) {
      console.warn('[api.getDashboardAnalytics] Fallback mock data:', err.message);
      return { chartData: mockChartData, dynamicReports: mockReports };
    }
  },

  /**
   * Get all reports for a specific task type (for ReportsOverview).
   * @param {string} taskType — e.g. 'Academic Task 1'
   */
  getReportsList: async (taskType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const [exam_type, task_num] = taskType.split(' Task ');
      const { data, error } = await supabase
        .from('submissions')
        .select(`id, task_type, exam_type, created_at, reports(overall_band)`)
        .eq('user_id', user?.id)
        .eq('status', 'graded')
        .eq('exam_type', exam_type)
        .eq('task_type', `Task ${task_num}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[api.getReportsList] Fallback:', err.message);
      return mockReports;
    }
  },

  /**
   * Get aggregated performance analytics for a specific task type.
   * Used by PerformanceOverviewPage.
   */
  getPerformanceAnalytics: async (taskType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const [exam_type, task_num] = taskType.split(' Task ');
      const { data, error } = await supabase
        .from('reports')
        .select(`
          overall_band, task_response_band, coherence_band, lexical_band, grammar_band, created_at,
          submissions!inner(user_id, exam_type, task_type, status)
        `)
        .eq('submissions.user_id', user?.id)
        .eq('submissions.exam_type', exam_type)
        .eq('submissions.task_type', `Task ${task_num}`)
        .eq('submissions.status', 'graded')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[api.getPerformanceAnalytics] Fallback:', err.message);
      return mockChartData;
    }
  },

  // ---------------------------------------------------------------------------
  // SETTINGS — Subscription & Support
  // ---------------------------------------------------------------------------

  /** Get subscription status (placeholder until Stripe is set up) */
  getSubscription: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[api.getSubscription] Fallback mock subscription:', err.message);
      return {
        plan_name: 'Weekly Sprint',
        renewal_date: 'Mar 30, 2026',
        billing_amount: '$9.99 / week',
        credits_used: 18,
        credits_total: 20,
      };
    }
  },

  /** Send a support message */
  sendSupportMessage: async ({ topic, description }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('support_messages').insert({
        user_id: user?.id,
        user_email: user?.email,
        topic,
        description,
      });
      if (error) throw error;
      return { message: 'Support message sent.' };
    } catch (err) {
      console.warn('[api.sendSupportMessage] Fallback:', err.message);
      return { message: 'Message received (offline mode).' };
    }
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a Supabase auth user + profile into a flat user object */
function formatUser(authUser, profile = null) {
  if (!authUser) return null;
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name || meta.full_name || meta.name || 'User',
    first_name: profile?.first_name || meta.first_name || '',
    last_name: profile?.last_name || meta.last_name || '',
    target_band: profile?.target_band || meta.target_band || 7.0,
    credits_remaining: profile?.credits_remaining ?? 4,
    profile_image_url: profile?.avatar_url || meta.avatar_url || null,
    phone: profile?.phone || '',
    address: profile?.address || '',
    state: profile?.state || '',
    country: profile?.country || '',
    postal_code: profile?.postal_code || '',
  };
}

/** Normalize a Supabase report row into the shape ReportView.jsx expects */
function normalizeReport(row) {
  if (!row) return getMockReport('unknown');
  return {
    id: row.submission_id,
    overall_band: row.overall_band,
    task_type: row.task_type || 'Task 2',
    exam_type: row.exam_type || 'Academic',
    essay_content: row.essay_content || '',
    task_question: row.question_text || '',
    submitted_at: row.created_at,
    criteria: {
      task_response: { band: row.task_response_band },
      coherence_cohesion: { band: row.coherence_band },
      lexical_resource: { band: row.lexical_band },
      grammatical_range: { band: row.grammar_band },
    },
    strengths: row.strengths || [],
    weaknesses: row.weaknesses || [],
    errors: (row.report_errors || []).map(e => ({
      id: e.id,
      title: e.title,
      severity: e.severity,
      criteria: e.criteria_category,
      original_text: e.original_text,
      correction_text: e.correction_text,
      explanation: e.explanation,
    })),
    // Deep analysis JSONB columns (stored as-is by backend)
    dual_assessment: row.dual_assessment || null,
    model_answer: row.model_answer || null,
    vocabulary: row.vocabulary_analysis || null,
    grammar: row.grammar_analysis || null,
    data_structure: row.data_structure_analysis || null,
    flow_logic: row.flow_logic_analysis || null,
  };
}

/** Fallback mock report for development/offline use */
function getMockReport(id) {
  return {
    id,
    overall_band: 6.5,
    task_type: 'Task 2',
    exam_type: 'Academic',
    essay_content: 'Some people argue that imposing longer prison sentences is the most effective way to reduce crime, while others believe that alternative measures can achieve better results. Although stricter punishments may deter certain offenders, I believe that addressing the root causes of crime is a more sustainable and effective solution.',
    task_question: 'Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime. Discuss both views and give your own opinion.',
    submitted_at: new Date().toISOString(),
    criteria: {
      task_response: { band: 5.5 },
      coherence_cohesion: { band: 7.0 },
      lexical_resource: { band: 6.5 },
      grammatical_range: { band: 6.5 },
    },
    strengths: [
      'Clear introduction identifying the topic',
      'Logical body structure organized by viewpoint',
      'Effective use of cohesive devices and linking words',
      'Good paragraphing with unified topic focus',
    ],
    weaknesses: [
      'Data accuracy issues — numerical values imprecise',
      'Coverage gaps — some key arguments not fully developed',
      'Limited sentence variety (predominantly simple/compound)',
      'Basic comparative phrasing rather than nuanced analysis',
    ],
    errors: [
      {
        id: 'err-1',
        title: 'Vocabulary Repetition',
        severity: 'Major',
        criteria: 'Lexical Resource',
        original_text: 'crime is bad, crime causes problems, crime must stop',
        correction_text: 'criminal activity is detrimental, offending behaviour creates issues',
        explanation: 'Repetition of the word "crime" reduces lexical variety.',
      },
    ],
    dual_assessment: null,
    model_answer: null,
    vocabulary: null,
    grammar: null,
    data_structure: null,
    flow_logic: null,
  };
}
