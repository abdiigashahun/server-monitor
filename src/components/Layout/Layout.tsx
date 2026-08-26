import React, { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../Common/ToastContainer';

interface LayoutProps {
  activeTab: string;
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#0B0F17] text-[#1A1A1A] dark:text-[#F9FAFB] overflow-hidden font-sans transition-colors duration-200">
      <Sidebar activeTab={activeTab} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activeTab={activeTab} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F8F9FA] dark:bg-[#0B0F17] transition-colors duration-200">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
