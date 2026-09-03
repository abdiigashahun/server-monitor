import { apiFetch } from './client';
import type { DashboardData, Range } from '../types';

export function get(range: Range = '7d'): Promise<DashboardData> {
  return apiFetch<DashboardData>('/dashboard', { query: { range } });
}
