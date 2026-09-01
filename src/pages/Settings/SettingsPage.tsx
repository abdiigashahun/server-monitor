import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge, BadgeVariant } from '../../components/Common/Badge';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  UserCircle,
  Terminal,
  ShieldCheck,
  Server,
  BellRing,
  BarChart3,
  Sliders,
  Users,
  FileText,
} from 'lucide-react';
import type { Role } from '../../types';

function roleVariant(role: Role): BadgeVariant {
  switch (role) {
    case 'ADMIN':
      return 'purple';
    case 'OPERATOR':
      return 'info';
    case 'VIEWER':
      return 'neutral';
  }
}

const DOMAIN_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  servers: {
    label: 'Servers',
    icon: Server,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/60',
  },
  alerts: {
    label: 'Alerts',
    icon: BellRing,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60',
  },
  reports: {
    label: 'Reports',
    icon: BarChart3,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60',
  },
  thresholds: {
    label: 'Thresholds',
    icon: Sliders,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-800/60',
  },
  audit: {
    label: 'Audit',
    icon: FileText,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-800/60',
  },
  users: {
    label: 'Users',
    icon: Users,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/60',
  },
};

const Card: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode; subtitle?: string }> = ({
  title,
  icon: Icon,
  subtitle,
  children,
}) => (
  <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
    <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800">
      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-600" />
        {title}
      </h3>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const grantedPermissions = useMemo(() => {
    return user
      ? Object.entries(user.permissions)
          .filter(([, v]) => v === true)
          .map(([k]) => k)
          .sort()
      : [];
  }, [user]);

  const domainGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const perm of grantedPermissions) {
      const [domain, action = 'access'] = perm.toLowerCase().split(':');
      const existing = map.get(domain) ?? [];
      if (!existing.includes(action)) existing.push(action);
      map.set(domain, existing);
    }
    return Array.from(map.entries());
  }, [grantedPermissions]);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-600" />
          Settings
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Your profile, appearance, and agent onboarding reference.
        </p>
      </div>

      {/* Profile */}
      <Card title="Profile" icon={UserCircle} subtitle="Read-only — managed by an administrator.">
        {user ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Name</div>
                <div className="mt-0.5 text-gray-800 dark:text-gray-200 font-medium">{user.name}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Email</div>
                <div className="mt-0.5 text-gray-800 dark:text-gray-200 font-mono text-xs truncate">{user.email}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Role</div>
                <div className="mt-1">
                  <Badge variant={roleVariant(user.role)}>{user.role}</Badge>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Permissions
                </span>
                <span className="text-[10px] text-gray-400 font-normal">
                  {grantedPermissions.length} capabilities active
                </span>
              </div>

              {domainGroups.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {domainGroups.map(([domain, actions]) => {
                    const meta = DOMAIN_META[domain] ?? {
                      label: domain,
                      icon: ShieldCheck,
                      color: 'text-gray-600 dark:text-gray-400',
                      bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                    };
                    const Icon = meta.icon;

                    return (
                      <div
                        key={domain}
                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${meta.bg} shadow-2xs hover:shadow-xs transition-all`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 capitalize">
                            {meta.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 pl-1.5 border-l border-gray-300/70 dark:border-gray-700">
                          {actions.map((act) => {
                            const isWrite = act === 'write';
                            return (
                              <span
                                key={act}
                                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  isWrite
                                    ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                                    : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                }`}
                              >
                                {act}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">No permissions granted.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Not signed in.</p>
        )}
      </Card>

      {/* Appearance */}
      <Card title="Appearance" icon={theme === 'dark' ? Moon : Sun} subtitle="Choose how the console looks. Saved to this browser.">
        <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-sm font-semibold">
          <button
            onClick={() => setTheme('light')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
        </div>
      </Card>

      {/* Agent onboarding reference */}
      <Card
        title="Agent onboarding"
        icon={Terminal}
        subtitle="How monitored servers report in. These endpoints are called by agents, not this console."
      >
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Health and verification data comes from a monitoring agent installed on each server — the
            console never pings hosts directly. To onboard a server:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm">
            <li>
              Register the server here (<span className="font-medium">Servers → Add server</span>) with
              “expects a monitoring agent” enabled, and copy the one-time agent token.
            </li>
            <li>Install the agent on the host and configure it with that token.</li>
            <li>
              The agent authenticates and self-registers, then streams health on its own schedule.
              Once the first check-in lands, the server flips from{' '}
              <Badge variant="warning">Pending</Badge> to <Badge variant="success">Verified</Badge>.
            </li>
          </ol>
          <div className="rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 font-mono text-xs text-gray-700 dark:text-gray-300 space-y-1">
            <div>POST /api/v1/agent/register &nbsp;<span className="text-gray-400">— agent bootstraps with its token</span></div>
            <div>POST /api/v1/health &nbsp;<span className="text-gray-400">— agent reports metrics</span></div>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Listed for reference only. For security, these agent routes are not callable from the
            browser — rotate a server's token from its detail page if it is ever compromised.
          </p>
        </div>
      </Card>
    </div>
  );
};
