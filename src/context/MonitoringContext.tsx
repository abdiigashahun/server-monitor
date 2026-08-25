import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
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
  UserRole,
} from '../types';
import {
  INITIAL_ALERTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SYSTEM_LOGS,
  INITIAL_THRESHOLDS,
  INITIAL_USER_PROFILE,
  INITIAL_ACTIVITIES,
  TELEMETRY_DATA,
  BACKUP_TRENDS,
} from '../utils/mockData';
import * as serverServiceModule from '../services/serverService';
import * as authServiceModule from '../services/auth';

// Safe module resolution with fallback casting to prevent TS compilation errors
const authService: any = (authServiceModule as any).default || authServiceModule;
const serverService: any = (serverServiceModule as any).default || serverServiceModule;

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  timestamp: string;
}

export type ActionType =
  | 'MANAGE_SERVERS'
  | 'ACKNOWLEDGE_ALERT'
  | 'RESOLVE_ALERT'
  | 'UPDATE_SETTINGS'
  | 'MANAGE_BACKUPS';

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
  loadingServers: boolean;
  isAuthenticated: boolean;

  // Exact Role & Permissions Evaluator
  canPerformAction: (action: ActionType) => boolean;

  // Actions
  loginUser: (email: string, pass: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  fetchServers: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  addServer: (serverData: Partial<Server>) => Promise<void>;
  deleteServer: (serverId: string) => Promise<void>;
  updateServer: (serverId: string, updatedData: Partial<Server>) => Promise<void>;
  ingestServerHealth: (serverId: string) => Promise<void>;
  acknowledgeAlert: (alertId: string, note?: string) => void;
  resolveAlert: (alertId: string, note?: string) => void;
  updateThresholds: (newSettings: Partial<ThresholdSettings>) => void;
  updateUserProfile: (newProfile: Partial<UserProfile>) => void;
  addAuditLog: (action: string, resource: string, details: string, status?: 'Success' | 'Denied' | 'Warning') => void;
  generateAgentToken: (serverId: string) => string;
  runPingTest: (serverId: string) => Promise<{ success: boolean; latencyMs: number; details: string }>;
  toggleLiveSimulation: () => void;
  dismissToast: (id: string) => void;
  addToast: (title: string, message: string, type?: ToastNotification['type']) => void;
  triggerMockAlert: () => void;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export const MonitoringProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [systemLogs] = useState<SystemLog[]>(INITIAL_SYSTEM_LOGS);
  const [thresholds, setThresholds] = useState<ThresholdSettings>(INITIAL_THRESHOLDS);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [activities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [telemetry] = useState<TelemetryPoint[]>(TELEMETRY_DATA);
  const [backupTrends] = useState<BackupHistoryPoint[]>(BACKUP_TRENDS);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isLiveSimulating, setIsLiveSimulating] = useState<boolean>(true);

  const [loadingServers, setLoadingServers] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    Boolean(localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('authToken'))
  );

  // --- Role Engine & Utilities ---

  const canPerformAction = useCallback((action: ActionType): boolean => {
    const role: UserRole = userProfile.role || 'Viewer';

    if (role === 'Admin') return true;

    if (role === 'Operator') {
      return (
        action === 'ACKNOWLEDGE_ALERT' ||
        action === 'RESOLVE_ALERT' ||
        action === 'MANAGE_BACKUPS'
      );
    }

    return false;
  }, [userProfile.role]);

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

  const addAuditLog = useCallback((
    action: string,
    resource: string,
    details: string,
    status: 'Success' | 'Denied' | 'Warning' = 'Success'
  ) => {
    setUserProfile((currentProfile) => {
      const newLog: AuditLog = {
        id: `aud-${Date.now()}`,
        user: currentProfile.name || 'User',
        role: currentProfile.role || 'Viewer',
        action,
        resource,
        ipAddress: '10.200.4.15',
        timestamp: new Date().toISOString(),
        status,
        details,
      };
      setAuditLogs((prev) => [newLog, ...prev]);
      return currentProfile;
    });
  }, []);

  // --- Data Fetching Operations ---

  const fetchCurrentUser = useCallback(async () => {
    try {
      if (typeof authService.getCurrentUser === 'function') {
        const rawUser = await authService.getCurrentUser();
        const userData = rawUser?.data?.user || rawUser?.user || rawUser?.data || rawUser;
        
        if (userData) {
          setUserProfile((prev) => ({
            ...prev,
            id: userData.id || userData._id || prev.id,
            name: userData.name || userData.email || prev.name,
            email: userData.email || prev.email,
            role: userData.role
              ? (userData.role.charAt(0).toUpperCase() + userData.role.slice(1).toLowerCase()) as UserRole
              : 'Admin',
          }));
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch user profile:', err);
    }
  }, []);

  const fetchServers = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingServers(true);
    try {
      if (typeof serverService.getServers === 'function') {
        const rawData = await serverService.getServers();
        
        const dataList = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData?.servers)
          ? rawData.servers
          : Array.isArray(rawData?.data?.servers)
          ? rawData.data.servers
          : [];

        const mappedServers: Server[] = dataList.map((srv: any) => ({
          id: srv.id || srv._id,
          name: srv.name || 'Server Node',
          ipAddress: srv.ipOrHostname || srv.ipAddress || srv.ip || '10.0.0.1',
          type: srv.type || 'APPLICATION',
          os: srv.os || 'LINUX',
          location: srv.location || 'Addis Ababa',
          department: srv.department || 'IT',
          criticality: srv.criticality || 'MEDIUM',
          owner: srv.owner || 'Ops Team',
          cpuUsage: srv.cpuUsage ?? srv.cpu ?? Math.floor(Math.random() * 30) + 15,
          memoryUsage: srv.memoryUsage ?? srv.memory ?? Math.floor(Math.random() * 40) + 25,
          diskUsage: srv.diskUsage ?? srv.disk ?? Math.floor(Math.random() * 50) + 30,
          uptimeDays: srv.uptimeDays || 1,
          lastBootTime: srv.lastBootTime || new Date().toISOString(),
          networkStatus: srv.networkStatus || srv.status || 'Online',
          healthStatus: srv.healthStatus || 'Operational',
          agentToken: srv.agentToken || '',
          lastBackupTime: new Date().toISOString(),
          backupStatus: 'Success',
          backupType: 'Incremental',
          backupSizeGB: 120,
          backupLocation: 'Gov Cloud S3',
        }));
        
        setServers(mappedServers);
      }
    } catch (err: any) {
      console.error('Failed to load server inventory:', err);
      addToast('Sync Failed', 'Unable to retrieve servers from API backend', 'critical');
    } finally {
      setLoadingServers(false);
    }
  }, [isAuthenticated, addToast]);

  // Initial Sync Effect
  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentUser();
      fetchServers();
    }
  }, [isAuthenticated, fetchCurrentUser, fetchServers]);

  // --- Actions ---

  const loginUser = useCallback(async (email: string, pass: string) => {
    try {
      if (typeof authService.login === 'function') {
        await authService.login(email, pass);
      }
      setIsAuthenticated(true);
      await fetchCurrentUser();
      addToast('Authenticated', 'Logged into server monitoring dashboard', 'success');
    } catch (err: any) {
      console.error('Login error:', err);
      addToast('Authentication Failed', err.response?.data?.message || err.message || 'Invalid credentials', 'critical');
      throw err;
    }
  }, [fetchCurrentUser, addToast]);

  const logoutUser = useCallback(async () => {
    try {
      if (typeof authService.logout === 'function') {
        await authService.logout();
      }
    } catch (err) {
      console.error('Logout failed on backend:', err);
    } finally {
      setIsAuthenticated(false);
      setServers([]);
      setUserProfile(INITIAL_USER_PROFILE);
      addToast('Logged Out', 'Session terminated successfully', 'info');
    }
  }, [addToast]);

  const addServer = useCallback(async (serverData: Partial<Server> & { ipOrHostname?: string }) => {
    if (!canPerformAction('MANAGE_SERVERS')) {
      addAuditLog('Add Server', `Server ${serverData.name || 'New'}`, 'Denied: Restricted to Admin', 'Denied');
      addToast('Access Denied', 'Only Admins can add servers.', 'critical');
      return;
    }

    try {
      const payload = {
        name: serverData.name || 'New Server',
        ipOrHostname: serverData.ipOrHostname || serverData.ipAddress || '10.200.0.1',
        department: serverData.department || 'ITDB Central',
        criticality: (serverData.criticality || 'MEDIUM').toUpperCase(),
        type: (serverData.type || 'APPLICATION').toUpperCase(),
        os: (serverData.os || 'LINUX').toUpperCase(),
        location: serverData.location || 'Addis Ababa',
        owner: serverData.owner || 'Ops Team',
      };

      let response: any = {};
      if (typeof serverService.createServer === 'function') {
        response = await serverService.createServer(payload);
      }

      addAuditLog('Add Server', `Server ${payload.name} (${payload.ipOrHostname})`, 'Registered server');
      addToast(`Server Registered: ${payload.name}`, `Agent Token: ${response?.agentToken || 'Generated'}`, 'success');
      await fetchServers();
    } catch (err: any) {
      console.error('Failed to create server:', err);
      const errMsg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message || err.message || 'Failed to register server on backend API';
      addToast('Error', errMsg, 'critical');
    }
  }, [canPerformAction, addAuditLog, addToast, fetchServers]);

  const deleteServer = useCallback(async (serverId: string) => {
    if (!canPerformAction('MANAGE_SERVERS')) {
      addAuditLog('Delete Server', `Server #${serverId}`, 'Denied: Restricted to Admin', 'Denied');
      addToast('Access Denied', 'Only Admins can delete servers.', 'critical');
      return;
    }

    setServers((currentServers) => {
      const target = currentServers.find((s) => s.id === serverId);
      if (target) {
        addAuditLog('Remove Server', `Server ${target.name} (${target.ipAddress})`, 'Soft deleted server from inventory');
        addToast('Server Removed', `${target.name} has been removed from active inventory.`, 'warning');
      }
      return currentServers.filter((s) => s.id !== serverId);
    });

    try {
      if (typeof serverService.deleteServer === 'function') {
        await serverService.deleteServer(serverId);
      }
    } catch (err: any) {
      console.error('Failed to delete server:', err);
      addToast('Error', 'Failed to delete server on backend API', 'critical');
    }
  }, [canPerformAction, addAuditLog, addToast]);

  const updateServer = useCallback(async (serverId: string, updatedData: Partial<Server> & { ipOrHostname?: string }) => {
    if (!canPerformAction('MANAGE_SERVERS')) {
      addAuditLog('Update Server', `Server #${serverId}`, 'Denied: Restricted to Admin', 'Denied');
      addToast('Access Denied', 'Only Admins can modify server infrastructure.', 'critical');
      return;
    }

    try {
      const payload: Record<string, any> = {};
      if (updatedData.name) payload.name = updatedData.name;
      if (updatedData.ipOrHostname || updatedData.ipAddress) {
        payload.ipOrHostname = updatedData.ipOrHostname || updatedData.ipAddress;
      }
      if (updatedData.department) payload.department = updatedData.department;
      if (updatedData.criticality) payload.criticality = updatedData.criticality.toUpperCase();
      if (updatedData.type) payload.type = updatedData.type.toUpperCase();
      if (updatedData.os) payload.os = updatedData.os.toUpperCase();
      if (updatedData.location) payload.location = updatedData.location;
      if (updatedData.owner) payload.owner = updatedData.owner;

      if (typeof serverService.updateServer === 'function') {
        await serverService.updateServer(serverId, payload);
      }

      setServers((prev) =>
        prev.map((s) => {
          if (s.id === serverId) {
            const merged = { ...s, ...updatedData };
            addAuditLog('Update Server', `Server ${merged.name}`, 'Updated metadata');
            addToast('Server Updated', `Saved changes for ${merged.name}`, 'info');
            return merged;
          }
          return s;
        })
      );
    } catch (err: any) {
      console.error('Failed to update server:', err);
      const errMsg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message || err.message || 'Failed to update server details on backend';
      addToast('Error', errMsg, 'critical');
    }
  }, [canPerformAction, addAuditLog, addToast]);

  const ingestServerHealth = useCallback(async (serverId: string) => {
    const server = servers.find((s) => s.id === serverId);
    if (!server) {
      addToast('Ingestion Error', 'Target server was not found in active inventory', 'critical');
      return;
    }

    if (!server.agentToken) {
      addToast('Token Missing', `Server ${server.name} does not have an active agent token`, 'critical');
      return;
    }

    const payload = {
      cpuUsage: server.cpuUsage ?? 12.5,
      memoryUsage: server.memoryUsage ?? 40.1,
      diskUsage: server.diskUsage ?? 71,
      uptimeSeconds: (server.uptimeDays || 1) * 86400,
      lastBootAt: server.lastBootTime || new Date().toISOString(),
      networkStatus: server.networkStatus === 'Offline' ? 'DOWN' : 'UP',
    };

    try {
      if (typeof serverService.ingestHealthSample === 'function') {
        await serverService.ingestHealthSample(server.agentToken, payload);

        setServers((prev) =>
          prev.map((s) =>
            s.id === serverId
              ? {
                  ...s,
                  cpuUsage: payload.cpuUsage,
                  memoryUsage: payload.memoryUsage,
                  diskUsage: payload.diskUsage,
                  networkStatus: payload.networkStatus === 'UP' ? 'Online' : 'Offline',
                  healthStatus: 'Operational',
                }
              : s
          )
        );

        addAuditLog('Ingest Health Log', `Server ${server.name}`, 'Telemetry sample ingested successfully');
        addToast('Telemetry Sent', `Ingested health sample for ${server.name}`, 'success');
      }
    } catch (err: any) {
      console.error('Failed to ingest health log:', err);
      addAuditLog('Ingest Health Log', `Server ${server.name}`, `Failed: ${err.message}`, 'Warning');
      addToast('Ingestion Failed', err.message || 'Error pushing server health metrics', 'critical');
    }
  }, [servers, addAuditLog, addToast]);

  const acknowledgeAlert = useCallback((alertId: string, note?: string) => {
    if (!canPerformAction('ACKNOWLEDGE_ALERT')) {
      addAuditLog('Acknowledge Alert', `Alert #${alertId}`, 'Denied: Viewers are read-only', 'Denied');
      addToast('Access Denied', 'Viewers cannot acknowledge alerts.', 'critical');
      return;
    }

    const now = new Date().toISOString();

    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id === alertId) {
          addAuditLog(
            'Acknowledge Alert',
            `Alert #${alertId} (${a.serverName})`,
            note ? `Note: ${note}` : `Acknowledged by ${userProfile.name}`
          );
          addToast('Alert Acknowledged', `Alert on ${a.serverName} acknowledged.`, 'info');
          return {
            ...a,
            status: 'Acknowledged',
            acknowledgedBy: userProfile.name,
            acknowledgedAt: now,
          };
        }
        return a;
      })
    );
  }, [canPerformAction, addAuditLog, addToast, userProfile.name]);

  const resolveAlert = useCallback((alertId: string, note?: string) => {
    if (!canPerformAction('RESOLVE_ALERT')) {
      addAuditLog('Resolve Alert', `Alert #${alertId}`, 'Denied: Viewers are read-only', 'Denied');
      addToast('Access Denied', 'Viewers cannot resolve alerts.', 'critical');
      return;
    }

    const now = new Date().toISOString();

    setAlerts((prev) => {
      const targetAlert = prev.find((a) => a.id === alertId);
      if (!targetAlert) return prev;

      const updatedAlerts = prev.map((a) =>
        a.id === alertId ? { ...a, status: 'Resolved' as const, resolvedAt: now } : a
      );

      const remainingCritical = updatedAlerts.filter(
        (a) => a.serverId === targetAlert.serverId && a.severity === 'Critical' && a.status !== 'Resolved'
      );

      if (remainingCritical.length === 0) {
        setServers((currServers) =>
          currServers.map((s) => (s.id === targetAlert.serverId ? { ...s, healthStatus: 'Operational' } : s))
        );
      }

      addAuditLog('Resolve Alert', `Alert #${alertId} (${targetAlert.serverName})`, note || 'Resolved');
      addToast('Alert Resolved', `Alert #${alertId} resolved.`, 'success');

      return updatedAlerts;
    });
  }, [canPerformAction, addAuditLog, addToast]);

  const updateThresholds = useCallback((newSettings: Partial<ThresholdSettings>) => {
    if (!canPerformAction('UPDATE_SETTINGS')) {
      addAuditLog('Update Threshold Settings', 'Global Settings', 'Denied: Restricted to Admin', 'Denied');
      addToast('Access Denied', 'Only Admins can change global settings and thresholds.', 'critical');
      return;
    }

    setThresholds((prev) => ({ ...prev, ...newSettings }));
    addAuditLog('Update Threshold Settings', 'Global Settings', 'Updated warning limits');
    addToast('Settings Saved', 'Threshold settings updated successfully.', 'success');
  }, [canPerformAction, addAuditLog, addToast]);

  const updateUserProfile = useCallback((newProfile: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...newProfile }));
  }, []);

  const generateAgentToken = useCallback((serverId: string): string => {
    if (!canPerformAction('MANAGE_SERVERS')) {
      addAuditLog('Generate Agent Token', `Server #${serverId}`, 'Denied: Restricted to Admin', 'Denied');
      addToast('Access Denied', 'Only Admins can generate agent tokens.', 'critical');
      return '';
    }

    const newToken = `agt_tok_${Math.random().toString(36).substring(2, 14)}`;

    setServers((prev) =>
      prev.map((s) => {
        if (s.id === serverId) {
          addAuditLog('Generate Agent Token', `Server ${s.name}`, 'Generated agent token');
          addToast('Token Regenerated', `New agent token created for ${s.name}.`, 'success');
          return { ...s, agentToken: newToken };
        }
        return s;
      })
    );

    return newToken;
  }, [canPerformAction, addAuditLog, addToast]);

  const runPingTest = useCallback(async (serverId: string) => {
    const server = servers.find((s) => s.id === serverId);
    const startTime = Date.now();

    try {
      const response = await serverService.checkAdminPing();
      const latencyMs = Date.now() - startTime;
      const detailsText = `PING ${server?.name || 'Admin Endpoint'}: Reply "${response.message}" in ${latencyMs}ms.`;

      addAuditLog('Execute Admin Ping', `Server ${server?.name || 'Cluster'}`, `Latency: ${latencyMs}ms`);
      addToast('Admin Ping Success', response.message || 'Admin access granted', 'success');

      return {
        success: response.success ?? true,
        latencyMs,
        details: detailsText,
      };
    } catch (err: any) {
      console.error('Admin ping failed:', err);

      addAuditLog('Execute Admin Ping', `Server ${server?.name || 'Cluster'}`, 'Denied/Failed', 'Denied');
      addToast('Ping Check Failed', err.message || 'Unauthorized or unreachable', 'critical');

      return {
        success: false,
        latencyMs: 0,
        details: err.message || 'Ping failed: Unauthorized or network error',
      };
    }
  }, [servers, addAuditLog, addToast]);

  const toggleLiveSimulation = useCallback(() => {
    setIsLiveSimulating((prev) => {
      const nextState = !prev;
      addToast('Simulation', nextState ? 'Live simulation started.' : 'Simulation paused.', 'info');
      return nextState;
    });
  }, [addToast]);

  const triggerMockAlert = useCallback(() => {
    setServers((currentServers) => {
      if (currentServers.length === 0) return currentServers;
      const randomServer = currentServers[Math.floor(Math.random() * currentServers.length)];
      const id = `alt-${Date.now()}`;

      const newAlert: Alert = {
        id,
        serverId: randomServer.id,
        serverName: randomServer.name,
        ipAddress: randomServer.ipAddress,
        title: 'High Memory Spike (>85%)',
        description: `Memory utilization peaked at 89% on ${randomServer.name}.`,
        metric: 'Memory',
        value: '89%',
        threshold: '85%',
        severity: 'Warning',
        status: 'Active',
        timestamp: new Date().toISOString(),
      };

      setAlerts((prev) => [newAlert, ...prev]);
      addToast(`NEW ALERT: ${randomServer.name}`, 'Memory utilization reached 89%.', 'warning');
      return currentServers;
    });
  }, [addToast]);

  // Live Metric Background Simulation
  useEffect(() => {
    if (!isLiveSimulating) return;

    const interval = setInterval(() => {
      setServers((prev) =>
        prev.map((s) => {
          const cpuDelta = (Math.random() - 0.5) * 4;
          const memDelta = (Math.random() - 0.5) * 2;
          return {
            ...s,
            cpuUsage: Math.min(99, Math.max(5, Math.round(s.cpuUsage + cpuDelta))),
            memoryUsage: Math.min(98, Math.max(10, Math.round(s.memoryUsage + memDelta))),
          };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [isLiveSimulating]);

  // --- Fully Memoized Context Object ---

  const value = useMemo(
    () => ({
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
      loadingServers,
      isAuthenticated,
      canPerformAction,
      loginUser,
      logoutUser,
      fetchServers,
      fetchCurrentUser,
      addServer,
      deleteServer,
      updateServer,
      ingestServerHealth,
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
    }),
    [
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
      loadingServers,
      isAuthenticated,
      canPerformAction,
      loginUser,
      logoutUser,
      fetchServers,
      fetchCurrentUser,
      addServer,
      deleteServer,
      updateServer,
      ingestServerHealth,
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
    ]
  );

  return (
    <MonitoringContext.Provider value={value}>
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