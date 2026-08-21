import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NotificationToastContainer } from '../Notification/NotificationToast';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, children }) => {
  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#0B0F17] text-[#1A1A1A] dark:text-[#F9FAFB] overflow-hidden font-sans transition-colors duration-200">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activeTab={activeTab} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F8F9FA] dark:bg-[#0B0F17] transition-colors duration-200">
          {children}
        </main>
      </div>

      <NotificationToastContainer />
    </div>
  );
};

