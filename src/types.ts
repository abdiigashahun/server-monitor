export type ServerType = 'Web' | 'Database' | 'File' | 'Application' | 'DNS' | 'Mail';
export type OS = 'Linux' | 'Windows';
export type CriticalityLevel = 'High' | 'Medium' | 'Low';
export type HealthStatus = 'Operational' | 'Warning' | 'Critical';
export type BackupStatus = 'Success' | 'Failed' | 'In Progress';
export type BackupType = 'Full' | 'Incremental' | 'Differential' | 'Snapshot';

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
  backupSchedule?: string;
  backupRetentionDays?: number;
  backupJobName?: string;
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

export type UserRole = 'Admin' | 'Operator' | 'User';

export interface RolePermissions {
  canAddServer: boolean;
  canEditServer: boolean;
  canDeleteServer: boolean;
  canAckAlerts: boolean;
  canResolveAlerts: boolean;
  canEditThresholds: boolean;
  canManageTokens: boolean;
  canTriggerFailover: boolean;
  canToggleDcMaintenance: boolean;
  canViewAuditLogs: boolean;
  canManageUsers: boolean;
  canExportReports: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  department: string;
  phone: string;
  avatarUrl: string;
  twoFactorEnabled: boolean;
  lastLogin: string;
  accountStatus?: 'Active' | 'Suspended';
  createdAt?: string;
  ipAddress?: string;
  permissions: RolePermissions;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string; // Plaintext demo password
  user: AuthUser;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  ipAddress: string;
  userAgent: string;
  loginTime: string;
  lastActive: string;
  currentPage: string;
  status: 'Active' | 'Idle' | 'Terminated';
}

export type AuditChangeType = 'PAGE_VISIT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'SECURITY' | 'ALERT_ACTION' | 'AUTH' | 'SYSTEM';

export interface AuditLog {
  id: string;
  user: string;
  role: UserRole | string;
  action: string;
  resource: string;
  ipAddress: string;
  timestamp: string;
  status: 'Success' | 'Denied' | 'Warning';
  details: string;
  changeType?: AuditChangeType;
  targetRoute?: string;
  previousState?: Record<string, any> | string;
  newState?: Record<string, any> | string;
  deviceInfo?: string;
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
  cpuUsageLimitPct: number;  // default 80%
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
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'System Administrator' | 'Auditor' | 'Read Only Operator';
  department: string;
  phone: string;
  avatarUrl: string;
  twoFactorEnabled: boolean;
  lastLogin: string;
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

export type DataCenterStatus = 'Healthy' | 'Warning' | 'Critical' | 'Maintenance';

export interface DataCenter {
  id: string; // e.g. 'DC-01'
  code: string; // e.g. 'ADD-01'
  name: string; // e.g. 'Addis Ababa Central DC'
  city: string; // e.g. 'Addis Ababa'
  region: string; // e.g. 'Central Hub'
  tier: 'Tier III' | 'Tier IV';
  status: DataCenterStatus;
  primaryRole: string; // e.g. 'Core Government Hub & Portal'
  serverCount: number;
  rackCount: number;
  totalCapacityKw: number;
  currentPowerUsageKw: number;
  pue: number; // Power Usage Effectiveness e.g. 1.22
  temperatureC: number; // e.g. 19.8
  humidityPct: number; // e.g. 46
  networkLatencyMs: number; // e.g. 1.8
  bandwidthGbps: number; // e.g. 100
  backupGeneratorStatus: 'Standby Ready' | 'Active Testing' | 'Maintenance';
  activeAlertsCount: number;
  coolingStatus: 'Optimal' | 'Degraded' | 'Normal';
  securityZone: 'Top Secret Level 4' | 'Restricted Level 3' | 'Standard Level 2';
  ipSubnet: string;
}

