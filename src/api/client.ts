// Core API client for the Server-Monitor backend.
//
// Responsibilities:
//  - Prefix requests with the configured base URL.
//  - Inject `Authorization: Bearer <accessToken>` on authenticated calls.
//  - Unwrap the `{ success, data }` envelope; throw a typed `ApiError` on failure.
//  - On 401, perform a single-flight refresh (`POST /auth/refresh`) and retry once.
//    If refresh fails, clear tokens and notify the app (→ redirect to login).
//
// The backend exposes routes at the root path (no `/api/v1` prefix for the client
// surface). Agent-only routes (`/api/v1/agent/register`, `/api/v1/health`) are never
// called from here.

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from './tokenStore';

export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'https://server-monitor-skil.onrender.com'
).replace(/\/+$/, '');

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code = 'ERROR', status = 0, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Notified when the session is unrecoverable (refresh failed / no refresh token).
// AuthContext registers a handler to drop the user back to the login screen.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Query params; keys with undefined/null/'' values are skipped. Accepts typed filter interfaces. */
  query?: object;
  signal?: AbortSignal;
  /** Set false for public endpoints (login/refresh). Defaults to true. */
  auth?: boolean;
}

function buildUrl(path: string, query?: object): string {
  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

// --- single-flight refresh -------------------------------------------------
let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const token = getRefreshToken();
  if (!token) return false;
  try {
    const res = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success || !json?.data?.accessToken) return false;
    setTokens(json.data.accessToken, json.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// --- low-level send with 401 → refresh → retry-once ------------------------
async function send(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, query, signal, auth = true } = options;
  const url = buildUrl(path, query);

  const doFetch = (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const access = getAccessToken();
      if (access) headers['Authorization'] = `Bearer ${access}`;
    }
    return fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  };

  let res = await doFetch();

  if (res.status === 401 && auth && getRefreshToken()) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      res = await doFetch();
    }
    if (res.status === 401) {
      clearTokens();
      onUnauthorized?.();
    }
  }

  return res;
}

// The backend error envelope has drifted between builds: some responses use the
// nested `{ success:false, error:{ code, message, details? } }` shape, others a
// flat `{ success:false, message, code? }`. Read both (nested wins) so the real
// message — and any future field-level `details` — survives either shape.
type ErrorBody =
  | {
      error?: { code?: string; message?: string; details?: unknown };
      code?: string;
      message?: string;
      details?: unknown;
    }
  | null;

function extractError(json: ErrorBody, status: number, fallback: string): ApiError {
  const nested = json?.error;
  const message = nested?.message ?? json?.message ?? fallback;
  const code = nested?.code ?? json?.code ?? 'ERROR';
  const details = nested?.details ?? json?.details;
  return new ApiError(message, code, status, details);
}

async function toApiError(res: Response): Promise<ApiError> {
  const json = await res.json().catch(() => null);
  return extractError(json, res.status, res.statusText || 'Request failed');
}

/** Authenticated JSON request. Returns the unwrapped `data` payload. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(path, options);
  if (!res.ok) throw await toApiError(res);
  // 204 No Content or empty body
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (json && json.success === false) {
    throw extractError(json, res.status, 'Request failed');
  }
  return (json?.data ?? json) as T;
}

/** Raw request for binary downloads (reports). Returns the Response; caller reads the blob. */
export async function rawFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  const res = await send(path, options);
  if (!res.ok) throw await toApiError(res);
  return res;
}
