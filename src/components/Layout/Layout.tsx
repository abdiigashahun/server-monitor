// src/components/Layout/Layout.tsx
import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NotificationToastContainer } from '../Notification/NotificationToast';
import { UserRole } from '../../types';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  setUserRole?: (role: UserRole) => void;
  onLogout: () => void; // <--- Added onLogout prop definition
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  onLogout,
  children,
}) => {
  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#0B0F17] text-[#1A1A1A] dark:text-[#F9FAFB] overflow-hidden font-sans transition-colors duration-200">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          activeTab={activeTab} 
          userRole={userRole} 
          setUserRole={setUserRole} 
          onLogout={onLogout} // <--- Passed to Header
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F8F9FA] dark:bg-[#0B0F17] transition-colors duration-200">
          {children}
        </main>
      </div>

      <NotificationToastContainer />
    </div>
  );
};