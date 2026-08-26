// Access + refresh token persistence for the SPA.
//
// The backend runs with CORS `*` and there is no BFF, so httpOnly cookies are not
// viable here. Per the integration guide's stated fallback we keep tokens in
// localStorage and rely on short access-token lifetime + refresh rotation. An
// in-memory mirror avoids a synchronous localStorage read on every request.

const ACCESS_KEY = 'sm_access_token';
const REFRESH_KEY = 'sm_refresh_token';

let accessToken: string | null = null;
let refreshToken: string | null = null;

try {
  accessToken = localStorage.getItem(ACCESS_KEY);
  refreshToken = localStorage.getItem(REFRESH_KEY);
} catch {
  // localStorage unavailable (private mode / SSR) — fall back to memory only.
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  try {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
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
  } catch {
    // ignore
  }
}
