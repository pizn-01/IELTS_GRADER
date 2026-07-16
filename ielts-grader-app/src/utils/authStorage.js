const TOKEN_KEY = 'token';
const REMEMBER_KEY = 'remember_me';
const SAVED_EMAIL_KEY = 'saved_login_email';
const POST_AUTH_REDIRECT_KEY = 'post_auth_redirect';

/**
 * Persist JWT. remember=true → localStorage (survives browser restart).
 * remember=false → sessionStorage only (cleared when the tab/window closes).
 */
export function setAuthToken(token, remember = true) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_KEY, '1');
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(REMEMBER_KEY, '0');
  }
}

export function setRememberedEmail(email, remember = true) {
  if (remember && email) {
    localStorage.setItem(SAVED_EMAIL_KEY, email);
  } else {
    localStorage.removeItem(SAVED_EMAIL_KEY);
  }
}

export function getRememberedEmail() {
  if (!getRememberMePreference()) return '';
  return localStorage.getItem(SAVED_EMAIL_KEY) || '';
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getRememberMePreference() {
  const v = localStorage.getItem(REMEMBER_KEY);
  // Default to remembered when no preference has been set yet.
  if (v === null) return true;
  return v === '1';
}

/** Remember where to send the user after OAuth (full page redirect). */
export function setPostAuthRedirect(path) {
  if (path && path.startsWith('/') && !path.startsWith('//')) {
    sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, path);
  }
}

export function consumePostAuthRedirect(fallback = '/dashboard') {
  const path = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
  sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  if (path && path.startsWith('/') && !path.startsWith('//')) return path;
  return fallback;
}

const PENDING_GRADE_KEY = 'pending_grade_payload';
const VERIFY_EMAIL_SENT_KEY = 'verify_email_sent_after_eval';

/**
 * Persist essay/exam payload across login/signup (and Google OAuth full-page redirect).
 * Only JSON-serializable fields — no File objects.
 */
export function setPendingGradePayload(payload) {
  if (!payload || typeof payload !== 'object') return;
  try {
    sessionStorage.setItem(PENDING_GRADE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function peekPendingGradePayload() {
  try {
    const raw = sessionStorage.getItem(PENDING_GRADE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function consumePendingGradePayload() {
  const payload = peekPendingGradePayload();
  try {
    sessionStorage.removeItem(PENDING_GRADE_KEY);
  } catch {
    /* ignore */
  }
  return payload;
}

export function markVerificationEmailSent() {
  try {
    sessionStorage.setItem(VERIFY_EMAIL_SENT_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function wasVerificationEmailSent() {
  try {
    return sessionStorage.getItem(VERIFY_EMAIL_SENT_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearVerificationEmailSent() {
  try {
    sessionStorage.removeItem(VERIFY_EMAIL_SENT_KEY);
  } catch {
    /* ignore */
  }
}
