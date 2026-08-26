import { apiRequest } from './apiClient';

export interface BackendAuditLog {
  id: string;
  userId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export const auditApi = {
  async getAuditLogs(params?: { page?: number; limit?: number }): Promise<{ auditLogs: BackendAuditLog[]; pagination?: any }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest<{ auditLogs: BackendAuditLog[]; pagination?: any }>(`/audit-logs${qs}`);
  },

  async getAuditLogById(id: string): Promise<{ auditLog: BackendAuditLog }> {
    return await apiRequest<{ auditLog: BackendAuditLog }>(`/audit-logs/${id}`);
  },
};
