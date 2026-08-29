import { apiFetch } from './client';

export interface AdminPingResponse {
  success: boolean;
  message: string;
}

export function adminPing(): Promise<AdminPingResponse> {
  return apiFetch<AdminPingResponse>('/admin/ping');
}