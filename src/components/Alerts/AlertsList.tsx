// src/components/Alerts/AlertsList.tsx
import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { AlertCard } from './AlertCard';
import { AlertFilter } from './AlertFilter';
import { AcknowledgeModal } from './AcknowledgeModal';
import { Alert, UserRole } from '../../types';
import { ShieldAlert, CheckCircle, BellRing } from 'lucide-react';

interface AlertsListProps {
  userRole?: UserRole;
}

export const AlertsList: React.FC<AlertsListProps> = ({ userRole = 'Viewer' }) => {
  const { alerts, acknowledgeAlert, resolveAlert } = useMonitoring();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedMetric, setSelectedMetric] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedAlertForAck, setSelectedAlertForAck] = useState<Alert | null>(null);

  const isReadOnly = userRole === 'Viewer';

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.serverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.ipAddress.includes(searchQuery) ||
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = selectedSeverity === 'ALL' || alert.severity === selectedSeverity;
    const matchesMetric = selectedMetric === 'ALL' || alert.metric === selectedMetric;
    const matchesStatus = selectedStatus === 'ALL' || alert.status === selectedStatus;

    return matchesSearch && matchesSeverity && matchesMetric && matchesStatus;
  });

  const activeCount = alerts.filter((a) => a.status === 'Active').length;
  const criticalCount = alerts.filter((a) => a.severity === 'Critical' && a.status === 'Active').length;
  const acknowledgedCount = alerts.filter((a) => a.status === 'Acknowledged').length;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSeverity('ALL');
    setSelectedMetric('ALL');
    setSelectedStatus('ALL');
  };

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-3.5 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">
              Active Alerts
            </span>
            <div className="text-2xl font-bold font-mono text-gray-900 dark:text-slate-100 mt-0.5">
              {activeCount}
            </div>
          </div>
          <div className="p-2.5 rounded-sm bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <BellRing className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-3.5 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">
              Critical Breaches
            </span>
            <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-0.5">
              {criticalCount}
            </div>
          </div>
          <div className="p-2.5 rounded-sm bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-3.5 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">
              Acknowledged
            </span>
            <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              {acknowledgedCount}
            </div>
          </div>
          <div className="p-2.5 rounded-sm bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Component */}
      <AlertFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedSeverity={selectedSeverity}
        setSelectedSeverity={setSelectedSeverity}
        selectedMetric={selectedMetric}
        setSelectedMetric={setSelectedMetric}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        onReset={handleResetFilters}
      />

      {/* Alerts Cards List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-sm text-gray-500 dark:text-slate-400 transition-colors">
            <CheckCircle className="w-10 h-10 text-emerald-500 dark:text-emerald-400 mx-auto mb-2 opacity-75" />
            <h4 className="font-semibold text-sm text-gray-800 dark:text-slate-200">
              No alerts found matching your criteria
            </h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Try resetting filters or adjusting search terms.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isReadOnly={isReadOnly}
              onAcknowledgeClick={(a) => !isReadOnly && setSelectedAlertForAck(a)}
              onResolveClick={(id) => !isReadOnly && resolveAlert(id)}
            />
          ))
        )}
      </div>

      {/* Acknowledge Modal */}
      <AcknowledgeModal
        alert={selectedAlertForAck}
        onClose={() => setSelectedAlertForAck(null)}
        onConfirm={(id, note) => {
          if (!isReadOnly) {
            acknowledgeAlert(id, note);
          }
        }}
      />
    </div>
  );
};