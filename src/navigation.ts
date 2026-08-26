import { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Server,
  BellRing,
  SlidersHorizontal,
  BarChart3,
  Users,
  ScrollText,
  Settings,
} from 'lucide-react';
import type { PermissionKey } from './types';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Permission required to see this item. Undefined = visible to any signed-in user. */
  permission?: PermissionKey;
  section: 'core' | 'admin';
}

// Single source of truth for navigation + route guarding. The Sidebar renders
// from this (filtered by `can()`), and App.tsx guards routes with the same map.
export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'core' },
  { id: 'servers', label: 'Server Inventory', icon: Server, permission: 'servers:read', section: 'core' },
  { id: 'alerts', label: 'Alerts', icon: BellRing, permission: 'alerts:read', section: 'core' },
  { id: 'thresholds', label: 'Thresholds', icon: SlidersHorizontal, permission: 'thresholds:read', section: 'core' },
  { id: 'reports', label: 'Reports', icon: BarChart3, permission: 'reports:read', section: 'core' },
  { id: 'users', label: 'Users', icon: Users, permission: 'users:read', section: 'admin' },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText, permission: 'audit:read', section: 'admin' },
  { id: 'settings', label: 'Settings', icon: Settings, section: 'admin' },
];

export const NAV_BY_ID: Record<string, NavItem> = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.id, item]),
);

// Server detail lives under the servers tab and shares its permission.
export function permissionForRoute(tab: string): PermissionKey | undefined {
  if (tab === 'servers') return 'servers:read';
  return NAV_BY_ID[tab]?.permission;
}
