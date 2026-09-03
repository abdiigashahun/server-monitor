import { apiFetch } from './client';
import type { EstateBackupList, EstateBackupListFilters } from '../types';

/** Estate-wide paginated backup log (GET /backups). */
export function list(filters?: EstateBackupListFilters): Promise<EstateBackupList> {
  return apiFetch<EstateBackupList>('/backups', { query: filters });
}
