// src/App.tsx
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { MonitoringProvider, useMonitoring } from './context/MonitoringContext';
import { Layout } from './components/Layout/Layout';
import { DashboardOverview } from './components/Dashboard/DashboardOverview';
import { ServerInventoryView } from './components/Inventory/ServerInventoryView';
import { BackupCenterView } from './components/Backup/BackupCenterView';
import { AlertsLogsPage } from './pages/AlertsLogs/AlertsLogsPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { AuditLogTable } from './components/Reports/AuditLogTable';
import { LoginPage } from './pages/Auth/LoginPage';
import { UserRole, ROLE_PERMISSIONS } from './types';
import { getCurrentUser, logout as apiLogout, getAuthToken, isAuthenticated as checkTokenValid } from './services/auth';
import { Loader2 } from 'lucide-react';

const MainAppContent: React.FC<{
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  activeTab: string;
  handleTabChange: (tab: string) => void;
  handleLogout: () => void;
}> = ({ userRole, setUserRole, activeTab, handleTabChange, handleLogout }) => {
  const { userProfile, updateUserProfile } = useMonitoring();

  useEffect(() => {
    if (userProfile.role !== userRole) {
      updateUserProfile({ role: userRole });
    }
  }, [userRole, userProfile.role, updateUserProfile]);

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={handleTabChange} 
      userRole={userRole}
      setUserRole={setUserRole}
      onLogout={handleLogout}
    >
      {activeTab === 'dashboard' && <DashboardOverview />}
      {activeTab === 'inventory' && <ServerInventoryView userRole={userRole} />}
      {activeTab === 'backup' && <BackupCenterView />}
      {activeTab === 'reports' && <ReportsPage />}
      {activeTab === 'alerts-logs' && <AlertsLogsPage />}

      {/* Restricted Tabs */}
      {activeTab === 'audit' && userRole === 'Admin' && <AuditLogTable />}
      {activeTab === 'settings' && userRole === 'Admin' && <SettingsPage />}
    </Layout>
  );
};

export default function App() {
  // Synchronous initialization to keep user logged in on reload
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(getAuthToken()) && checkTokenValid();
  });
  
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('userRole') as UserRole) || 'Admin';
  });
  
  const [activeTab, setActiveTab] = useState<string>(() => {
    const hash = window.location.hash.replace('#/', '');
    return hash && hash !== 'login' ? hash : 'dashboard';
  });

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();

      if (!token) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return;
      }

      setIsAuthenticated(true);

      try {
        const user = await getCurrentUser();
        if (user?.role) {
          // Normalize role casing to match UserRole type ("Admin" | "Operator" | "Viewer")
          const formattedRole = (user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()) as UserRole;
          setUserRole(formattedRole);
          localStorage.setItem('userRole', formattedRole);
        }
      } catch (error: any) {
        console.warn('Session background check error:', error);
        // Only log out if backend explicitly returns a 401 Unauthorized status
        if (error?.status === 401) {
          handleLogout();
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    initAuth();
  }, []);

  const handleLoginSuccess = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
    setActiveTab('dashboard');
    localStorage.setItem('userRole', role);
    window.location.hash = '#/dashboard';
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setUserRole('Viewer');
    setActiveTab('dashboard');
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    sessionStorage.clear();
    
    window.location.hash = '#/login';
    await apiLogout().catch(() => {});
  };

  const handleTabChange = (tab: string) => {
    const allowedTabs = ROLE_PERMISSIONS[userRole] || [];
    if (allowedTabs.includes(tab)) {
      setActiveTab(tab);
      window.location.hash = `#/${tab}`;
    } else {
      setActiveTab('dashboard');
      window.location.hash = '#/dashboard';
    }
  };

  if (isCheckingAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <MonitoringProvider>
        {!isAuthenticated ? (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        ) : (
          <MainAppContent
            userRole={userRole}
            setUserRole={setUserRole}
            activeTab={activeTab}
            handleTabChange={handleTabChange}
            handleLogout={handleLogout}
          />
        )}
      </MonitoringProvider>
    </ThemeProvider>
  );
}