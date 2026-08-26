import { apiFetch } from './client';
import type { AuditLog, AuditListFilters, Pagination } from '../types';

export function list(
  filters?: AuditListFilters,
): Promise<{ auditLogs: AuditLog[]; pagination: Pagination }> {
  return apiFetch<{ auditLogs: AuditLog[]; pagination: Pagination }>('/audit-logs', {
    query: filters,
  });
}

export function get(id: string): Promise<{ auditLog: AuditLog }> {
  return apiFetch<{ auditLog: AuditLog }>(`/audit-logs/${id}`);
}
