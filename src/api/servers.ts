import { apiFetch } from './client';
import type {
  Server,
  ServerListFilters,
  CreateServerInput,
  CreateServerGroupInput,
  CreateServerGroupResponse,
  UpdateServerInput,
  ServerHealth,
  ServerBackups,
  ServerPingResult,
  Range,
} from '../types';

export function list(filters?: ServerListFilters): Promise<{ servers: Server[] }> {
  return apiFetch<{ servers: Server[] }>('/servers', { query: filters });
}

export function get(id: string): Promise<{ server: Server }> {
  return apiFetch<{ server: Server }>(`/servers/${id}`);
}

export function create(input: CreateServerInput): Promise<{ server: Server; agentToken: string | null }> {
  return apiFetch<{ server: Server; agentToken: string | null }>('/servers', {
    method: 'POST',
    body: input,
  });
}

export function createGroup(input: CreateServerGroupInput): Promise<CreateServerGroupResponse> {
  return apiFetch<CreateServerGroupResponse>('/servers/group', {
    method: 'POST',
    body: input,
  });
}

export function update(id: string, input: UpdateServerInput): Promise<{ server: Server }> {
  return apiFetch<{ server: Server }>(`/servers/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function remove(id: string): Promise<{ server: Server }> {
  return apiFetch<{ server: Server }>(`/servers/${id}`, { method: 'DELETE' });
}

export function rotateToken(id: string): Promise<{ server: Server; agentToken: string }> {
  return apiFetch<{ server: Server; agentToken: string }>(`/servers/${id}/rotate-token`, {
    method: 'POST',
  });
}

export function health(id: string, range: Range = '7d'): Promise<ServerHealth> {
  return apiFetch<ServerHealth>(`/servers/${id}/health`, { query: { range } });
}

export function backups(id: string, range: Range = '7d'): Promise<ServerBackups> {
  return apiFetch<ServerBackups>(`/servers/${id}/backups`, { query: { range } });
}

/** Real host reachability check (ICMP/TCP). Not the same as GET /admin/ping. */
export function ping(id: string): Promise<ServerPingResult> {
  return apiFetch<ServerPingResult>(`/servers/${id}/ping`, { method: 'POST' });
}
