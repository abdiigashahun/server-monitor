import React from 'react';
import { AlertSeverity, AlertStatus } from '../../types';
import { Search, Filter, RefreshCw } from 'lucide-react';

interface AlertFilterProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedSeverity: string;
  setSelectedSeverity: (s: string) => void;
  selectedMetric: string;
  setSelectedMetric: (m: string) => void;
  selectedStatus: string;
  setSelectedStatus: (st: string) => void;
  onReset: () => void;
}

export const AlertFilter: React.FC<AlertFilterProps> = ({
  searchQuery,
  setSearchQuery,
  selectedSeverity,
  setSelectedSeverity,
  selectedMetric,
  setSelectedMetric,
  selectedStatus,
  setSelectedStatus,
  onReset,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-3.5 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs transition-colors">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by server name, IP address, or title..."
          className="w-full bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-sm pl-9 pr-3 py-1.5 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-gray-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Severity */}
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">All Severities</option>
          <option value="Critical" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Critical</option>
          <option value="Warning" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Warning</option>
          <option value="Info" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Info</option>
        </select>

        {/* Metric */}
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">All Metrics</option>
          <option value="CPU" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">CPU Usage</option>
          <option value="Disk" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Disk Usage</option>
          <option value="Memory" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Memory</option>
          <option value="Backup" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Backup Failure</option>
          <option value="Network" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Network</option>
        </select>

        {/* Status */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">All Statuses</option>
          <option value="Active" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Active Only</option>
          <option value="Acknowledged" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Acknowledged</option>
          <option value="Resolved" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Resolved</option>
        </select>

        <button
          onClick={onReset}
          className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-sm border border-gray-200 dark:border-slate-700 transition-colors"
          title="Reset filters"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};