// Types mirroring the Server-Monitor backend contract (see FRONTEND_INTEGRATION_GUIDE.md
// and the live Swagger at https://server-monitor-skil.onrender.com/api-docs.json).
// The backend is the source of truth; these shapes match it exactly.

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------
export type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export type PermissionKey =
  | 'servers:read'
  | 'servers:write'
  | 'users:read'
  | 'users:write'
  | 'thresholds:read'
  | 'thresholds:write'
  | 'alerts:read'
  | 'alerts:write'
  | 'reports:read'
  | 'audit:read';

// Permissions arrive as a string -> boolean map. Missing keys are treated as false.
export type Permissions = Partial<Record<PermissionKey, boolean>> & Record<string, boolean>;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permissions;
  createdAt?: string;
}

// Login / refresh payload (the `data` object of the envelope)
export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ---------------------------------------------------------------------------
// Servers
// ---------------------------------------------------------------------------
export type ServerOS = 'LINUX' | 'WINDOWS';
export type Criticality = 'HIGH' | 'MEDIUM' | 'LOW';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'NOT_REQUIRED';
export type Range = '7d' | '30d';

export interface ServerParentRef {
  id: string;
  name: string;
  ipOrHostname: string;
  type: string;
  criticality: Criticality;
  verificationStatus: VerificationStatus;
}

export interface Server {
  id: string;
  name: string;
  ipOrHostname: string;
  type: string;
  os: ServerOS;
  location: string;
  department: string;
  criticality: Criticality;
  owner: string;
  parentServerId: string | null;
  expectsAgent: boolean;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  isGroup: boolean;
  childCount: number;
  verifiedChildCount?: number;
  parent?: ServerParentRef | null;
  children?: Server[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateServerInput {
  name: string;
  ipOrHostname: string;
  type: string;
  os: ServerOS;
  location: string;
  department: string;
  criticality: Criticality;
  owner: string;
  parentServerId?: string | null;
  expectsAgent?: boolean;
}

export type UpdateServerInput = Partial<CreateServerInput>;

export interface ServerListFilters {
  name?: string;
  location?: string;
  department?: string;
  criticality?: Criticality;
  os?: ServerOS;
  parentServerId?: string;
  rootsOnly?: boolean;
  verificationStatus?: VerificationStatus;
  expectsAgent?: boolean;
}

// ---------------------------------------------------------------------------
// Server health & backups (from /servers/{id}/health and /backups)
// ---------------------------------------------------------------------------
export type NetworkStatus = 'UP' | 'DOWN' | 'DEGRADED';

export interface HealthLog {
  id: string;
  serverId: string;
  ipOrHostname: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptimeSeconds: number;
  lastBootAt: string;
  networkStatus: NetworkStatus;
  recordedAt: string;
}

export interface GroupMetricSummary {
  avg: number | null;
  min: number | null;
  max: number | null;
}

export interface HealthGroupSummary {
  childCount: number;
  reportingChildCount: number;
  openAlertCount: number;
  cpu: GroupMetricSummary;
  memory: GroupMetricSummary;
  disk: GroupMetricSummary;
  networkDownCount: number;
}

export interface GroupHistoryPoint {
  bucketStart: string;
  sampleCount: number;
  cpuUsage: number | null;
  memoryUsage: number | null;
  diskUsage: number | null;
}

export interface HealthChild {
  serverId: string;
  name: string;
  ipOrHostname: string;
  criticality: Criticality;
  department: string;
  latest: HealthLog | null;
}

export interface ServerHealth {
  serverId: string;
  ipOrHostname: string;
  range: Range;
  isGroup: boolean;
  parentServerId: string | null;
  latest: HealthLog | null;
  history: HealthLog[]; // this server's own samples, oldest first
  groupSummary: HealthGroupSummary | null;
  children: HealthChild[];
  groupHistory: GroupHistoryPoint[]; // hourly averages
}

export type BackupStatus = 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
export type BackupType = 'FULL' | 'INCREMENTAL';

export interface BackupLog {
  id: string;
  serverId: string;
  status: BackupStatus;
  backupType: BackupType;
  location: string;
  sizeBytes: string; // serialized BigInt as a decimal string
  startedAt: string;
  completedAt: string | null;
}

export interface BackupStaleness {
  lastSuccessAt: string | null;
  ageSeconds: number | null;
  staleAfterHours: number;
  isStale: boolean;
}

export interface BackupChild {
  serverId: string;
  name: string;
  ipOrHostname: string;
  department: string;
  latest: BackupLog | null;
  staleness: BackupStaleness;
}

export interface ServerBackups {
  serverId: string;
  ipOrHostname: string;
  range: Range;
  isGroup: boolean;
  parentServerId: string | null;
  latest: BackupLog | null;
  history: BackupLog[];
  staleness: BackupStaleness;
  groupSummary: { childCount: number; staleChildCount: number } | null;
  children: BackupChild[];
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------
export type AlertType = 'DISK' | 'CPU' | 'MEMORY' | 'BACKUP' | 'DOWN';
export type AlertSeverity = 'WARNING' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface AlertServerRef {
  id: string;
  name: string;
  ipOrHostname: string;
  department: string;
  criticality: Criticality;
}

export interface Alert {
  id: string;
  serverId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  createdAt: string;
  resolvedAt: string | null;
  thresholdId: string | null;
  server: AlertServerRef | null;
}

export interface AlertListFilters {
  serverId?: string;
  status?: AlertStatus;
  severity?: AlertSeverity;
  type?: AlertType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------
export type ThresholdMetric = 'DISK' | 'CPU' | 'MEMORY' | 'BACKUP_AGE_HOURS';
export type ThresholdScope = 'GLOBAL' | 'SERVER';

export interface ThresholdServerRef {
  id: string;
  name: string;
  ipOrHostname: string;
  department: string;
}

export interface Threshold {
  id: string;
  metric: ThresholdMetric;
  warningValue: number;
  criticalValue: number;
  scope: ThresholdScope;
  serverId: string | null;
  server: ThresholdServerRef | null;
}

export interface CreateThresholdInput {
  metric: ThresholdMetric;
  warningValue: number;
  criticalValue: number;
  scope: ThresholdScope;
  serverId?: string;
}

export interface UpdateThresholdInput {
  warningValue?: number;
  criticalValue?: number;
}

// ---------------------------------------------------------------------------
// Users (ADMIN)
// ---------------------------------------------------------------------------
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permissions;
  createdAt?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}

// ---------------------------------------------------------------------------
// Audit logs (ADMIN)
// ---------------------------------------------------------------------------
export interface AuditUserRef {
  id: string;
  name: string;
  email: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: AuditUserRef | null;
}

export interface AuditListFilters {
  userId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export type ReportRange = 'daily' | 'weekly' | 'monthly';
export type ReportFormat = 'pdf' | 'excel';
export type ReportKind = 'health' | 'backups';

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
