import type { BadgeVariant } from '../components/Common/Badge';
import type {
  Criticality,
  AlertSeverity,
  AlertStatus,
  BackupStatus,
  VerificationStatus,
  NetworkStatus,
} from '../types';

// ---------------------------------------------------------------------------
// Time & size formatting
// ---------------------------------------------------------------------------
export function formatTimestamp(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) return date.toLocaleString();
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(isoString);
  }
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(isoString);
  }
}

// Bytes from the backend arrive as a decimal string (serialized BigInt).
export function formatBytes(bytes: number | string | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—';
  const n = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const value = n / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

// Compact human duration from seconds (used for uptime and staleness ages).
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  const s = Math.max(0, Math.floor(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${s}s`;
}

// ---------------------------------------------------------------------------
// Enum → Badge variant mappers
// ---------------------------------------------------------------------------
export function criticalityVariant(c: Criticality): BadgeVariant {
  switch (c) {
    case 'HIGH':
      return 'danger';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'neutral';
  }
}

export function alertSeverityVariant(s: AlertSeverity): BadgeVariant {
  return s === 'CRITICAL' ? 'danger' : 'warning';
}

export function alertStatusVariant(s: AlertStatus): BadgeVariant {
  switch (s) {
    case 'OPEN':
      return 'danger';
    case 'ACKNOWLEDGED':
      return 'warning';
    case 'RESOLVED':
      return 'success';
  }
}

export function backupStatusVariant(s: BackupStatus): BadgeVariant {
  switch (s) {
    case 'SUCCESS':
      return 'success';
    case 'FAILED':
      return 'danger';
    case 'IN_PROGRESS':
      return 'info';
  }
}

export function verificationVariant(v: VerificationStatus): BadgeVariant {
  switch (v) {
    case 'VERIFIED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'NOT_REQUIRED':
      return 'neutral';
  }
}

export function networkStatusVariant(n: NetworkStatus): BadgeVariant {
  switch (n) {
    case 'UP':
      return 'success';
    case 'DEGRADED':
      return 'warning';
    case 'DOWN':
      return 'danger';
  }
}

// Human labels for enums that shouldn't be shown raw.
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
