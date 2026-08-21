import React, { useState, useRef, useEffect } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { Bell, AlertTriangle, CheckCircle, ShieldAlert, Sparkles, X, Activity } from 'lucide-react';
import { formatTimestamp } from '../../utils/formatters';

export const NotificationBell: React.FC = () => {
  const { alerts, acknowledgeAlert, triggerMockAlert } = useMonitoring();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter alerts based on role:
  // Admin sees all alerts + all Operator Action surveillance alerts
  // Operator and User see only standard infrastructure alerts
  const visibleAlerts = alerts.filter((a) => {
    if (a.status !== 'Active') return false;
    const isOperatorActionNotice =
      a.title.includes('Operator Action') ||
      a.title.includes('Issue Resolved') ||
      a.description.includes('Operator') ||
      a.metric === 'Security';

    if (!isAdmin && isOperatorActionNotice) {
      return false;
    }
    return true;
  });

  const criticalCount = visibleAlerts.filter((a) => a.severity === 'Critical').length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
        title="Notifications & Active Alerts"
      >
        <Bell className="w-5 h-5" />
        {visibleAlerts.length > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold text-white bg-rose-600 rounded-full animate-pulse border border-slate-900">
            {visibleAlerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden text-slate-100 animate-in fade-in zoom-in duration-150">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span className="font-semibold text-sm">Notifications & Alerts</span>
              {criticalCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {criticalCount} Critical
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {isAdmin && (
                <button
                  onClick={() => {
                    triggerMockAlert();
                  }}
                  className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 rounded flex items-center gap-1 transition-colors cursor-pointer"
                  title="Simulate incoming alert"
                >
                  <Sparkles className="w-3 h-3" /> Test
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {visibleAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-medium">All systems normal. No active alerts.</p>
              </div>
            ) : (
              visibleAlerts.map((alert) => {
                const isOperatorNotice =
                  alert.title.includes('Operator Action') ||
                  alert.title.includes('Issue Resolved') ||
                  alert.severity === 'Info';

                return (
                  <div
                    key={alert.id}
                    className="p-3 hover:bg-slate-800/40 transition-colors flex items-start gap-3"
                  >
                    <div className="mt-0.5 shrink-0">
                      {alert.severity === 'Critical' ? (
                        <span className="p-1 rounded bg-rose-500/20 text-rose-400 inline-block">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                      ) : isOperatorNotice ? (
                        <span className="p-1 rounded bg-blue-500/20 text-blue-400 inline-block">
                          <Activity className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="p-1 rounded bg-amber-500/20 text-amber-400 inline-block">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-200 truncate flex items-center gap-1.5">
                          <span>{alert.serverName}</span>
                          {isOperatorNotice && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-900/60 text-blue-300 border border-blue-700/60 uppercase">
                              Admin Notice
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatTimestamp(alert.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-300 mt-0.5 line-clamp-1">
                        {alert.title}
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {alert.description}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {alert.ipAddress}
                        </span>
                        {/* Acknowledge button ONLY visible to Admin */}
                        {isAdmin && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-slate-800 bg-slate-950/60 text-center">
            <a
              href="#/alerts-logs"
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 inline-block py-1"
            >
              View All Alerts & Logs &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
