// src/services/serverService.ts

export interface ServerData {
  name: string;
  ipOrHostname: string;
  type?: string;
  os: string;
  location?: string;
  department: string;
  criticality: string;
  owner?: string;
}

export interface AdminPingResponse {
  success: boolean;
  message: string;
}

export interface HealthPayload {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptimeSeconds: number;
  lastBootAt: string;
  networkStatus: string;
}

// Fixed API Base URL based on Swagger curl output
const API_BASE_URL = 'https://server-monitor-skil.onrender.com';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

const handleResponseError = async (response: Response, defaultMessage: string) => {
  if (!response.ok) {
    let errorMessage = defaultMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || defaultMessage;
    } catch {
      // Fallback for non-JSON responses
    }
    throw new Error(`HTTP ${response.status}: ${errorMessage}`);
  }
};

/**
 * Confirms the caller is authenticated and has admin permissions.
 * Hits GET /admin/ping
 */
export const checkAdminPing = async (): Promise<AdminPingResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/ping`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  await handleResponseError(response, 'Admin access check failed');
  return response.json();
};

export const getServers = async (): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/servers`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  await handleResponseError(response, 'Failed to fetch servers');
  return response.json();
};

export const createServer = async (data: ServerData): Promise<{ agentToken?: string; [key: string]: any }> => {
  // Ensure default values match the Swagger schema
  const payload = {
    name: data.name,
    ipOrHostname: data.ipOrHostname,
    type: data.type || 'application',
    os: data.os || 'LINUX',
    location: data.location || 'Addis Ababa',
    department: data.department,
    criticality: data.criticality || 'HIGH',
    owner: data.owner || 'Ops Team',
  };

  const response = await fetch(`${API_BASE_URL}/servers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  await handleResponseError(response, 'Failed to create server');
  return response.json();
};

export const updateServer = async (id: string, data: Partial<ServerData>): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/servers/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  await handleResponseError(response, 'Failed to update server');
  return response.json();
};

export const deleteServer = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/servers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  await handleResponseError(response, 'Failed to delete server');
};

/**
 * Ingests a server health sample.
 * Hits POST /api/v1/health using the server's agent Bearer token.
 */
export const ingestHealthSample = async (agentToken: string, payload: HealthPayload): Promise<any> => {
  if (!agentToken) {
    throw new Error('Agent token is missing. Please provide a valid server agent token.');
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${agentToken}`,
    },
    body: JSON.stringify(payload),
  });

  await handleResponseError(response, 'Failed to ingest health sample');
  return response.json();
};

const serverService = {
  checkAdminPing,
  getServers,
  createServer,
  updateServer,
  deleteServer,
  ingestHealthSample,
};

export default serverService;