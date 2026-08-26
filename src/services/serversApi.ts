import { apiRequest } from './apiClient';

export type BackendOsType = 'LINUX' | 'WINDOWS';
export type BackendCriticality = 'HIGH' | 'MEDIUM' | 'LOW';

export interface BackendServer {
  id: string;
  name: string;
  ipOrHostname: string;
  type: string;
  os: BackendOsType;
  location: string;
  department: string;
  criticality: BackendCriticality;
  owner: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateServerDto {
  name: string;
  ipOrHostname: string;
  type: string;
  os: BackendOsType;
  location: string;
  department: string;
  criticality: BackendCriticality;
  owner: string;
}

export interface UpdateServerDto {
  name?: string;
  ipOrHostname?: string;
  type?: string;
  os?: BackendOsType;
  location?: string;
  department?: string;
  criticality?: BackendCriticality;
  owner?: string;
}

export interface HealthLogSample {
  id?: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptimeSeconds: number;
  lastBootAt: string;
  networkStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  createdAt: string;
}

export interface ServerHealthResponse {
  serverId: string;
  ipOrHostname: string;
  range: '7d' | '30d';
  latest: HealthLogSample | null;
  history: HealthLogSample[];
}

export interface BackupLogSample {
  id?: string;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  backupType: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL' | 'SNAPSHOT';
  sizeBytes: number;
  storageLocation: string;
  completedAt: string;
  createdAt: string;
}

export interface ServerBackupsResponse {
  serverId: string;
  ipOrHostname: string;
  range: '7d' | '30d';
  latest: BackupLogSample | null;
  history: BackupLogSample[];
  staleness: {
    lastSuccessAt: string | null;
    ageSeconds: number | null;
    staleAfterHours: number;
    isStale: boolean;
  };
}

export const serversApi = {
  async getServers(params?: { search?: string; status?: string; os?: string; page?: number; limit?: number }): Promise<{ servers: BackendServer[]; pagination?: any }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.os) query.set('os', params.os);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest<{ servers: BackendServer[]; pagination?: any }>(`/servers${qs}`);
  },

  async getServerById(id: string): Promise<{ server: BackendServer }> {
    return await apiRequest<{ server: BackendServer }>(`/servers/${id}`);
  },

  async createServer(data: CreateServerDto): Promise<{ server: BackendServer; agentToken: string }> {
    return await apiRequest<{ server: BackendServer; agentToken: string }>('/servers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateServer(id: string, data: UpdateServerDto): Promise<{ server: BackendServer }> {
    return await apiRequest<{ server: BackendServer }>(`/servers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteServer(id: string): Promise<{ success: boolean; message?: string }> {
    return await apiRequest<{ success: boolean; message?: string }>(`/servers/${id}`, {
      method: 'DELETE',
    });
  },

  async getServerHealth(id: string, range: '7d' | '30d' = '7d'): Promise<ServerHealthResponse> {
    return await apiRequest<ServerHealthResponse>(`/servers/${id}/health?range=${range}`);
  },

  async getServerBackups(id: string, range: '7d' | '30d' = '7d'): Promise<ServerBackupsResponse> {
    return await apiRequest<ServerBackupsResponse>(`/servers/${id}/backups?range=${range}`);
  },
};
