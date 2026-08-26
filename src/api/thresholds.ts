import { apiFetch } from './client';
import type {
  Threshold,
  ThresholdMetric,
  ThresholdScope,
  CreateThresholdInput,
  UpdateThresholdInput,
} from '../types';

export interface ThresholdListFilters {
  metric?: ThresholdMetric;
  scope?: ThresholdScope;
  serverId?: string;
}

export function list(filters?: ThresholdListFilters): Promise<{ thresholds: Threshold[] }> {
  return apiFetch<{ thresholds: Threshold[] }>('/thresholds', { query: filters });
}

export function create(input: CreateThresholdInput): Promise<{ threshold: Threshold }> {
  return apiFetch<{ threshold: Threshold }>('/thresholds', {
    method: 'POST',
    body: input,
  });
}

export function update(id: string, input: UpdateThresholdInput): Promise<{ threshold: Threshold }> {
  return apiFetch<{ threshold: Threshold }>(`/thresholds/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function remove(id: string): Promise<{ threshold: Threshold }> {
  return apiFetch<{ threshold: Threshold }>(`/thresholds/${id}`, { method: 'DELETE' });
}
