import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  label?: string;
  className?: string;
  size?: number;
}

export const Spinner: React.FC<SpinnerProps> = ({ label, className = '', size = 20 }) => (
  <div className={`flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 ${className}`}>
    <Loader2 className="animate-spin" style={{ width: size, height: size }} />
    {label && <span className="text-sm">{label}</span>}
  </div>
);

// Full-panel loading state for page/section bodies.
export const LoadingPanel: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center py-16">
    <Spinner label={label} size={24} />
  </div>
);
