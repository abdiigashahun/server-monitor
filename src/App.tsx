import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { MonitoringProvider } from './context/MonitoringContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout/Layout';
import { LoginPage } from './components/Auth/LoginPage';
import { DashboardOverview } from './components/Dashboard/DashboardOverview';
import { DataCentersView } from './components/DataCenters/DataCentersView';
import { ServerInventoryView } from './components/Inventory/ServerInventoryView';
import { BackupCenterView } from './components/Backup/BackupCenterView';
import { UserActivityTracker } from './components/Activity/UserActivityTracker';
import { AlertsLogsPage } from './pages/AlertsLogs/AlertsLogsPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { UserManagementPage } from './pages/Admin/UserManagementPage';

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Simple hash router support for direct linking e.g. #/datacenters
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (['dashboard', 'datacenters', 'inventory', 'backup', 'alerts-logs', 'reports', 'settings', 'activity', 'users', 'login'].includes(hash)) {
        if ((hash === 'activity' || hash === 'users') && !isAdmin) {
          setActiveTab('dashboard');
          window.location.hash = '#/dashboard';
        } else {
          setActiveTab(hash);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAdmin]);

  const handleTabChange = (tab: string) => {
    if ((tab === 'activity' || tab === 'users') && !isAdmin) {
      setActiveTab('dashboard');
      window.location.hash = '#/dashboard';
      return;
    }
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  };

  if (!isAuthenticated || activeTab === 'login') {
    return <LoginPage />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={handleTabChange}>
      {activeTab === 'dashboard' && <DashboardOverview />}
      {activeTab === 'datacenters' && <DataCentersView />}
      {activeTab === 'inventory' && <ServerInventoryView />}
      {activeTab === 'backup' && <BackupCenterView />}
      {activeTab === 'alerts-logs' && <AlertsLogsPage />}
      {activeTab === 'reports' && <ReportsPage />}
      {activeTab === 'activity' && (isAdmin ? <UserActivityTracker /> : <DashboardOverview />)}
      {activeTab === 'users' && (isAdmin ? <UserManagementPage /> : <DashboardOverview />)}
      {activeTab === 'settings' && <SettingsPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MonitoringProvider>
          <AppContent />
        </MonitoringProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}


