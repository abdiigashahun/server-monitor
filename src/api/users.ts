import { apiFetch } from './client';
import type { User, CreateUserInput, UpdateUserInput, Role } from '../types';

export interface UserListFilters {
  name?: string;
  email?: string;
  role?: Role;
}

export function list(filters?: UserListFilters): Promise<{ users: User[] }> {
  return apiFetch<{ users: User[] }>('/users', { query: filters });
}

export function get(id: string): Promise<{ user: User }> {
  return apiFetch<{ user: User }>(`/users/${id}`);
}

export function create(input: CreateUserInput): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/users', { method: 'POST', body: input });
}

export function update(id: string, input: UpdateUserInput): Promise<{ user: User }> {
  return apiFetch<{ user: User }>(`/users/${id}`, { method: 'PATCH', body: input });
}

export function remove(id: string): Promise<{ user: User }> {
  return apiFetch<{ user: User }>(`/users/${id}`, { method: 'DELETE' });
}
