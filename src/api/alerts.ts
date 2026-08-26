import { apiFetch } from './client';
import type { Alert, AlertListFilters, AlertStatus, Pagination } from '../types';

export function list(
  filters?: AlertListFilters,
): Promise<{ alerts: Alert[]; pagination: Pagination }> {
  return apiFetch<{ alerts: Alert[]; pagination: Pagination }>('/alerts', { query: filters });
}

export function get(id: string): Promise<{ alert: Alert }> {
  return apiFetch<{ alert: Alert }>(`/alerts/${id}`);
}

// Only ACKNOWLEDGED | RESOLVED are accepted by the backend.
export function updateStatus(
  id: string,
  status: Extract<AlertStatus, 'ACKNOWLEDGED' | 'RESOLVED'>,
): Promise<{ alert: Alert }> {
  return apiFetch<{ alert: Alert }>(`/alerts/${id}`, {
    method: 'PATCH',
    body: { status },
  });
}
