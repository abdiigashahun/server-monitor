import { apiRequest } from './apiClient';

export type BackendAlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export type BackendAlertSeverity = 'CRITICAL' | 'WARNING';
export type BackendAlertMetric = 'DISK' | 'CPU' | 'MEMORY' | 'BACKUP' | 'DOWN';

export interface BackendAlert {
  id: string;
  serverId: string;
  type: BackendAlertMetric;
  severity: BackendAlertSeverity;
  message: string;
  status: BackendAlertStatus;
  createdAt: string;
  resolvedAt?: string | null;
  thresholdId?: string | null;
  server?: {
    id: string;
    name: string;
    ipOrHostname: string;
    department?: string;
    criticality?: string;
  };
}

export const alertsApi = {
  async getAlerts(params?: { status?: string; severity?: string; page?: number; limit?: number }): Promise<{ alerts: BackendAlert[]; pagination?: any }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.severity) query.set('severity', params.severity);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest<{ alerts: BackendAlert[]; pagination?: any }>(`/alerts${qs}`);
  },

  async getAlertById(id: string): Promise<{ alert: BackendAlert }> {
    return await apiRequest<{ alert: BackendAlert }>(`/alerts/${id}`);
  },

  async updateAlertStatus(id: string, status: 'ACKNOWLEDGED' | 'RESOLVED'): Promise<{ alert: BackendAlert }> {
    return await apiRequest<{ alert: BackendAlert }>(`/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
