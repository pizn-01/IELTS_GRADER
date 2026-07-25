import { getAuthToken } from '../utils/authStorage';

const BASE_URL = '/api';

// Tracking bypasses Vercel proxy so Fly.io sees the real visitor IP for geo lookup.
const TRACKING_URL = import.meta.env.VITE_TRACKING_URL
  || (import.meta.env.PROD
    ? 'https://ielts-grader-backend.fly.dev/api/tracking/pageview'
    : `${BASE_URL}/tracking/pageview`);

const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const adminRequest = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
};

// ─── Offline-only fallbacks ───────────────────────────────────────────────────
// These are ONLY used when the server is genuinely unreachable (network error).
// They are NEVER used when the server responds with an HTTP error code.
const offlineFallbacks = {
  user: {
    id: 'user-mock-uuid-999',
    email: 'candidate@ielts.org',
    full_name: 'John Candidate',
    target_band: 7.5,
    target_band_confirmed: true,
    credits_remaining: 4,
    profile_image_url: null,
  },
  chartData: [
    { name: '1', examLabel: 'Exam 1', overall: 6.8, response: 6.3, coherence: 6.0, vocabulary: 7.4, grammar: 6.5 },
    { name: '2', examLabel: 'Exam 2', overall: 7.2, response: 6.7, coherence: 6.4, vocabulary: 7.8, grammar: 6.9 },
    { name: '3', examLabel: 'Exam 3', overall: 7.4, response: 6.9, coherence: 6.6, vocabulary: 8.0, grammar: 7.1 },
  ],
  frequentErrors: [
    { label: 'Repetition of Basic Lexis', count: 12, impact: 'High Impact', type: 'red' },
    { label: 'Imprecise Word Choice', count: 9, impact: 'High Impact', type: 'red' },
    { label: 'Ideas Underdeveloped', count: 7, impact: 'Medium Impact', type: 'yellow' },
  ],
};

// Returns true when err is a network-level failure (server unreachable),
// false when the server responded with an HTTP error code.
const isNetworkError = (err) => err instanceof TypeError || err.name === 'TypeError';

export const api = {
  // ─── POST /api/tracking/pageview ─────────────────────────────────────────────
  trackPageView: async (payload) => {
    try {
      await fetch(TRACKING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Non-blocking — tracking must not break the app
    }
  },

  // ─── POST /api/auth/login ───────────────────────────────────────────────────
  login: async (credentials) => {
    let serverReachable = false;
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      serverReachable = true;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error || 'Invalid email or password.');
        err.status = res.status;
        throw err;
      }
      return await res.json();
    } catch (err) {
      if (serverReachable) throw err; // Real server error, show to user
      // Network unreachable — offline demo mode only
      console.warn('[DEMO] Backend unreachable, offline mock login.', err.message);
      return {
        token: 'mock_jwt_session_token_xyz_778899',
        user: { ...offlineFallbacks.user, email: credentials.email || offlineFallbacks.user.email },
      };
    }
  },

  // ─── POST /api/auth/register ────────────────────────────────────────────────
  register: async (profile) => {
    let serverReachable = false;
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      serverReachable = true;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Registration failed.');
      }
      return await res.json();
    } catch (err) {
      if (serverReachable) throw err;
      console.warn('[DEMO] Backend unreachable, offline mock register.', err.message);
      const fullName = `${profile.first_name || ''} ${profile.last_name || profile.full_name || 'Candidate'}`.trim();
      return {
        token: 'mock_jwt_session_token_xyz_778899',
        user: { ...offlineFallbacks.user, full_name: fullName, email: profile.email || offlineFallbacks.user.email },
      };
    }
  },

  // ─── GET /api/auth/me ───────────────────────────────────────────────────────
  // CRITICAL: re-throw on HTTP errors so AuthContext can clear an invalid token.
  getMe: async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/me`, { headers: getHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error || `Session invalid (${res.status}).`);
        err.status = res.status;
        throw err;
      }
      return await res.json();
    } catch (err) {
      console.warn('Session verification failed:', err.message);
      throw err;
    }
  },

  // ─── POST /api/extract ──────────────────────────────────────────────────────
  // Multipart file → OCRHandler (image / PDF / DOCX) → { text }
  extractFile: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const headers = {};
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/extract`, {
      method: 'POST',
      headers,
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Could not extract text from this file.');
    }
    return data;
  },

  // ─── POST /api/detect-task ──────────────────────────────────────────────────
  detectTask: async (questionText) => {
    const res = await fetch(`${BASE_URL}/detect-task`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ questionText }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Could not detect the IELTS task type.');
    }
    return data;
  },

  // ─── POST /api/submissions ──────────────────────────────────────────────────
  submitAttempt: async (payload) => {
    let serverReachable = false;
    try {
      const res = await fetch(`${BASE_URL}/submissions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      serverReachable = true;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Submission failed.');
      }
      return await res.json();
    } catch (err) {
      if (serverReachable) throw err;
      console.warn('[DEMO] Backend unreachable, mock submission.', err.message);
      return { submission_id: `mock-sub-${Date.now()}`, message: 'Offline demo mode.' };
    }
  },

  // ─── GET /api/submissions/status/:id ────────────────────────────────────────
  checkStatus: async (subId) => {
    let serverReachable = false;
    try {
      const res = await fetch(`${BASE_URL}/submissions/status/${subId}`, { headers: getHeaders() });
      serverReachable = true;
      // On 429 (rate limit) — don't throw: let polling continue on the next tick
      if (res.status === 429) {
        console.warn('[checkStatus] Rate limited, continuing to poll.');
        return { status: 'grading', progress_pct: 50 };
      }
      if (!res.ok) throw new Error(`Status check failed (${res.status}).`);
      return await res.json();
    } catch (err) {
      if (serverReachable) throw err;
      // Network unreachable — assume still grading
      return { status: 'grading', progress_pct: 50 };
    }
  },

  // ─── GET /api/reports/:submissionId ─────────────────────────────────────────
  getReport: async (subId) => {
    let serverReachable = false;
    try {
      const res = await fetch(`${BASE_URL}/reports/${subId}`, { headers: getHeaders() });
      serverReachable = true;
      if (!res.ok) throw new Error(`Report not found (${res.status}).`);
      return await res.json();
    } catch (err) {
      if (serverReachable) throw err;
      // Offline demo report
      console.warn('[DEMO] Backend unreachable, offline mock report.', err.message);
      return {
        id: subId,
        overall_band: 7.0,
        response_band: 6.5,
        coherence_band: 7.5,
        vocabulary_band: 7.0,
        grammar_band: 6.5,
        strengths: ['Well-structured introduction', 'Effective use of cohesive devices'],
        weaknesses: ['Limited vocabulary range', 'Some data accuracy issues'],
        errors: [],
      };
    }
  },

  // ─── GET /api/analytics/dashboard ───────────────────────────────────────────
  getDashboardAnalytics: async ({ taskType } = {}) => {
    let serverReachable = false;
    try {
      let url = `${BASE_URL}/analytics/dashboard`;
      if (taskType) {
        url += `?task=${encodeURIComponent(taskType)}`;
      }
      const res = await fetch(url, { headers: getHeaders() });
      serverReachable = true;
      if (res.status === 429) {
        console.warn('[getDashboardAnalytics] Rate limited, returning empty.');
        return { chartData: [], frequentErrors: [], rateLimited: true };
      }
      if (!res.ok) throw new Error(`Analytics unavailable (${res.status}).`);
      return await res.json();
    } catch (err) {
      if (serverReachable) {
        return { chartData: [], frequentErrors: [] };
      }
      // Network unreachable — show demo data
      console.warn('[DEMO] Backend unreachable, offline analytics.', err.message);
      return { chartData: offlineFallbacks.chartData, frequentErrors: offlineFallbacks.frequentErrors };
    }
  },

  // ─── GET /api/submissions ────────────────────────────────────────────────────
  getSubmissions: async ({ limit = 50, offset = 0, taskType } = {}) => {
    let serverReachable = false;
    try {
      let url = `${BASE_URL}/submissions?limit=${limit}&offset=${offset}`;
      if (taskType) {
        url += `&task=${encodeURIComponent(taskType)}`;
      }
      const res = await fetch(url, { headers: getHeaders() });
      serverReachable = true;
      if (res.status === 429) {
        console.warn('[getSubmissions] Rate limited, returning empty to avoid false empty state.');
        return { data: [], total: 0, rateLimited: true };
      }
      if (!res.ok) throw new Error(`Failed to fetch submissions (${res.status}).`);
      return await res.json();
    } catch (err) {
      if (serverReachable) return { data: [], total: 0 };
      console.warn('[DEMO] Backend unreachable, empty submissions.', err.message);
      return { data: [], total: 0 };
    }
  },

  // ─── POST /api/auth/forgot-password ─────────────────────────────────────────
  forgotPassword: async ({ email }) => {
    let serverReachable = false;
    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      serverReachable = true;
      if (!res.ok) throw new Error('Request failed.');
      return await res.json();
    } catch (err) {
      if (serverReachable) throw err;
      return { message: 'Password reset email sent. Check your inbox.' };
    }
  },

  // ─── POST /api/auth/reset-password ──────────────────────────────────────────
  resetPassword: async ({ token, newPassword }) => {
    let serverReachable = false;
    try {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      serverReachable = true;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Reset failed.');
      }
      return await res.json();
    } catch (err) {
      if (serverReachable) throw err;
      return { message: 'Password reset successful.' };
    }
  },

  // ─── POST /api/auth/google ───────────────────────────────────────────────────
  // Exchange Supabase OAuth access_token for our custom JWT
  googleAuth: async (access_token, extra = {}) => {
    const res = await fetch(`${BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token, ...extra }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Google authentication failed.');
    }
    return res.json();
  },

  // ─── PATCH /api/auth/profile ─────────────────────────────────────────────────
  updateProfile: async (updates) => {
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Profile update failed.');
    }
    return res.json();
  },

  // ─── POST /api/auth/change-password ─────────────────────────────────────────
  changePassword: async ({ currentPassword, newPassword }) => {
    const res = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Password change failed.');
    }
    return res.json();
  },

  // ─── GET /api/tasks ──────────────────────────────────────────────────────────
  getTasks: async ({ exam_type, task_type } = {}) => {
    try {
      const q = new URLSearchParams();
      if (exam_type) q.set('exam_type', exam_type);
      if (task_type) q.set('task_type', task_type);
      const res = await fetch(`${BASE_URL}/tasks?${q}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`Tasks fetch failed (${res.status})`);
      return await res.json();
    } catch {
      return { data: [] };
    }
  },

  // ─── GET /api/tasks/next ─────────────────────────────────────────────────────
  // Returns one question not yet assigned to this user (unique per user)
  getNextTask: async ({ exam_type, task_type, session_type = 'mock', exclude_task_id } = {}) => {
    try {
      const q = new URLSearchParams();
      if (exam_type) q.set('exam_type', exam_type);
      if (task_type) q.set('task_type', task_type);
      q.set('session_type', session_type);
      if (exclude_task_id) q.set('exclude_task_id', exclude_task_id);
      const res = await fetch(`${BASE_URL}/tasks/next?${q}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`Next task fetch failed (${res.status})`);
      return await res.json();
    } catch {
      return { data: null };
    }
  },

  // ─── POST /api/auth/verify-email ─────────────────────────────────────────────
  verifyEmail: async (token) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, { headers: getHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Verification failed.');
      return data;
    } catch (err) {
      throw err;
    }
  },

  // ─── POST /api/auth/send-verification ────────────────────────────────────────
  sendVerification: async () => {
    const res = await fetch(`${BASE_URL}/auth/send-verification`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to send verification email.');
    return data;
  },

  // ─── POST /api/auth/resend-verification ──────────────────────────────────────
  resendVerification: async (email) => {
    const res = await fetch(`${BASE_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to resend verification email.');
    return data;
  },

  // ─── Stripe API ───────────────────────────────────────────────────────────────
  // plan: 'weekly' | 'monthly'
  createSubscriptionCheckout: async (plan) => {
    const res = await fetch(`${BASE_URL}/stripe/create-upgrade-checkout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to create checkout session.');
    }
    return res.json();
  },

  createBillingPortalSession: async ({ flow } = {}) => {
    const res = await fetch(`${BASE_URL}/stripe/create-billing-portal-session`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(flow ? { flow } : {}),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to open billing portal.');
    }
    return res.json();
  },

  getSubscriptionStatus: async () => {
    const res = await fetch(`${BASE_URL}/subscriptions/status`, { headers: getHeaders() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to load subscription status.');
    }
    return res.json();
  },

  verifyStripeSession: async (sessionId) => {
    const res = await fetch(`${BASE_URL}/stripe/verify-session/${sessionId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Session verification failed.');
    return res.json();
  },

  // ─── Admin API ───────────────────────────────────────────────────────────────
  admin: {
    getStats: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/stats${q ? `?${q}` : ''}`, { headers: getHeaders() }).then(r => r.json());
    },
    getUsers: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/users?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    getUser: (id) => fetch(`${BASE_URL}/admin/users/${id}`, { headers: getHeaders() }).then(r => r.json()),
    updateUser: (id, body) => fetch(`${BASE_URL}/admin/users/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(body) }).then(r => r.json()),
    deleteUser: (id) => fetch(`${BASE_URL}/admin/users/${id}`, { method: 'DELETE', headers: getHeaders() }).then(r => r.json()),
    adjustCredits: (id, amount, reason) => fetch(`${BASE_URL}/admin/users/${id}/credits`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ amount, reason }) }).then(r => r.json()),
    getSubmissions: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/submissions?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    getSupport: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/support?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    updateSupport: (id, body) => fetch(`${BASE_URL}/admin/support/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(body) }).then(r => r.json()),
    getDiscounts: () => fetch(`${BASE_URL}/admin/discounts`, { headers: getHeaders() }).then(r => r.json()),
    createDiscount: (body) => fetch(`${BASE_URL}/admin/discounts`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(r => r.json()),
    updateDiscount: (id, body) => fetch(`${BASE_URL}/admin/discounts/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(body) }).then(r => r.json()),
    deleteDiscount: (id) => fetch(`${BASE_URL}/admin/discounts/${id}`, { method: 'DELETE', headers: getHeaders() }).then(r => r.json()),
    // Task management
    getTasks: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/tasks${q ? `?${q}` : ''}`, { headers: getHeaders() }).then(r => r.json());
    },
    createTask: (body) => fetch(`${BASE_URL}/admin/tasks`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(r => r.json()),
    getTask: (id) => fetch(`${BASE_URL}/admin/tasks/${id}`, { headers: getHeaders() }).then(r => r.json()),
    updateTask: (id, body) => adminRequest(`${BASE_URL}/admin/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteTask: (id) => adminRequest(`${BASE_URL}/admin/tasks/${id}?permanent=true`, { method: 'DELETE' }),
    getTaskHistory: (id) => fetch(`${BASE_URL}/admin/tasks/${id}/history`, { headers: getHeaders() }).then(r => r.json()),
    // Bulk import tasks from JSON or PDF
    importTasks: (formData) => fetch(`${BASE_URL}/admin/tasks/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAuthToken()}` },
      body: formData,
    }).then(r => r.json()),
    // Question assignment log
    getTaskAssignments: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/task-assignments?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    // Payment history
    getPayments: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/payments?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    getAcquisitionOverview: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/acquisition/overview?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    getAcquisitionTimeseries: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/acquisition/timeseries?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    getAcquisitionByChannel: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/acquisition/by-channel?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    getAcquisitionByCountry: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/acquisition/by-country?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    getAcquisitionByLanding: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/acquisition/by-landing?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    getAcquisitionByCampaign: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/acquisition/by-campaign?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    getAcquisitionByHour: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/acquisition/by-hour?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    getAcquisitionVisitors: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/acquisition/visitors?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    // Social Ops Agent (SEO/social-media) — isolated namespace
    socialOps: {
      getBundle: () => adminRequest(`${BASE_URL}/admin/social-ops/bundle`),
      getStatus: () => adminRequest(`${BASE_URL}/admin/social-ops/status`),
      getJob: () => adminRequest(`${BASE_URL}/admin/social-ops/job`),
      run: (body) => adminRequest(`${BASE_URL}/admin/social-ops/run`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
      getBrief: (kind = 'today') => adminRequest(`${BASE_URL}/admin/social-ops/brief?kind=${encodeURIComponent(kind)}`),
      getActions: () => adminRequest(`${BASE_URL}/admin/social-ops/actions`),
      getAction: (id, opts = {}) => {
        const q = opts.onboarding ? '?queue=onboarding' : '';
        return adminRequest(`${BASE_URL}/admin/social-ops/actions/${encodeURIComponent(id)}${q}`);
      },
      markDone: (id, body = {}) => adminRequest(`${BASE_URL}/admin/social-ops/actions/${encodeURIComponent(id)}/done`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
      copyNext: (body = {}) => adminRequest(`${BASE_URL}/admin/social-ops/copy-next`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
      setupCheck: () => adminRequest(`${BASE_URL}/admin/social-ops/setup-check`),
      scheduleUrl: `${BASE_URL}/admin/social-ops/schedule.csv`,
    },
  },

  // ─── POST /api/support ───────────────────────────────────────────────────────
  submitSupport: async ({ topic, message }) => {
    const res = await fetch(`${BASE_URL}/support`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ topic, message }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Support submission failed.');
    }
    return res.json();
  },

  // ─── Personalized Learning ───────────────────────────────────────────────────
  getLearningStatus: async () => {
    const res = await fetch(`${BASE_URL}/learning/status`, { headers: getHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to load learning status.');
    return data;
  },

  createLearningCheckout: async (editionNumber) => {
    const res = await fetch(`${BASE_URL}/learning/checkout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ edition_number: editionNumber }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Checkout failed.');
    return data;
  },

  getLearningDownloadUrl: async (editionNumber) => {
    const res = await fetch(`${BASE_URL}/learning/download/${editionNumber}`, {
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Download failed.');
    return data;
  },

  retryLearningGeneration: async (editionNumber) => {
    const res = await fetch(`${BASE_URL}/learning/retry/${editionNumber}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Retry failed.');
    return data;
  },
};
