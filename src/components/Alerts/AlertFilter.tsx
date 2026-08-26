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
    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs transition-colors">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by server name, IP address, or title..."
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm pl-9 pr-3 py-1.5 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Severity */}
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-gray-100 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="ALL">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="Warning">Warning</option>
          <option value="Info">Info</option>
        </select>

        {/* Metric */}
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-gray-100 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="ALL">All Metrics</option>
          <option value="CPU">CPU Usage</option>
          <option value="Disk">Disk Usage</option>
          <option value="Memory">Memory</option>
          <option value="Backup">Backup Failure</option>
          <option value="Network">Network</option>
        </select>

        {/* Status */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-gray-100 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="Resolved">Resolved</option>
        </select>

        <button
          onClick={onReset}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-sm border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
          title="Reset filters"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
