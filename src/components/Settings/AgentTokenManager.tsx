import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { Key, RefreshCw, Copy, Check, Terminal, Shield, Lock } from 'lucide-react';

export const AgentTokenManager: React.FC = () => {
  const { servers, generateAgentToken } = useMonitoring();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [selectedServerId, setSelectedServerId] = useState<string>(servers[0]?.id || '');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeServer = servers.find((s) => s.id === selectedServerId);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 space-y-4 shadow-sm text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">Server Agent Token Management</h3>
          {!isAdmin && (
            <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 uppercase border border-amber-200 dark:border-amber-800 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Read-Only
            </span>
          )}
        </div>
        <span className="text-gray-500 dark:text-gray-400 text-[11px] font-mono font-bold">Bearer Authorization</span>
      </div>

      <p className="text-gray-700 dark:text-gray-300">
        Each Linux (<code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">psutil</code>) or Windows (<code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">WMI/PowerShell</code>) server monitoring agent uses a unique Bearer token to send health metrics via <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">POST /api/v1/health</code> every 60 seconds.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Server Select Dropdown */}
        <div>
          <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1.5">Target Server</label>
          <select
            value={selectedServerId}
            onChange={(e) => setSelectedServerId(e.target.value)}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm p-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600 font-mono cursor-pointer"
          >
            {servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.ipAddress}) - {s.os}
              </option>
            ))}
          </select>
        </div>

        {/* Current Active Token display */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1.5">
            Active Agent Token
          </label>
          {activeServer ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={activeServer.agentToken}
                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm p-2 text-blue-700 dark:text-blue-400 font-mono font-bold tracking-wider focus:outline-none"
              />

              <button
                onClick={() => handleCopy(activeServer.agentToken, 'token')}
                className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-sm border border-gray-300 dark:border-gray-600 transition-colors flex items-center gap-1 shrink-0 font-semibold cursor-pointer"
                title="Copy token"
              >
                {copiedId === 'token' ? <Check className="w-4 h-4 text-green-600 dark:text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {isAdmin && (
                <button
                  onClick={() => generateAgentToken(activeServer.id)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm transition-colors flex items-center gap-1 shrink-0 font-bold cursor-pointer"
                  title="Regenerate token"
                >
                  <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
              )}
            </div>
          ) : (
            <div className="text-gray-400 italic p-2">Select a server to manage tokens.</div>
          )}
        </div>
      </div>

      {/* Code Snippet Example for Agent Script setup */}
      {activeServer && (
        <div className="mt-4 bg-gray-900 text-gray-100 p-3.5 rounded-sm border border-gray-800 font-mono text-[11px] space-y-2">
          <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Terminal className="w-3.5 h-3.5" /> Agent HTTP POST Payload Template ({activeServer.os})
            </span>
            <button
              onClick={() =>
                handleCopy(
                  `curl -X POST https://itdb-monitor.internal/api/v1/health \\\n  -H "Authorization: Bearer ${activeServer.agentToken}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"serverId": "${activeServer.id}", "cpuUsage": ${activeServer.cpuUsage}, "memoryUsage": ${activeServer.memoryUsage}, "diskUsage": ${activeServer.diskUsage}}'`,
                  'curl'
                )
              }
              className="text-gray-400 hover:text-white flex items-center gap-1"
            >
              {copiedId === 'curl' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />} Copy cURL
            </button>
          </div>

          <pre className="text-gray-200 overflow-x-auto whitespace-pre p-1">
{`curl -X POST https://itdb-monitor.internal/api/v1/health \\
  -H "Authorization: Bearer ${activeServer.agentToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "serverId": "${activeServer.id}",
    "cpuUsage": ${activeServer.cpuUsage},
    "memoryUsage": ${activeServer.memoryUsage},
    "diskUsage": ${activeServer.diskUsage},
    "uptime": ${activeServer.uptimeDays},
    "networkStatus": "${activeServer.networkStatus}",
    "backupStatus": "${activeServer.backupStatus}"
  }'`}
          </pre>
        </div>
      )}
    </div>
  );
};
