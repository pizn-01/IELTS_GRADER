const TOKEN_KEY = 'token';
const REMEMBER_KEY = 'remember_me';

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
