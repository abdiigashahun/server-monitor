import { apiRequest, tokenStorage } from './apiClient';

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  permissions: Record<string, boolean>;
  createdAt?: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: BackendUser;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthTokensResponse> {
    const data = await apiRequest<AuthTokensResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      false
    );

    if (data.accessToken && data.refreshToken) {
      tokenStorage.setAccessToken(data.accessToken);
      tokenStorage.setRefreshToken(data.refreshToken);
    }

    return data;
  },

  async refreshToken(): Promise<{ accessToken: string; refreshToken: string; user?: BackendUser }> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const data = await apiRequest<{ accessToken: string; refreshToken: string; user?: BackendUser }>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      },
      false
    );

    if (data.accessToken && data.refreshToken) {
      tokenStorage.setAccessToken(data.accessToken);
      tokenStorage.setRefreshToken(data.refreshToken);
    }

    return data;
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await apiRequest(
          '/auth/logout',
          {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          },
          true
        );
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      tokenStorage.clearTokens();
    }
  },

  async getMe(): Promise<{ user: BackendUser }> {
    return await apiRequest<{ user: BackendUser }>('/auth/me', { method: 'GET' }, true);
  },

  async checkHealth(): Promise<{ message: string }> {
    return await apiRequest<{ message: string }>('/health', { method: 'GET' }, false);
  },
};
