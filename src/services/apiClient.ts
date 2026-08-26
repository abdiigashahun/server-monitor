/**
 * API Client configuration and request handling for server-monitor backend
 * Backend Base URL: https://server-monitor-skil.onrender.com
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://server-monitor-skil.onrender.com';

const ACCESS_TOKEN_KEY = 'itdb_access_token';
const REFRESH_TOKEN_KEY = 'itdb_refresh_token';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
}

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken(token: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Main HTTP client wrapper
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (requireAuth) {
    const token = tokenStorage.getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token expiration & automatic refresh
    if (response.status === 401 && requireAuth && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            const refreshJson: ApiResponse<{ accessToken: string; refreshToken: string }> = await refreshRes.json();
            
            if (refreshRes.ok && refreshJson.success && refreshJson.data) {
              tokenStorage.setAccessToken(refreshJson.data.accessToken);
              tokenStorage.setRefreshToken(refreshJson.data.refreshToken);
              onRefreshed(refreshJson.data.accessToken);
            } else {
              tokenStorage.clearTokens();
              window.dispatchEvent(new CustomEvent('auth:session-expired'));
              throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401);
            }
          } catch (refreshErr) {
            tokenStorage.clearTokens();
            window.dispatchEvent(new CustomEvent('auth:session-expired'));
            throw refreshErr;
          } finally {
            isRefreshing = false;
          }
        }

        // Retry original request with new token
        const retryPromise = new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh(async (newToken: string) => {
            try {
              headers.set('Authorization', `Bearer ${newToken}`);
              const retryResponse = await fetch(url, {
                ...options,
                headers,
              });
              const retryData = await handleApiResponse<T>(retryResponse);
              resolve(retryData);
            } catch (err) {
              reject(err);
            }
          });
        });

        return await retryPromise;
      }
    }

    return await handleApiResponse<T>(response);
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network connection failed', 'NETWORK_ERROR', 0);
  }
}

async function handleApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    const json: ApiResponse<T> = await response.json();
    if (!response.ok || json.success === false) {
      const msg = json.error?.message || json.message || `Request failed with status ${response.status}`;
      const code = json.error?.code || `HTTP_${response.status}`;
      throw new ApiError(msg, code, response.status, json.error?.details);
    }
    return (json.data !== undefined ? json.data : json) as T;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || `Request failed with status ${response.status}`, `HTTP_${response.status}`, response.status);
  }

  return (await response.text()) as unknown as T;
}

export async function downloadFile(endpoint: string, filename: string): Promise<void> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = tokenStorage.getAccessToken();

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    let errMsg = `Export failed with status ${response.status}`;
    try {
      const json = await response.json();
      errMsg = json.error?.message || json.message || errMsg;
    } catch {}
    throw new ApiError(errMsg, `EXPORT_ERROR_${response.status}`, response.status);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export { API_BASE_URL };
