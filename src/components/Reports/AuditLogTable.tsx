import React, { useState } from 'react';
import { ShieldCheck, Search, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILED';
}

const mockAuditLogs: AuditRecord[] = [
  {
    id: 'aud-1',
    timestamp: new Date().toISOString(),
    actor: 'admin@govmonitor.ai',
    action: 'SERVER_CREATED',
    target: 'Addis-DataCenter-01',
    ipAddress: '192.168.1.45',
    status: 'SUCCESS',
  },
  {
    id: 'aud-2',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    actor: 'agent_node_02',
    action: 'HEALTH_INGEST',
    target: 'Billing-DB-Server',
    ipAddress: '10.0.4.12',
    status: 'SUCCESS',
  },
  {
    id: 'aud-3',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    actor: 'unknown_agent',
    action: 'UNAUTHORIZED_ACCESS',
    target: 'Auth-Gateway',
    ipAddress: '192.168.1.99',
    status: 'FAILED',
  },
];

export const AuditLogTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = mockAuditLogs.filter(
    (log) =>
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Audit Logs</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            System audit trail, agent operations, and security access activity logs
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter by actor, action, or target..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Actor</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Target Resource</th>
              <th className="px-6 py-4">IP Address</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-400">
                  <span className="inline-flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-200">{log.actor}</td>
                <td className="px-6 py-4 font-mono text-xs text-cyan-400">{log.action}</td>
                <td className="px-6 py-4 text-slate-300">{log.target}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-400">{log.ipAddress}</td>
                <td className="px-6 py-4">
                  {log.status === 'SUCCESS' ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Success
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                      <AlertCircle className="w-3 h-3 mr-1" /> Failed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};