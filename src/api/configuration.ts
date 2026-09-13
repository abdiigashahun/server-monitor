import { apiFetch } from './client';
import type { Department } from '../types';

export function get(): Promise<{ departments: Department[] }> {
  return apiFetch<{ departments: Department[] }>('/configuration');
}
