// Access + refresh token persistence for the SPA.
//
// When Remember Me is checked, tokens persist in localStorage across sessions.
// When unchecked, tokens persist in sessionStorage (cleared on browser close).
// An in-memory mirror avoids synchronous storage reads on every request.

const ACCESS_KEY = 'sm_access_token';
const REFRESH_KEY = 'sm_refresh_token';

let accessToken: string | null = null;
let refreshToken: string | null = null;

try {
  accessToken = localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY);
  refreshToken = localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
} catch {
  // Storage unavailable (private mode / SSR) — fall back to memory only.
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function setTokens(access: string, refresh: string, remember: boolean = true): void {
  accessToken = access;
  refreshToken = refresh;
  try {
    if (remember) {
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
      sessionStorage.removeItem(ACCESS_KEY);
      sessionStorage.removeItem(REFRESH_KEY);
    } else {
      sessionStorage.setItem(ACCESS_KEY, access);
      sessionStorage.setItem(REFRESH_KEY, refresh);
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
  } catch {
    // ignore persistence failure; in-memory values still work for this session.
  }
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}
