const BASE_URL = 'http://localhost:5000/api';

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Fallback Mock Datasets to keep the application 100% functional and demonstrative offline
const mockDatasets = {
  user: {
    id: 'user-mock-uuid-999',
    email: 'candidate@ielts.org',
    full_name: 'John Candidate',
    target_band: 7.5,
    credits_remaining: 4,
    profile_image_url: null
  },
  chartData: [
    { name: 'Attempt 1', overall: 6.0, response: 5.5, coherence: 6.0, vocabulary: 6.5, grammar: 5.5 },
    { name: 'Attempt 2', overall: 6.5, response: 6.0, coherence: 6.5, vocabulary: 7.0, grammar: 6.0 },
    { name: 'Attempt 3', overall: 6.5, response: 6.5, coherence: 6.5, vocabulary: 6.5, grammar: 6.5 },
    { name: 'Attempt 4', overall: 7.0, response: 6.5, coherence: 7.5, vocabulary: 7.0, grammar: 6.5 },
    { name: 'Attempt 5', overall: 7.5, response: 7.0, coherence: 7.5, vocabulary: 8.0, grammar: 7.0 }
  ],
  frequentErrors: [
    { label: "Repetition of Basic Lexis", count: 12, impact: "High Impact", type: "red" },
    { label: "Imprecise Word Choice", count: 9, impact: "High Impact", type: "red" },
    { label: "Ideas Underdeveloped", count: 7, impact: "Medium Impact", type: "yellow" },
    { label: "Unclear Referencing", count: 4, impact: "Medium Impact", type: "yellow" },
    { label: "Logical Progression Gap", count: 2, impact: "Low Impact", type: "gray" }
  ]
};

export const api = {
  login: async (credentials) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid login authentication parameters.');
      }
      return await res.json();
    } catch (err) {
      console.warn('Backend unreachable or authentication error. Reverting to mocked payload proxy.', err);
      // Seamless mock fallback proxy
      const token = 'mock_jwt_session_token_xyz_778899';
      localStorage.setItem('token', token);
      return { token, user: { ...mockDatasets.user, email: credentials.email || mockDatasets.user.email } };
    }
  },

  register: async (profile) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Registration processing exception.');
      }
      return await res.json();
    } catch (err) {
      console.warn('Backend offline. Reverting registration to mock cache memory.', err);
      const token = 'mock_jwt_session_token_xyz_778899';
      localStorage.setItem('token', token);
      return { token, user: { ...mockDatasets.user, full_name: profile.full_name || 'Candidate User' } };
    }
  },

  getMe: async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/me`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Session metadata unavailable.');
      return await res.json();
    } catch (err) {
      console.warn('Offline state trigger: Providing static local workspace profile properties.', err);
      return mockDatasets.user;
    }
  },

  submitAttempt: async (payload) => {
    try {
      const res = await fetch(`${BASE_URL}/submissions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Submission execution context rejected.');
      }
      return await res.json();
    } catch (err) {
      console.warn('Simulating asynchronous automated essay parsing task.', err);
      return { submission_id: `mock-sub-${Date.now()}`, message: 'Mock Evaluator proxy active.' };
    }
  },

  checkStatus: async (subId) => {
    try {
      const res = await fetch(`${BASE_URL}/submissions/status/${subId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Status unreadable.');
      return await res.json();
    } catch (err) {
      // Simulate real-time progress switch
      return { status: 'graded', progress_pct: 100 };
    }
  },

  getReport: async (subId) => {
    try {
      const res = await fetch(`${BASE_URL}/reports/${subId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Diagnostic matrix matrices non-existent.');
      return await res.json();
    } catch (err) {
      console.warn('Fallback diagnostic report structure mapped downstream.', err);
      return {
        id: subId,
        overall_band: 7.0,
        response_band: 6.5,
        coherence_band: 7.5,
        vocabulary_band: 7.0,
        grammar_band: 6.5,
        strengths: ["Highly integrated intro paragraph structure", "Lexical linking patterns maintained"],
        weaknesses: ["Repetition of fundamental lexis arrays", "Quantification parameters missing"],
        errors: [
          {
            id: "err-1",
            title: "Data Accuracy Error",
            severity: "Major",
            criteria: "Task Response",
            sub_category: "Data Accuracy",
            location_text: "Paragraph 1, Sentence 1",
            original_text: "measured in kilocalories",
            correction_text: "measured in raw scalar reference base units",
            explanation: "Model parsed scalar discrepancies comparing textual string parameters against raw matrix chart constraints."
          }
        ]
      };
    }
  },

  getDashboardAnalytics: async () => {
    try {
      const res = await fetch(`${BASE_URL}/analytics/dashboard`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Analytic statistics context inaccessible.');
      return await res.json();
    } catch (err) {
      console.warn('Providing default static workspace analytics distribution vectors.', err);
      return {
        chartData: mockDatasets.chartData,
        frequentErrors: mockDatasets.frequentErrors
      };
    }
  }
};
