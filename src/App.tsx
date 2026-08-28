import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout/Layout';
import { LoginPage } from './components/Auth/LoginPage';
import { NotAuthorized } from './components/Common/ErrorState';
import { ITDBLogo } from './components/Common/ITDBLogo';
import { useRoute, Route } from './router';
import { permissionForRoute } from './navigation';

import { DashboardOverview } from './components/Dashboard/DashboardOverview';
import { ServerInventoryView } from './components/Inventory/ServerInventoryView';
import { ServerDetailView } from './pages/Servers/ServerDetailView';
import { AlertsPage } from './pages/Alerts/AlertsPage';
import { BackupStatusPage } from './pages/Backups/BackupStatusPage';
import { ThresholdsPage } from './pages/Thresholds/ThresholdsPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { UsersPage } from './pages/Users/UsersPage';
import { AuditLogsPage } from './pages/Audit/AuditLogsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

const BootScreen: React.FC = () => (
  <div className="min-h-screen w-full bg-[#070B12] flex flex-col items-center justify-center gap-6">
    <ITDBLogo size="lg" showSubtext />
    <div className="flex items-center gap-2 text-gray-400 text-sm">
      <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      Restoring your session…
    </div>
  </div>
);

function renderPage(route: Route): React.ReactNode {
  switch (route.tab) {
    case 'dashboard':
      return <DashboardOverview />;
    case 'servers':
      return route.id ? <ServerDetailView serverId={route.id} /> : <ServerInventoryView />;
    case 'backups':
      return <BackupStatusPage />;
    case 'alerts':
      return <AlertsPage serverId={route.id} />;
    case 'thresholds':
      return <ThresholdsPage />;
    case 'reports':
      return <ReportsPage />;
    case 'users':
      return <UsersPage />;
    case 'audit':
      return <AuditLogsPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardOverview />;
  }
}

function AppShell() {
  const { status, isAuthenticated, can } = useAuth();
  const route = useRoute();

  if (status === 'booting') return <BootScreen />;
  if (!isAuthenticated) return <LoginPage />;

  const permission = permissionForRoute(route.tab);
  const allowed = !permission || can(permission);

  return (
    <Layout activeTab={route.tab}>
      {allowed ? renderPage(route) : <NotAuthorized />}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
