import React, { ReactNode } from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  message,
  action,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 mb-4">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
    {message && (
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm">{message}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
