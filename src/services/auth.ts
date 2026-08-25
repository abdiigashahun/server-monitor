// src/services/auth.ts

const API_BASE_URL = 'https://server-monitor-skil.onrender.com';

export interface AuthUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface LoginResponse {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  data?: any;
}

export const getStoredToken = (): string | null => {
  return (
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token')
  );
};

export const getAuthToken = getStoredToken;

export const isAuthenticated = (): boolean => {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;
    const decodedJson = JSON.parse(atob(payloadBase64));
    
    if (decodedJson.exp) {
      return Date.now() < decodedJson.exp * 1000;
    }
  } catch (e) {
    return true;
  }

  return true;
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  const token = getStoredToken();
  
  if (!token) {
    throw new Error('No token stored');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  const json = await response.json();
  
  // Directly targeting the response structure shown in Swagger: json.data.user
  const user = json.data?.user || json.user || json.data || json;
  return user;
};

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || errorData.message || 'Invalid credentials');
  }

  const json: any = await response.json();
  
  // Extract token and user whether nested inside json.data or top-level
  const payload = json.data || json;
  const receivedAccessToken = payload.accessToken || payload.token || json.accessToken || json.token;
  const receivedRefreshToken = payload.refreshToken || json.refreshToken || receivedAccessToken;
  const userObj = payload.user || json.user;

  if (receivedAccessToken) {
    localStorage.setItem('accessToken', receivedAccessToken);
    localStorage.setItem('authToken', receivedAccessToken);
    localStorage.setItem('token', receivedAccessToken);
  }

  if (receivedRefreshToken) {
    localStorage.setItem('refreshToken', receivedRefreshToken);
  }

  if (userObj?.role) {
    localStorage.setItem('userRole', userObj.role);
  }

  return {
    accessToken: receivedAccessToken,
    refreshToken: receivedRefreshToken,
    user: userObj
  };
};

export const logout = async (): Promise<void> => {
  const refreshToken = localStorage.getItem('refreshToken') || getStoredToken() || '';
  const accessToken = getStoredToken() || '';

  try {
    if (accessToken) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch (error) {
    console.error('[Auth] Network error during logout:', error);
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
  }
};