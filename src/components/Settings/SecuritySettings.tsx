import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { ShieldCheck, Lock, Network, AlertOctagon } from 'lucide-react';

export const SecuritySettings: React.FC = () => {
  const { thresholds, updateThresholds } = useMonitoring();

  const [ipRestricted, setIpRestricted] = useState(thresholds.ipRestrictionEnabled);
  const [subnet, setSubnet] = useState(thresholds.allowedSubnet);

  const handleSave = () => {
    updateThresholds({
      ipRestrictionEnabled: ipRestricted,
      allowedSubnet: subnet,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-4 space-y-4 shadow-sm text-xs text-gray-800 dark:text-slate-200 transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-slate-100">
            Security & Network Access Restrictions
          </h3>
        </div>
        <span className="text-gray-500 dark:text-slate-400 font-mono text-[11px] font-semibold">
          Government Network Isolation
        </span>
      </div>

      <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-sm border border-gray-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-1.5">
              <Network className="w-4 h-4 text-blue-600 dark:text-blue-400" /> IP Restriction Filter
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
              Restrict monitoring agent API submissions & portal access strictly to government internal network subnet.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIpRestricted(!ipRestricted)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              ipRestricted ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                ipRestricted ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {ipRestricted && (
          <div className="pt-2 space-y-2">
            <label className="block text-gray-700 dark:text-slate-300 font-bold">
              Allowed Government Subnet CIDR Block
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={subnet}
                onChange={(e) => setSubnet(e.target.value)}
                placeholder="10.200.0.0/16"
                className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-sm px-3 py-1.5 text-gray-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
              />
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 font-bold rounded-sm border border-gray-300 dark:border-slate-600 transition-colors"
              >
                Apply
              </button>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-mono">
              Only requests originating from IPs in CIDR range {subnet} will be accepted by agent REST API.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div className="p-3.5 rounded-sm bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <h5 className="font-bold text-gray-900 dark:text-slate-100 text-xs">HTTPS Agent Encryption</h5>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
              All metrics transmitted using TLS 1.3 encryption with HMAC-SHA256 request signature.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-sm bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h5 className="font-bold text-gray-900 dark:text-slate-100 text-xs">Audit Access Tracking</h5>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
              Every token verification, report export, and threshold change is logged in the Audit Trail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};