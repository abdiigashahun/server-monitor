import React from 'react';
import { AlertTriangle, ShieldOff, RefreshCw } from 'lucide-react';
import { ApiError } from '../../api/client';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry, title }) => {
  const status = error instanceof ApiError ? error.status : 0;

  // 403 gets a distinct "not authorized" treatment rather than a generic error.
  if (status === 403) {
    return (
      <NotAuthorized message={messageFor(error)} />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="p-3 rounded-full bg-red-50 dark:bg-red-950/50 text-red-500 dark:text-red-400 mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title || 'Unable to load data'}
      </h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm">{messageFor(error)}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
};

export const NotAuthorized: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center text-center py-20 px-6">
    <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-500 dark:text-amber-400 mb-4">
      <ShieldOff className="w-6 h-6" />
    </div>
    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Not authorized</h3>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md">
      {message || 'You do not have permission to view this section. Contact an administrator if you believe this is a mistake.'}
    </p>
  </div>
);
