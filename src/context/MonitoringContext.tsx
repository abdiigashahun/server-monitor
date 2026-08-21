import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
} from '../types';
import {
  INITIAL_SERVERS,
  INITIAL_ALERTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SYSTEM_LOGS,
  INITIAL_THRESHOLDS,
  INITIAL_USER_PROFILE,
  INITIAL_ACTIVITIES,
  TELEMETRY_DATA,
  BACKUP_TRENDS,
  INITIAL_DATA_CENTERS,
} from '../utils/mockData';

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
  
  // Actions
  setSelectedDataCenter: (dcId: string) => void;
  toggleDcMaintenance: (dcId: string) => void;
  runDcHealthTest: (dcId: string) => Promise<{ success: boolean; latencyMs: number; details: string }>;
  triggerDcFailoverSim: (primaryDcId: string, secondaryDcId?: string) => void;
  addServer: (serverData: Partial<Server>) => void;
  deleteServer: (serverId: string) => void;
  updateServer: (serverId: string, updatedData: Partial<Server>) => void;
  acknowledgeAlert: (alertId: string, note?: string) => void;
  resolveAlert: (alertId: string, note?: string) => void;
  updateThresholds: (newSettings: Partial<ThresholdSettings>) => void;
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
  toggleLiveSimulation: () => void;
  dismissToast: (id: string) => void;
  addToast: (title: string, message: string, type?: ToastNotification['type']) => void;
  triggerMockAlert: () => void;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export const MonitoringProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dataCenters, setDataCenters] = useState<DataCenter[]>(INITIAL_DATA_CENTERS);
  const [selectedDataCenter, setSelectedDataCenter] = useState<string>('ALL');
  const [servers, setServers] = useState<Server[]>(INITIAL_SERVERS);
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>(INITIAL_SYSTEM_LOGS);
  const [thresholds, setThresholds] = useState<ThresholdSettings>(INITIAL_THRESHOLDS);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [activities, setActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>(TELEMETRY_DATA);
  const [backupTrends] = useState<BackupHistoryPoint[]>(BACKUP_TRENDS);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isLiveSimulating, setIsLiveSimulating] = useState<boolean>(true);

  // Add toast notification helper
  const addToast = (title: string, message: string, type: ToastNotification['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastNotification = {
      id,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
    };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Add audit log helper with full mutation diff capture
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
      id: `aud-${Date.now()}`,
      user: userProfile.name,
      role: userProfile.role,
      action,
      resource,
      ipAddress: '10.200.4.15',
      timestamp: new Date().toISOString(),
      status,
      details,
      changeType,
      previousState,
      newState,
      targetRoute: targetRoute || (window.location.hash || '#/dashboard'),
      deviceInfo: 'Chrome 126 / Windows 11',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Acknowledge Alert
  const acknowledgeAlert = (alertId: string, note?: string) => {
    const targetAlert = alerts.find((a) => a.id === alertId);
    if (!targetAlert) return;

    const now = new Date().toISOString();

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'Acknowledged',
              acknowledgedBy: userProfile.name,
              acknowledgedAt: now,
            }
          : a
      )
    );

    addAuditLog(
      'Acknowledge Alert',
      `Alert #${alertId} (${targetAlert.serverName})`,
      note ? `Acknowledged with note: ${note}` : `Acknowledged alert on ${targetAlert.serverName}`,
      'Success',
      'ALERT_ACTION',
      { status: targetAlert.status, acknowledgedBy: targetAlert.acknowledgedBy || null },
      { status: 'Acknowledged', acknowledgedBy: userProfile.name, note: note || '' },
      '#/alerts-logs'
    );

    addToast(
      'Alert Acknowledged',
      `Alert on ${targetAlert.serverName} acknowledged by ${userProfile.name}.`,
      'info'
    );
  };

  // Resolve Alert
  const resolveAlert = (alertId: string, note?: string) => {
    const targetAlert = alerts.find((a) => a.id === alertId);
    if (!targetAlert) return;

    const now = new Date().toISOString();

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'Resolved',
              resolvedAt: now,
            }
          : a
      )
    );

    // Update server health status if no critical alerts remain for this server
    const remainingCritical = alerts.filter(
      (a) => a.serverId === targetAlert.serverId && a.id !== alertId && a.severity === 'Critical' && a.status !== 'Resolved'
    );
    if (remainingCritical.length === 0) {
      setServers((prev) =>
        prev.map((s) => (s.id === targetAlert.serverId ? { ...s, healthStatus: 'Operational' } : s))
      );
    }

    addAuditLog(
      'Resolve Alert',
      `Alert #${alertId} (${targetAlert.serverName})`,
      note ? `Resolved with note: ${note}` : `Marked alert as resolved`,
      'Success',
      'ALERT_ACTION',
      { status: targetAlert.status },
      { status: 'Resolved', resolvedAt: now, note: note || '' },
      '#/alerts-logs'
    );

    addToast(
      'Alert Resolved',
      `Alert #${alertId} on ${targetAlert.serverName} was marked as resolved.`,
      'success'
    );
  };

  // Update Thresholds
  const updateThresholds = (newSettings: Partial<ThresholdSettings>) => {
    const oldThresholds = { ...thresholds };
    setThresholds((prev) => ({ ...prev, ...newSettings }));

    addAuditLog(
      'Update Threshold Settings',
      'Global Alert & Notification Thresholds',
      `Updated warning thresholds: Disk ${newSettings.diskUsageLimitPct ?? thresholds.diskUsageLimitPct}%, CPU ${newSettings.cpuUsageLimitPct ?? thresholds.cpuUsageLimitPct}%`,
      'Success',
      'UPDATE',
      oldThresholds,
      { ...oldThresholds, ...newSettings },
      '#/settings'
    );

    addToast(
      'Settings Saved',
      'System warning thresholds and alert notifications updated successfully.',
      'success'
    );
  };

  // Update User Profile
  const updateUserProfile = (newProfile: Partial<UserProfile>) => {
    const oldProfile = { ...userProfile };
    setUserProfile((prev) => ({ ...prev, ...newProfile }));

    addAuditLog(
      'Update User Profile',
      `User Profile (${newProfile.name || userProfile.name})`,
      'Updated user profile settings and notification preferences.',
      'Success',
      'UPDATE',
      oldProfile,
      { ...oldProfile, ...newProfile },
      '#/settings'
    );

    addToast(
      'Profile Updated',
      'Your profile information has been saved.',
      'success'
    );
  };

  // Generate Agent Token
  const generateAgentToken = (serverId: string): string => {
    const server = servers.find((s) => s.id === serverId);
    const newToken = `agt_tok_${Math.random().toString(36).substring(2, 14)}`;

    if (server) {
      const oldToken = server.agentToken;
      setServers((prev) =>
        prev.map((s) => (s.id === serverId ? { ...s, agentToken: newToken } : s))
      );

      addAuditLog(
        'Generate Agent Token',
        `Server ${server.name} (${server.ipAddress})`,
        `Generated new Bearer token for server agent authentication.`,
        'Success',
        'SECURITY',
        { agentToken: oldToken },
        { agentToken: newToken },
        '#/settings'
      );

      addToast(
        'Agent Token Regenerated',
        `New agent token generated for ${server.name}.`,
        'success'
      );
    }

    return newToken;
  };

  // Run Ping Test
  const runPingTest = async (serverId: string) => {
    const server = servers.find((s) => s.id === serverId);
    if (!server) {
      return { success: false, latencyMs: 0, details: 'Server not found' };
    }

    // Simulate ping latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    const isSuccess = server.networkStatus !== 'Offline';
    const latencyMs = isSuccess ? Math.floor(Math.random() * 12) + 1 : 0;

    addAuditLog(
      'Execute Ping Test',
      `Server ${server.name} (${server.ipAddress})`,
      isSuccess
        ? `Ping success: 4/4 packets received, latency ${latencyMs}ms`
        : `Ping failed: Destination host unreachable`
    );

    addToast(
      `Ping Test: ${server.name}`,
      isSuccess
        ? `4/4 ICMP Echo replies received (${latencyMs}ms latency).`
        : `Failed to reach host at ${server.ipAddress}.`,
      isSuccess ? 'success' : 'critical'
    );

    return {
      success: isSuccess,
      latencyMs,
      details: isSuccess
        ? `PING ${server.ipAddress}: 56 data bytes. 64 bytes from ${server.ipAddress}: icmp_seq=1 ttl=64 time=${latencyMs}.2 ms.`
        : `PING ${server.ipAddress}: Destination host unreachable. 100% packet loss.`,
    };
  };

  const toggleLiveSimulation = () => {
    setIsLiveSimulating((prev) => !prev);
    addToast(
      'Real-time Simulation',
      !isLiveSimulating ? 'Live metric feeds & heartbeat stream activated.' : 'Live simulation paused.',
      'info'
    );
  };

  const addServer = (serverData: Partial<Server>) => {
    const id = `srv-${Date.now()}`;
    const token = `agt_token_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
    const newServer: Server = {
      id,
      name: serverData.name || 'New Government Server',
      ipAddress: serverData.ipAddress || '10.200.0.1',
      type: serverData.type || 'Application',
      os: serverData.os || 'Linux',
      location: serverData.location || 'Central DC - Room 102',
      department: serverData.department || 'ITDB Central',
      criticality: serverData.criticality || 'Medium',
      owner: serverData.owner || 'SysAdmin',
      cpuUsage: Math.floor(Math.random() * 30) + 15,
      memoryUsage: Math.floor(Math.random() * 40) + 25,
      diskUsage: Math.floor(Math.random() * 50) + 30,
      uptimeDays: 1,
      lastBootTime: new Date().toISOString(),
      networkStatus: 'Online',
      healthStatus: 'Operational',
      agentToken: token,
      lastBackupTime: new Date().toISOString(),
      backupStatus: 'Success',
      backupType: 'Incremental',
      backupSizeGB: Math.floor(Math.random() * 200) + 50,
      backupLocation: 'Gov Cloud S3 / Hot Storage',
      ...serverData,
    };

    setServers((prev) => [newServer, ...prev]);

    addAuditLog(
      'Add Server',
      `Server ${newServer.name} (${newServer.ipAddress})`,
      `Registered new ${newServer.os} server for ${newServer.department}`,
      'Success',
      'CREATE',
      null,
      newServer,
      '#/inventory'
    );

    addToast(
      `Server Registered: ${newServer.name}`,
      `Added ${newServer.ipAddress} to active monitoring. Bearer token generated.`,
      'success'
    );
  };

  const deleteServer = (serverId: string) => {
    const target = servers.find((s) => s.id === serverId);
    if (!target) return;

    setServers((prev) => prev.filter((s) => s.id !== serverId));

    addAuditLog(
      'Remove Server',
      `Server ${target.name} (${target.ipAddress})`,
      `De-registered server from inventory`,
      'Warning',
      'DELETE',
      target,
      null,
      '#/inventory'
    );

    addToast(
      `Server Removed`,
      `${target.name} (${target.ipAddress}) has been removed from inventory.`,
      'warning'
    );
  };

  const updateServer = (serverId: string, updatedData: Partial<Server>) => {
    const target = servers.find((s) => s.id === serverId);
    if (!target) return;
    const oldServer = { ...target };
    const newServer = { ...target, ...updatedData };

    setServers((prev) =>
      prev.map((s) => (s.id === serverId ? newServer : s))
    );

    addAuditLog(
      'Update Server',
      `Server ${target.name}`,
      `Updated configuration / metadata`,
      'Success',
      'UPDATE',
      oldServer,
      newServer,
      '#/inventory'
    );
    addToast(
      `Server Updated`,
      `Saved changes for ${target.name}`,
      'info'
    );
  };

  const triggerMockAlert = () => {
    const randomServer = servers[Math.floor(Math.random() * servers.length)];
    const id = `alt-${Date.now()}`;
    const newAlert: Alert = {
      id,
      serverId: randomServer.id,
      serverName: randomServer.name,
      ipAddress: randomServer.ipAddress,
      title: 'High Memory Spike (>85%)',
      description: `Memory utilization peaked at 89% on ${randomServer.name}. System buffer memory exhausted.`,
      metric: 'Memory',
      value: '89%',
      threshold: '85%',
      severity: 'Warning',
      status: 'Active',
      timestamp: new Date().toISOString(),
    };

    setAlerts((prev) => [newAlert, ...prev]);

    const activity: ActivityItem = {
      id: `act-${Date.now()}`,
      type: 'ALERT',
      title: 'High Memory Spike',
      description: `Memory peaked at 89% on ${randomServer.name}`,
      timestamp: new Date().toISOString(),
      severity: 'Warning',
      serverName: randomServer.name,
    };
    setActivities((prev) => [activity, ...prev]);

    addToast(
      `NEW ALERT: ${randomServer.name}`,
      `Memory utilization reached 89% (Limit 85%).`,
      'warning'
    );
  };

  // Background heartbeat simulation interval
  useEffect(() => {
    if (!isLiveSimulating) return;

    const interval = setInterval(() => {
      // Slightly fluctuate CPU/RAM on servers
      setServers((prev) =>
        prev.map((s) => {
          const cpuDelta = (Math.random() - 0.5) * 4;
          const memDelta = (Math.random() - 0.5) * 2;
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

  // Data Center Controls
  const toggleDcMaintenance = (dcId: string) => {
    setDataCenters((prev) =>
      prev.map((dc) => {
        if (dc.id === dcId) {
          const nextStatus = dc.status === 'Maintenance' ? 'Healthy' : 'Maintenance';
          addAuditLog(
            'DC Maintenance Mode',
            `Data Center ${dc.name} (${dc.id})`,
            `Toggled status from ${dc.status} to ${nextStatus}`,
            'Warning',
            'UPDATE',
            { status: dc.status },
            { status: nextStatus },
            '#/datacenters'
          );
          addToast(
            `Data Center Status: ${dc.name}`,
            `Facility mode changed to ${nextStatus}. Alerts & traffic routing updated.`,
            nextStatus === 'Maintenance' ? 'warning' : 'success'
          );
          return { ...dc, status: nextStatus };
        }
        return dc;
      })
    );
  };

  const runDcHealthTest = async (dcId: string) => {
    const dc = dataCenters.find((d) => d.id === dcId);
    if (!dc) return { success: false, latencyMs: 0, details: 'Data Center not found' };

    await new Promise((resolve) => setTimeout(resolve, 900));
    const isSuccess = dc.status !== 'Maintenance';
    const latency = Math.max(1.1, Number((dc.networkLatencyMs + (Math.random() * 2 - 1)).toFixed(1)));

    addAuditLog(
      'DC Diagnostic Ping',
      `Data Center Gateway ${dc.name} (${dc.ipSubnet})`,
      `Health verification: ${isSuccess ? 'PASS' : 'DEGRADED'} - Latency ${latency}ms across WAN mesh`,
      'Success',
      'SYSTEM',
      null,
      { latencyMs: latency, status: dc.status },
      '#/datacenters'
    );

    addToast(
      `DC Diagnostic: ${dc.name}`,
      `WAN Gateway active. Latency: ${latency}ms | Power: ${dc.currentPowerUsageKw}kW / ${dc.totalCapacityKw}kW`,
      isSuccess ? 'success' : 'warning'
    );

    return {
      success: isSuccess,
      latencyMs: latency,
      details: `Gateway ${dc.ipSubnet}: Link optimal, PUE ${dc.pue}, Temp ${dc.temperatureC}°C, Generators ${dc.backupGeneratorStatus}.`,
    };
  };

  const triggerDcFailoverSim = (primaryDcId: string, secondaryDcId?: string) => {
    const primary = dataCenters.find((d) => d.id === primaryDcId);
    const targetDr = dataCenters.find((d) => d.id === (secondaryDcId || 'DC-05'));
    if (!primary || !targetDr) return;

    addAuditLog(
      'Failover Simulation',
      `Cluster ${primary.name} -> ${targetDr.name}`,
      `Initiated automated Disaster Recovery drill. Workloads mirrored and DNS shifted.`,
      'Warning',
      'SYSTEM',
      { primary: primary.name, dr: targetDr.name, status: 'Simulated' },
      { failoverTriggeredAt: new Date().toISOString(), rpo: '0s', rto: '<15s' },
      '#/datacenters'
    );

    addToast(
      `DR Failover Drill: ${primary.code} -> ${targetDr.code}`,
      `Simulated traffic migration to ${targetDr.name}. RPO: 0s, RTO: <15s. All health checks green.`,
      'success'
    );
  };

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
        toggleLiveSimulation,
        dismissToast,
        addToast,
        triggerMockAlert,
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
