import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { AlertCard } from './AlertCard';
import { AlertFilter } from './AlertFilter';
import { AcknowledgeModal } from './AcknowledgeModal';
import { Alert } from '../../types';
import { ShieldAlert, CheckCircle, BellRing } from 'lucide-react';

export const AlertsList: React.FC = () => {
  const { alerts, acknowledgeAlert, resolveAlert } = useMonitoring();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedMetric, setSelectedMetric] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedAlertForAck, setSelectedAlertForAck] = useState<Alert | null>(null);

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
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Active Alerts</span>
            <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white mt-0.5">{activeCount}</div>
          </div>
          <div className="p-2.5 rounded-sm bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <BellRing className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Critical Breaches</span>
            <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-0.5">{criticalCount}</div>
          </div>
          <div className="p-2.5 rounded-sm bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Acknowledged</span>
            <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">{acknowledgedCount}</div>
          </div>
          <div className="p-2.5 rounded-sm bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
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
          <div className="p-12 text-center bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm text-gray-500 dark:text-gray-400 transition-colors">
            <CheckCircle className="w-10 h-10 text-green-500 dark:text-green-400 mx-auto mb-2 opacity-80" />
            <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">No alerts found matching your criteria</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try resetting filters or adjusting search terms.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledgeClick={(a) => setSelectedAlertForAck(a)}
              onResolveClick={(id) => resolveAlert(id)}
            />
          ))
        )}
      </div>

      {/* Acknowledge Modal */}
      <AcknowledgeModal
        alert={selectedAlertForAck}
        onClose={() => setSelectedAlertForAck(null)}
        onConfirm={(id, note) => acknowledgeAlert(id, note)}
      />
    </div>
  );
};
