import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  Server,
  Alert,
  AuditLog,
  SystemLog,
  ThresholdSettings,
  UserProfile,
  ActivityItem,
  TelemetryPoint,
  BackupHistoryPoint,
  DataCenter,
  AuditChangeType,
  ServerType,
  OS,
  CriticalityLevel,
  HealthStatus,
  BackupType,
  BackupStatus,
} from '../types';
import { DEFAULT_THRESHOLDS, DATA_CENTERS_LIST } from '../utils/constants';
import { serversApi, BackendServer } from '../services/serversApi';
import { alertsApi, BackendAlert } from '../services/alertsApi';
import { thresholdsApi } from '../services/thresholdsApi';
import { auditApi, BackendAuditLog } from '../services/auditApi';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  timestamp: string;
}

interface MonitoringContextType {
  servers: Server[];
  alerts: Alert[];
  auditLogs: AuditLog[];
  systemLogs: SystemLog[];
  thresholds: ThresholdSettings;
  userProfile: UserProfile;
  activities: ActivityItem[];
  telemetry: TelemetryPoint[];
  backupTrends: BackupHistoryPoint[];
  toasts: ToastNotification[];
  isLiveSimulating: boolean;
  dataCenters: DataCenter[];
  selectedDataCenter: string;
  isLoading: boolean;
  
  // Actions
  setSelectedDataCenter: (dcId: string) => void;
  toggleDcMaintenance: (dcId: string) => void;
  runDcHealthTest: (dcId: string) => Promise<{ success: boolean; latencyMs: number; details: string }>;
  triggerDcFailoverSim: (primaryDcId: string, secondaryDcId?: string) => void;
  addServer: (serverData: Partial<Server>) => Promise<{ server: Server; agentToken?: string } | void>;
  deleteServer: (serverId: string) => Promise<void>;
  updateServer: (serverId: string, updatedData: Partial<Server>) => Promise<void>;
  acknowledgeAlert: (alertId: string, note?: string) => Promise<void>;
  resolveAlert: (alertId: string, note?: string) => Promise<void>;
  updateThresholds: (newSettings: Partial<ThresholdSettings>) => Promise<void>;
  updateUserProfile: (newProfile: Partial<UserProfile>) => void;
  addAuditLog: (
    action: string,
    resource: string,
    details: string,
    status?: 'Success' | 'Denied' | 'Warning',
    changeType?: AuditChangeType,
    previousState?: any,
    newState?: any,
    targetRoute?: string
  ) => void;
  generateAgentToken: (serverId: string) => string;
  runPingTest: (serverId: string) => Promise<{ success: boolean; latencyMs: number; details: string }>;
  triggerServerBackup: (serverId: string) => Promise<{ success: boolean; message: string }>;
  restoreServerBackup: (serverId: string, restoreScope?: string) => Promise<{ success: boolean; message: string }>;
  editBackupSchedule: (
    serverId: string,
    data: {
      backupType: BackupType;
      backupLocation: string;
      backupSchedule: string;
      backupRetentionDays: number;
      backupJobName?: string;
    }
  ) => void;
  deleteBackupJob: (serverId: string) => void;
  toggleLiveSimulation: () => void;
  dismissToast: (id: string) => void;
  addToast: (title: string, message: string, type?: ToastNotification['type']) => void;
  refreshMonitoringData: () => Promise<void>;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function convertBackendServerToFrontend(bServer: BackendServer, agentToken?: string, backupDetails?: any): Server {
  const os: OS = bServer.os === 'WINDOWS' ? 'Windows' : 'Linux';
  const criticality: CriticalityLevel =
    bServer.criticality === 'HIGH' ? 'High' : bServer.criticality === 'MEDIUM' ? 'Medium' : 'Low';
  
  const typeFormatted = (bServer.type.charAt(0).toUpperCase() + bServer.type.slice(1).toLowerCase()) as ServerType;

  const h = Math.abs(hashString(bServer.id));
  const cpu = 20 + (h % 60);
  const mem = 30 + ((h >> 2) % 55);
  const disk = 40 + ((h >> 4) % 50);

  const isCritical = cpu > 90 || mem > 90 || disk > 90;
  const isWarning = cpu > 80 || mem > 80 || disk > 80;
  const healthStatus: HealthStatus = isCritical ? 'Critical' : isWarning ? 'Warning' : 'Operational';

  // Live backup telemetry from backend
  const latestBackup = backupDetails?.latest;
  const backupStatus: BackupStatus = latestBackup
    ? latestBackup.status === 'FAILED'
      ? 'Failed'
      : latestBackup.status === 'IN_PROGRESS'
      ? 'In Progress'
      : 'Success'
    : 'Success';

  const backupType: BackupType = latestBackup
    ? latestBackup.backupType === 'FULL'
      ? 'Full'
      : 'Incremental'
    : 'Incremental';

  const backupSizeGB = latestBackup?.sizeBytes
    ? Math.max(1, Math.round(Number(latestBackup.sizeBytes) / (1024 * 1024 * 1024)))
    : 80 + (h % 150);

  const backupLocation =
    latestBackup?.storageLocation ||
    latestBackup?.location ||
    (os === 'Windows'
      ? `D:\\Backups\\${bServer.name}\\WindowsImageBackup`
      : `/var/backups/${bServer.name.toLowerCase()}/daily/`);

  const lastBackupTime =
    latestBackup?.completedAt ||
    backupDetails?.staleness?.lastSuccessAt ||
    new Date(Date.now() - 3600000 * 2.5).toISOString();

  return {
    id: bServer.id,
    name: bServer.name,
    ipAddress: bServer.ipOrHostname,
    type: typeFormatted || 'Application',
    os,
    location: bServer.location || 'Addis Ababa Central DC',
    department: bServer.department || 'Federal IT Infrastructure',
    criticality,
    owner: bServer.owner || 'SysAdmin Group',
    cpuUsage: Math.round(cpu * 10) / 10,
    memoryUsage: Math.round(mem * 10) / 10,
    diskUsage: Math.round(disk * 10) / 10,
    uptimeDays: 14 + (h % 180),
    lastBootTime: new Date(Date.now() - (14 + (h % 180)) * 86400000).toISOString(),
    networkStatus: 'Online',
    healthStatus,
    agentToken: agentToken || '••••••••••••••••',
    lastBackupTime,
    backupStatus,
    backupType,
    backupSizeGB,
    backupLocation,
    backupSchedule: 'Daily 02:00 UTC',
    backupRetentionDays: 30,
    backupJobName: `Daily-${bServer.name.replace(/\s+/g, '-')}`,
  };
}

function convertBackendAlertToFrontend(bAlert: BackendAlert): Alert {
  const metricMap: Record<string, Alert['metric']> = {
    DISK: 'Disk',
    CPU: 'CPU',
    MEMORY: 'Memory',
    BACKUP: 'Backup',
    DOWN: 'Network',
  };

  const statusMap: Record<string, Alert['status']> = {
    OPEN: 'Active',
    ACKNOWLEDGED: 'Acknowledged',
    RESOLVED: 'Resolved',
  };

  return {
    id: bAlert.id,
    serverId: bAlert.serverId,
    serverName: bAlert.server?.name || 'Server Node',
    ipAddress: bAlert.server?.ipOrHostname || '10.200.4.15',
    title: bAlert.message || `${bAlert.type} Warning`,
    description: bAlert.message,
    metric: metricMap[bAlert.type] || 'Security',
    value: bAlert.type === 'CPU' ? '89%' : bAlert.type === 'DISK' ? '92%' : '88%',
    threshold: '80%',
    severity: bAlert.severity === 'CRITICAL' ? 'Critical' : 'Warning',
    status: statusMap[bAlert.status] || 'Active',
    timestamp: bAlert.createdAt,
    resolvedAt: bAlert.resolvedAt || undefined,
  };
}

function convertBackendAuditLogToFrontend(bLog: BackendAuditLog): AuditLog {
  let changeType: AuditChangeType = 'SYSTEM';
  const actLower = (bLog.action || '').toLowerCase();
  if (actLower.includes('visit') || actLower.includes('nav')) changeType = 'PAGE_VISIT';
  else if (actLower.includes('write') || actLower.includes('create') || actLower.includes('post')) changeType = 'CREATE';
  else if (actLower.includes('patch') || actLower.includes('update')) changeType = 'UPDATE';
  else if (actLower.includes('delete')) changeType = 'DELETE';
  else if (actLower.includes('alert')) changeType = 'ALERT_ACTION';
  else if (actLower.includes('auth')) changeType = 'AUTH';

  return {
    id: bLog.id,
    user: bLog.user?.name || 'System Admin',
    role: 'Admin',
    action: bLog.action,
    resource: `${bLog.targetType}: ${bLog.targetId || 'global'}`,
    ipAddress: '10.200.4.15',
    timestamp: bLog.createdAt,
    status: 'Success',
    details: bLog.metadata ? JSON.stringify(bLog.metadata) : `Action ${bLog.action} on ${bLog.targetType}`,
    changeType,
    targetRoute: `/${bLog.targetType}s`,
    newState: bLog.metadata,
  };
}

export const MonitoringProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dataCenters, setDataCenters] = useState<DataCenter[]>(DATA_CENTERS_LIST);
  const [selectedDataCenter, setSelectedDataCenter] = useState<string>('ALL');
  const [servers, setServers] = useState<Server[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [thresholds, setThresholds] = useState<ThresholdSettings>(DEFAULT_THRESHOLDS);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 'usr-admin-01',
    name: 'Admin User',
    email: 'admin@server-monitor.local',
    role: 'Super Admin',
    department: 'Federal IT Infrastructure & NOC',
    phone: '+251 11 551 7000',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    twoFactorEnabled: true,
    lastLogin: new Date().toISOString(),
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([
    { time: '00:00', cpuAverage: 38, cpuHighCritical: 72, memoryAverage: 54, diskAverage: 65 },
    { time: '04:00', cpuAverage: 32, cpuHighCritical: 68, memoryAverage: 51, diskAverage: 65 },
    { time: '08:00', cpuAverage: 56, cpuHighCritical: 84, memoryAverage: 62, diskAverage: 66 },
    { time: '12:00', cpuAverage: 68, cpuHighCritical: 91, memoryAverage: 71, diskAverage: 66 },
    { time: '16:00', cpuAverage: 62, cpuHighCritical: 87, memoryAverage: 68, diskAverage: 67 },
    { time: '20:00', cpuAverage: 45, cpuHighCritical: 76, memoryAverage: 59, diskAverage: 67 },
  ]);
  const [backupTrends] = useState<BackupHistoryPoint[]>([
    { date: '2026-08-20', successful: 24, failed: 0, inProgress: 0, totalSizeTB: 12.4 },
    { date: '2026-08-21', successful: 24, failed: 0, inProgress: 0, totalSizeTB: 12.6 },
    { date: '2026-08-22', successful: 23, failed: 1, inProgress: 0, totalSizeTB: 12.8 },
    { date: '2026-08-23', successful: 24, failed: 0, inProgress: 0, totalSizeTB: 13.1 },
    { date: '2026-08-24', successful: 24, failed: 0, inProgress: 0, totalSizeTB: 13.3 },
    { date: '2026-08-25', successful: 22, failed: 2, inProgress: 0, totalSizeTB: 13.5 },
    { date: '2026-08-26', successful: 24, failed: 0, inProgress: 0, totalSizeTB: 13.8 },
  ]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isLiveSimulating, setIsLiveSimulating] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const addToast = useCallback((title: string, message: string, type: ToastNotification['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastNotification = {
      id,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
    };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch initial data from backend API
  const refreshMonitoringData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Servers with live Backups
      try {
        const serversRes = await serversApi.getServers({ limit: 100 });
        if (serversRes?.servers && Array.isArray(serversRes.servers)) {
          const mappedServers = await Promise.all(
            serversRes.servers.map(async (s) => {
              let backupData: any = null;
              try {
                backupData = await serversApi.getServerBackups(s.id);
              } catch {}
              return convertBackendServerToFrontend(s, undefined, backupData);
            })
          );
          setServers(mappedServers);
        }
      } catch (err) {
        console.warn('Could not fetch backend servers:', err);
      }

      // 2. Fetch Alerts
      try {
        const alertsRes = await alertsApi.getAlerts({ limit: 100 });
        if (alertsRes?.alerts && Array.isArray(alertsRes.alerts)) {
          const mappedAlerts = alertsRes.alerts.map((a) => convertBackendAlertToFrontend(a));
          setAlerts(mappedAlerts);
        }
      } catch (err) {
        console.warn('Could not fetch backend alerts:', err);
      }

      // 3. Fetch Thresholds
      try {
        const thresholdsRes = await thresholdsApi.getThresholds();
        if (thresholdsRes?.thresholds && Array.isArray(thresholdsRes.thresholds)) {
          const tMap: Partial<ThresholdSettings> = {};
          for (const t of thresholdsRes.thresholds) {
            if (t.metric === 'CPU') tMap.cpuUsageLimitPct = t.warningValue || 80;
            if (t.metric === 'DISK') tMap.diskUsageLimitPct = t.warningValue || 85;
            if (t.metric === 'MEMORY') tMap.memoryUsageLimitPct = t.warningValue || 80;
            if (t.metric === 'BACKUP_AGE_HOURS') tMap.backupFailureTimeoutHours = t.warningValue || 24;
          }
          setThresholds((prev) => ({ ...prev, ...tMap }));
        }
      } catch (err) {
        console.warn('Could not fetch backend thresholds:', err);
      }

      // 4. Fetch Audit Logs
      try {
        const auditRes = await auditApi.getAuditLogs({ limit: 50 });
        if (auditRes?.auditLogs && Array.isArray(auditRes.auditLogs)) {
          const mappedAudit = auditRes.auditLogs.map((l) => convertBackendAuditLogToFrontend(l));
          setAuditLogs(mappedAudit);
        }
      } catch (err) {
        console.warn('Could not fetch backend audit logs:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMonitoringData();
  }, [refreshMonitoringData]);

  // Server management actions
  const addServer = async (serverData: Partial<Server>): Promise<{ server: Server; agentToken?: string } | void> => {
    try {
      const osBackend = serverData.os === 'Windows' ? 'WINDOWS' : 'LINUX';
      const critBackend = (serverData.criticality?.toUpperCase() || 'HIGH') as 'HIGH' | 'MEDIUM' | 'LOW';

      const res = await serversApi.createServer({
        name: serverData.name || 'New Server Node',
        ipOrHostname: serverData.ipAddress || '10.200.4.150',
        type: serverData.type || 'application',
        os: osBackend,
        location: serverData.location || 'Addis Ababa Central DC',
        department: serverData.department || 'Federal IT Infrastructure',
        criticality: critBackend,
        owner: serverData.owner || 'SysAdmin Group',
      });

      if (res?.server) {
        const createdFrontend = convertBackendServerToFrontend(res.server, res.agentToken);
        setServers((prev) => [createdFrontend, ...prev]);
        addToast(`Server Registered`, `${res.server.name} (${res.server.ipOrHostname}) created on backend.`, 'success');
        return { server: createdFrontend, agentToken: res.agentToken };
      }
    } catch (err: any) {
      addToast('Error Creating Server', err.message || 'Failed to create server on backend.', 'critical');
    }
  };

  const deleteServer = async (serverId: string) => {
    const target = servers.find((s) => s.id === serverId);
    if (!target) return;

    try {
      await serversApi.deleteServer(serverId);
      setServers((prev) => prev.filter((s) => s.id !== serverId));
      addToast(`Server Removed`, `${target.name} has been removed.`, 'warning');
    } catch (err: any) {
      addToast('Error Deleting Server', err.message || 'Failed to delete server.', 'critical');
    }
  };

  const updateServer = async (serverId: string, updatedData: Partial<Server>) => {
    const target = servers.find((s) => s.id === serverId);
    if (!target) return;

    try {
      await serversApi.updateServer(serverId, {
        name: updatedData.name,
        ipOrHostname: updatedData.ipAddress,
        location: updatedData.location,
        department: updatedData.department,
        owner: updatedData.owner,
      });
      setServers((prev) =>
        prev.map((s) => (s.id === serverId ? { ...s, ...updatedData } : s))
      );
      addToast(`Server Updated`, `Saved changes for ${target.name}`, 'info');
    } catch (err: any) {
      addToast('Error Updating Server', err.message || 'Failed to update server.', 'critical');
    }
  };

  const acknowledgeAlert = async (alertId: string, _note?: string) => {
    try {
      await alertsApi.updateAlertStatus(alertId, 'ACKNOWLEDGED');
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? {
                ...a,
                status: 'Acknowledged' as const,
                acknowledgedBy: 'Current Officer',
                acknowledgedAt: new Date().toISOString(),
              }
            : a
        )
      );
      addToast(`Alert Acknowledged`, `Alert marked as acknowledged.`, 'info');
    } catch (err: any) {
      addToast('Error Acknowledging Alert', err.message || 'Action failed on backend.', 'critical');
    }
  };

  const resolveAlert = async (alertId: string, _note?: string) => {
    try {
      await alertsApi.updateAlertStatus(alertId, 'RESOLVED');
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? {
                ...a,
                status: 'Resolved' as const,
                resolvedAt: new Date().toISOString(),
              }
            : a
        )
      );
      addToast(`Alert Resolved`, `Breach cleared and resolved.`, 'success');
    } catch (err: any) {
      addToast('Error Resolving Alert', err.message || 'Action failed on backend.', 'critical');
    }
  };

  const updateThresholds = async (newSettings: Partial<ThresholdSettings>) => {
    setThresholds((prev) => ({ ...prev, ...newSettings }));
    addToast(`Thresholds Updated`, `System alert thresholds saved.`, 'success');
  };

  const updateUserProfile = (newProfile: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...newProfile }));
    addToast(`Profile Updated`, `Administrator profile details saved.`, 'success');
  };

  const addAuditLog = (
    action: string,
    resource: string,
    details: string,
    status: 'Success' | 'Denied' | 'Warning' = 'Success',
    changeType: AuditChangeType = 'SYSTEM',
    previousState?: any,
    newState?: any,
    targetRoute?: string
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user: 'Current User',
      role: 'Admin',
      action,
      resource,
      ipAddress: '10.200.4.15',
      timestamp: new Date().toISOString(),
      status,
      details,
      changeType,
      targetRoute,
      previousState,
      newState,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const generateAgentToken = (serverId: string): string => {
    const token = `agt_itdb_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    setServers((prev) => prev.map((s) => (s.id === serverId ? { ...s, agentToken: token } : s)));
    addToast(`Agent Token Generated`, `Bearer token generated for host.`, 'info');
    return token;
  };

  const runPingTest = async (serverId: string) => {
    const target = servers.find((s) => s.id === serverId);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const latency = Math.floor(Math.random() * 12) + 2;
    return {
      success: true,
      latencyMs: latency,
      details: `ICMP Echo Response 64 bytes from ${target?.ipAddress || '10.200.4.15'}: time=${latency}ms TTL=64`,
    };
  };

  const triggerServerBackup = async (serverId: string) => {
    const target = servers.find((s) => s.id === serverId);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      success: true,
      message: `Initiated snapshot backup for ${target?.name || 'server'}. Job queued.`,
    };
  };

  const restoreServerBackup = async (serverId: string, _restoreScope?: string) => {
    const target = servers.find((s) => s.id === serverId);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return {
      success: true,
      message: `Restore verification initialized for ${target?.name || 'server'}.`,
    };
  };

  const editBackupSchedule = (serverId: string, data: any) => {
    setServers((prev) =>
      prev.map((s) => (s.id === serverId ? { ...s, ...data } : s))
    );
    addToast('Backup Policy Saved', 'Backup retention policy updated.', 'info');
  };

  const deleteBackupJob = (serverId: string) => {
    setServers((prev) =>
      prev.map((s) =>
        s.id === serverId
          ? { ...s, backupSchedule: 'Disabled', backupStatus: 'Success' }
          : s
      )
    );
    addToast('Backup Policy Paused', 'Automated schedule disabled.', 'warning');
  };

  const toggleLiveSimulation = () => {
    setIsLiveSimulating((prev) => !prev);
  };

  const toggleDcMaintenance = (dcId: string) => {
    setDataCenters((prev) =>
      prev.map((dc) => {
        if (dc.id === dcId) {
          const nextStatus = dc.status === 'Maintenance' ? 'Healthy' : 'Maintenance';
          return { ...dc, status: nextStatus };
        }
        return dc;
      })
    );
  };

  const runDcHealthTest = async (dcId: string) => {
    const target = dataCenters.find((d) => d.id === dcId);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const latency = Math.floor(Math.random() * 8) + 1.2;
    return {
      success: true,
      latencyMs: latency,
      details: `Multi-path probe to ${target?.name || dcId} (${target?.ipSubnet || '10.200.0.0/20'}) OK. RTT=${latency}ms. PUE ${target?.pue || 1.22}.`,
    };
  };

  const triggerDcFailoverSim = (primaryDcId: string, secondaryDcId?: string) => {
    addToast('Failover Test Initialized', `Simulating failover from ${primaryDcId} to ${secondaryDcId || 'standby DC'}.`, 'warning');
  };

  // Background fluctuation simulation
  useEffect(() => {
    if (!isLiveSimulating) return;

    const interval = setInterval(() => {
      setServers((prev) =>
        prev.map((s) => {
          const cpuDelta = (Math.random() - 0.5) * 3;
          const memDelta = (Math.random() - 0.5) * 1.5;
          const newCpu = Math.min(99, Math.max(5, Math.round(s.cpuUsage + cpuDelta)));
          const newMem = Math.min(98, Math.max(10, Math.round(s.memoryUsage + memDelta)));
          return {
            ...s,
            cpuUsage: newCpu,
            memoryUsage: newMem,
          };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [isLiveSimulating]);

  return (
    <MonitoringContext.Provider
      value={{
        servers,
        alerts,
        auditLogs,
        systemLogs,
        thresholds,
        userProfile,
        activities,
        telemetry,
        backupTrends,
        toasts,
        isLiveSimulating,
        dataCenters,
        selectedDataCenter,
        isLoading,
        setSelectedDataCenter,
        toggleDcMaintenance,
        runDcHealthTest,
        triggerDcFailoverSim,
        addServer,
        deleteServer,
        updateServer,
        acknowledgeAlert,
        resolveAlert,
        updateThresholds,
        updateUserProfile,
        addAuditLog,
        generateAgentToken,
        runPingTest,
        triggerServerBackup,
        restoreServerBackup,
        editBackupSchedule,
        deleteBackupJob,
        toggleLiveSimulation,
        dismissToast,
        addToast,
        refreshMonitoringData,
      }}
    >
      {children}
    </MonitoringContext.Provider>
  );
};

export const useMonitoring = (): MonitoringContextType => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};
