import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge, BadgeVariant } from '../../components/Common/Badge';
import { Settings as SettingsIcon, Sun, Moon, UserCircle, Terminal, ShieldCheck } from 'lucide-react';
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

  const grantedPermissions = user
    ? Object.entries(user.permissions)
        .filter(([, v]) => v === true)
        .map(([k]) => k)
        .sort()
    : [];

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Name</div>
                <div className="mt-0.5 text-gray-800 dark:text-gray-200">{user.name}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Email</div>
                <div className="mt-0.5 text-gray-800 dark:text-gray-200">{user.email}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Role</div>
                <div className="mt-1">
                  <Badge variant={roleVariant(user.role)}>{user.role}</Badge>
                </div>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Permissions
              </div>
              {grantedPermissions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {grantedPermissions.map((p) => (
                    <Badge key={p} variant="neutral" className="font-mono lowercase">
                      {p}
                    </Badge>
                  ))}
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
