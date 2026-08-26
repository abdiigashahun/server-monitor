import { apiRequest } from './apiClient';

export type BackendThresholdMetric = 'DISK' | 'CPU' | 'MEMORY' | 'BACKUP_AGE_HOURS';
export type BackendThresholdScope = 'GLOBAL' | 'SERVER';

export interface BackendThreshold {
  id: string;
  metric: BackendThresholdMetric;
  warningValue: number;
  criticalValue: number;
  scope: BackendThresholdScope;
  serverId?: string | null;
  server?: {
    id: string;
    name: string;
    ipOrHostname?: string;
  } | null;
}

export interface CreateThresholdDto {
  metric: BackendThresholdMetric;
  warningValue: number;
  criticalValue: number;
  scope: BackendThresholdScope;
  serverId?: string | null;
}

export interface UpdateThresholdDto {
  warningValue?: number;
  criticalValue?: number;
}

export const thresholdsApi = {
  async getThresholds(): Promise<{ thresholds: BackendThreshold[] }> {
    return await apiRequest<{ thresholds: BackendThreshold[] }>('/thresholds');
  },

  async getThresholdById(id: string): Promise<{ threshold: BackendThreshold }> {
    return await apiRequest<{ threshold: BackendThreshold }>(`/thresholds/${id}`);
  },

  async createThreshold(data: CreateThresholdDto): Promise<{ threshold: BackendThreshold }> {
    return await apiRequest<{ threshold: BackendThreshold }>('/thresholds', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateThreshold(id: string, data: UpdateThresholdDto): Promise<{ threshold: BackendThreshold }> {
    return await apiRequest<{ threshold: BackendThreshold }>(`/thresholds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteThreshold(id: string): Promise<{ success: boolean }> {
    return await apiRequest<{ success: boolean }>(`/thresholds/${id}`, {
      method: 'DELETE',
    });
  },
};
