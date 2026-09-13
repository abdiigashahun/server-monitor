import { apiFetch } from './client';
import type { Department, CreateDepartmentInput, UpdateDepartmentInput } from '../types';

export function list(): Promise<{ departments: Department[]; length: number }> {
  return apiFetch<{ departments: Department[]; length: number }>('/admin/departments');
}

export function create(input: CreateDepartmentInput): Promise<{ department: Department }> {
  return apiFetch<{ department: Department }>('/admin/departments', {
    method: 'POST',
    body: input,
  });
}

export function update(
  id: string,
  input: UpdateDepartmentInput,
): Promise<{ department: Department }> {
  return apiFetch<{ department: Department }>(`/admin/departments/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function remove(id: string): Promise<{ department: Department }> {
  return apiFetch<{ department: Department }>(`/admin/departments/${id}`, {
    method: 'DELETE',
  });
}
