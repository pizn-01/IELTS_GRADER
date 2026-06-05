const BASE_URL = '/api';

const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
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
    credits_remaining: 4,
    profile_image_url: null,
  },
  chartData: [
    { name: 'W1', overall: 6.8, response: 6.3, coherence: 6.0, vocabulary: 7.4, grammar: 6.5 },
    { name: 'W2', overall: 7.2, response: 6.7, coherence: 6.4, vocabulary: 7.8, grammar: 6.9 },
    { name: 'W3', overall: 7.4, response: 6.9, coherence: 6.6, vocabulary: 8.0, grammar: 7.1 },
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
        throw new Error(data.error || 'Invalid email or password.');
      }
      return await res.json();
    } catch (err) {
      if (serverReachable) throw err; // Real server error — show to user
      // Network unreachable — offline demo mode only
      console.warn('[DEMO] Backend unreachable — offline mock login.', err.message);
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
      console.warn('[DEMO] Backend unreachable — offline mock register.', err.message);
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
        const err = new Error(`Session invalid (${res.status}).`);
        err.status = res.status;
        throw err;
      }
      return await res.json();
    } catch (err) {
      console.warn('Session verification failed:', err.message);
      throw err;
    }
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
      console.warn('[DEMO] Backend unreachable — mock submission.', err.message);
      return { submission_id: `mock-sub-${Date.now()}`, message: 'Offline demo mode.' };
    }
  },

  // ─── GET /api/submissions/status/:id ────────────────────────────────────────
  checkStatus: async (subId) => {
    let serverReachable = false;
    try {
      const res = await fetch(`${BASE_URL}/submissions/status/${subId}`, { headers: getHeaders() });
      serverReachable = true;
      if (!res.ok) throw new Error(`Status check failed (${res.status}).`);
      return await res.json();
    } catch (err) {
      if (serverReachable) throw err;
      return { status: 'graded', progress_pct: 100 }; // Offline fallback
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
      console.warn('[DEMO] Backend unreachable — offline mock report.', err.message);
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
      if (!res.ok) throw new Error(`Analytics unavailable (${res.status}).`);
      return await res.json();
    } catch (err) {
      if (serverReachable) {
        // Server reachable but error — return empty (no fake data)
        return { chartData: [], frequentErrors: [] };
      }
      // Network unreachable — show demo data
      console.warn('[DEMO] Backend unreachable — offline analytics.', err.message);
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
      if (!res.ok) throw new Error(`Failed to fetch submissions (${res.status}).`);
      return await res.json();
    } catch (err) {
      if (serverReachable) return { data: [], total: 0 }; // Server error — empty, not mock
      console.warn('[DEMO] Backend unreachable — empty submissions.', err.message);
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
  googleAuth: async (access_token) => {
    const res = await fetch(`${BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token }),
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

  // ─── Admin API ───────────────────────────────────────────────────────────────
  admin: {
    getStats: () => fetch(`${BASE_URL}/admin/stats`, { headers: getHeaders() }).then(r => r.json()),
    getUsers: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/admin/users?${q}`, { headers: getHeaders() }).then(r => r.json());
    },
    getUser: (id) => fetch(`${BASE_URL}/admin/users/${id}`, { headers: getHeaders() }).then(r => r.json()),
    updateUser: (id, body) => fetch(`${BASE_URL}/admin/users/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(body) }).then(r => r.json()),
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
};
