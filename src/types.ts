export type ServerType = 'Web' | 'Database' | 'File' | 'Application' | 'DNS' | 'Mail';
export type OS = 'Linux' | 'Windows';
export type CriticalityLevel = 'High' | 'Medium' | 'Low';
export type HealthStatus = 'Operational' | 'Warning' | 'Critical';
export type BackupStatus = 'Success' | 'Failed' | 'In Progress';
export type BackupType = 'Full' | 'Incremental';

export type UserRole = 'Admin' | 'Operator' | 'Viewer' | 'Guest';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  Admin: ['dashboard', 'inventory', 'backup', 'alerts-logs', 'reports', 'audit', 'settings'],
  Operator: ['dashboard', 'inventory', 'backup', 'alerts-logs', 'reports'],
  Viewer: ['dashboard', 'inventory', 'backup', 'reports'],
  Guest: [],
};

export interface Server {
  id: string;
  name: string;
  ipAddress: string;
  type: ServerType;
  os: OS;
  location: string;
  department: string;
  criticality: CriticalityLevel;
  owner: string;
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  diskUsage: number; // percentage
  uptimeDays: number;
  lastBootTime: string;
  networkStatus: 'Online' | 'Degraded' | 'Offline';
  healthStatus: HealthStatus;
  agentToken: string;
  lastBackupTime: string;
  backupStatus: BackupStatus;
  backupType: BackupType;
  backupSizeGB: number;
  backupLocation: string;
}

export type AlertSeverity = 'Critical' | 'Warning' | 'Info';
export type AlertStatus = 'Active' | 'Acknowledged' | 'Resolved';

export interface Alert {
  id: string;
  serverId: string;
  serverName: string;
  ipAddress: string;
  title: string;
  description: string;
  metric: 'Disk' | 'CPU' | 'Memory' | 'Backup' | 'Network' | 'Security';
  value: string;
  threshold: string;
  severity: AlertSeverity;
  status: AlertStatus;
  timestamp: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  user: string;
  role: string;
  action: string;
  resource: string;
  ipAddress: string;
  timestamp: string;
  status: 'Success' | 'Denied' | 'Warning';
  details: string;
}

export interface SystemLog {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  component: 'AgentCollector' | 'BackupEngine' | 'AlertManager' | 'AuthService' | 'PortalAPI';
  serverId?: string;
  serverName?: string;
  message: string;
  timestamp: string;
}

export interface ThresholdSettings {
  diskUsageLimitPct: number; // default 85%
  cpuUsageLimitPct: number; // default 80%
  memoryUsageLimitPct: number; // default 85%
  backupFailureTimeoutHours: number; // default 24h
  emailAlertsEnabled: boolean;
  slackAlertsEnabled: boolean;
  smsAlertsEnabled: boolean;
  alertRecipientEmails: string[];
  pingIntervalSeconds: number;
  ipRestrictionEnabled: boolean;
  allowedSubnet: string;
}

export interface UserProfile {
  id?: string;
  username: string;
  name?: string;
  email: string;
  role: UserRole;
  department?: string;
  phone?: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
  lastLogin?: string;
}

export interface ActivityItem {
  id: string;
  type: 'ALERT' | 'BACKUP' | 'SERVER' | 'USER' | 'SYSTEM';
  title: string;
  description: string;
  timestamp: string;
  severity?: AlertSeverity;
  serverName?: string;
}

export interface TelemetryPoint {
  time: string;
  cpuAverage: number;
  cpuHighCritical: number;
  memoryAverage: number;
  diskAverage: number;
}

export interface BackupHistoryPoint {
  date: string;
  successful: number;
  failed: number;
  inProgress: number;
  totalSizeTB: number;
}