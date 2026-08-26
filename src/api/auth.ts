import { apiFetch } from './client';
import type { AuthPayload, AuthUser } from '../types';

export function login(email: string, password: string): Promise<AuthPayload> {
  return apiFetch<AuthPayload>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
}

export function logout(refreshToken: string): Promise<{ message?: string }> {
  return apiFetch<{ message?: string }>('/auth/logout', {
    method: 'POST',
    body: { refreshToken },
    auth: false,
  });
}

export function me(): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>('/auth/me');
}
