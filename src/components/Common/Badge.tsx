import React, { ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral:
    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  info: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  success:
    'bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  warning:
    'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  danger:
    'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  purple:
    'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  title?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = '',
  title,
}) => (
  <span
    title={title}
    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${VARIANT_CLASSES[variant]} ${className}`}
  >
    {children}
  </span>
);
