import { AlertSeverity, HealthStatus, BackupStatus } from '../types';

export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatBytes(bytesGB: number): string {
  if (bytesGB < 1) {
    return `${(bytesGB * 1024).toFixed(0)} MB`;
  }
  if (bytesGB >= 1000) {
    return `${(bytesGB / 1024).toFixed(2)} TB`;
  }
  return `${bytesGB.toFixed(1)} GB`;
}

export function getSeverityBadgeClass(severity: AlertSeverity): string {
  switch (severity) {
    case 'Critical':
      return 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold';
    case 'Warning':
      return 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold';
    case 'Info':
      return 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold';
  }
}

export function getHealthBadgeClass(status: HealthStatus): string {
  switch (status) {
    case 'Operational':
      return 'bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 font-bold';
    case 'Warning':
      return 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold';
    case 'Critical':
      return 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold';
  }
}

export function getBackupBadgeClass(status: BackupStatus): string {
  switch (status) {
    case 'Success':
      return 'bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 font-bold';
    case 'Failed':
      return 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold';
    case 'In Progress':
      return 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold animate-pulse';
  }
}
