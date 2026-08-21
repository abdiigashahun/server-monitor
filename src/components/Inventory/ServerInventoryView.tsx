import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { getHealthBadgeClass } from '../../utils/formatters';
import { Server, Search, Plus, Edit, Trash2, X, Check, Activity, Shield, Lock, Eye } from 'lucide-react';
import { Server as ServerType, ServerType as SType, OS, CriticalityLevel } from '../../types';

export const ServerInventoryView: React.FC = () => {
  const {
    servers,
    addServer,
    deleteServer,
    updateServer,
    addAuditLog,
    runPingTest,
    dataCenters,
    selectedDataCenter,
  } = useMonitoring();

  const { user, hasPermission } = useAuth();
  const canManageServers = user?.role === 'Admin' || hasPermission('canAddServer');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedOS, setSelectedOS] = useState('ALL');
  const [selectedDc, setSelectedDc] = useState('ALL');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerType | null>(null);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    ipAddress: '',
    type: 'Application' as SType,
    os: 'Linux' as OS,
    department: 'Ministry of Innovation & Tech',
    location: 'DC-01 - Addis Ababa Central DC',
    criticality: 'Medium' as CriticalityLevel,
    owner: 'SysAdmin Group',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      ipAddress: '',
      type: 'Application',
      os: 'Linux',
      department: 'Ministry of Innovation & Tech',
      location: 'DC-01 - Addis Ababa Central DC',
      criticality: 'Medium',
      owner: 'SysAdmin Group',
    });
  };

  const handleOpenAddModal = () => {
    if (!canManageServers) return;
    resetForm();
    setIsAddModalOpen(true);
    addAuditLog('Open Modal', 'Server Inventory', 'Opened Add New Server dialog');
  };

  const handleOpenEditModal = (server: ServerType) => {
    if (!canManageServers) return;
    setEditingServer(server);
    setFormData({
      name: server.name,
      ipAddress: server.ipAddress,
      type: server.type,
      os: server.os,
      department: server.department,
      location: server.location,
      criticality: server.criticality,
      owner: server.owner,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageServers) return;
    if (!formData.name.trim() || !formData.ipAddress.trim()) return;

    if (editingServer) {
      updateServer(editingServer.id, formData);
      setEditingServer(null);
    } else {
      addServer(formData);
      setIsAddModalOpen(false);
    }
    resetForm();
  };

  const handleDeleteConfirm = (id: string) => {
    if (!canManageServers) return;
    deleteServer(id);
    setDeletingServerId(null);
  };

  const activeDcFilter = selectedDc !== 'ALL' ? selectedDc : selectedDataCenter;

  const filteredServers = servers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.ipAddress.includes(search) ||
      s.department.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()) ||
      s.owner.toLowerCase().includes(search.toLowerCase());
    const matchesOS = selectedOS === 'ALL' || s.os === selectedOS;
    const matchesDc =
      activeDcFilter === 'ALL' ||
      s.location.includes(activeDcFilter) ||
      (dataCenters.find((d) => d.id === activeDcFilter)?.name && s.location.includes(dataCenters.find((d) => d.id === activeDcFilter)!.name));

    return matchesSearch && matchesOS && matchesDc;
  });

  return (
    <div className="space-y-4 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Header Bar */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-sm bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">Server Inventory Management</h2>
              {!canManageServers && (
                <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 uppercase border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-Only
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              {canManageServers
                ? 'Add, edit, remove, and monitor critical infrastructure across all 10 Data Centers'
                : 'Live server telemetry, network health, and diagnostic ping monitoring (Server modifications restricted to Admin)'}
            </p>
          </div>
        </div>

        {canManageServers ? (
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm flex items-center gap-1.5 transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Server
          </button>
        ) : (
          <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-sm text-xs font-mono flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>Admin Required to Add Server</span>
          </div>
        )}
      </div>

      {/* Non-Admin Notice Banner */}
      {!canManageServers && (
        <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 px-4 py-2.5 rounded-sm flex items-center gap-2.5 text-xs">
          <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Read-Only Mode Active:</strong> You are logged in as <strong>{user?.role || 'Operator'}</strong> ({user?.name}). Server creation, editing, and de-registration are restricted exclusively to Super Administrators.
          </span>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by server name, IP address, department, location, owner..."
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm pl-9 pr-3 py-1.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600 dark:text-gray-400 font-bold">Data Center:</span>
            <select
              value={selectedDc}
              onChange={(e) => setSelectedDc(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600 cursor-pointer font-mono"
            >
              <option value="ALL">All 10 Facilities</option>
              {dataCenters.map((dc) => (
                <option key={dc.id} value={dc.id}>
                  {dc.id} - {dc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-600 dark:text-gray-400 font-bold">OS Type:</span>
            <select
              value={selectedOS}
              onChange={(e) => setSelectedOS(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Operating Systems</option>
              <option value="Linux">Linux (psutil)</option>
              <option value="Windows">Windows (WMI / PowerShell)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Server Table */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="p-2.5">Server Name</th>
                <th className="p-2.5">IP Address</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">OS</th>
                <th className="p-2.5">Department / Location</th>
                <th className="p-2.5">Owner</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredServers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No servers found matching "{search}".
                  </td>
                </tr>
              ) : (
                filteredServers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="p-2.5 font-mono font-bold text-gray-900 dark:text-white">
                      {s.name}
                      <span className="block text-[9px] font-normal text-gray-400">ID: {s.id}</span>
                    </td>
                    <td className="p-2.5 font-mono text-gray-600 dark:text-gray-300">{s.ipAddress}</td>
                    <td className="p-2.5 text-gray-700 dark:text-gray-300">{s.type}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-mono text-[10px] font-semibold">
                        {s.os}
                      </span>
                    </td>
                    <td className="p-2.5 text-gray-700 dark:text-gray-300">
                      <div className="font-medium">{s.department}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500">{s.location}</div>
                    </td>
                    <td className="p-2.5 text-gray-700 dark:text-gray-300">{s.owner}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${getHealthBadgeClass(s.healthStatus)}`}>
                        {s.healthStatus}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => runPingTest(s.id)}
                          className="px-2 py-1 text-[10px] bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-sm font-bold cursor-pointer"
                        >
                          Ping
                        </button>
                        {canManageServers && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(s)}
                              className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-sm transition-colors cursor-pointer"
                              title="Edit Server Details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingServerId(s.id)}
                              className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-sm transition-colors cursor-pointer"
                              title="Delete Server"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Server Modal */}
      {(isAddModalOpen || editingServer) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                  {editingServer ? `Edit Server (${editingServer.name})` : 'Register New Government Server'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingServer(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                    Server Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. srv-gov-fin-04"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                    IP Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10.200.4.18"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                    Server Role / Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as SType })}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Application">Application Server</option>
                    <option value="Database">Database Server</option>
                    <option value="Web">Web Front-end</option>
                    <option value="File">File Storage / NAS</option>
                    <option value="DNS">DNS Gateway</option>
                    <option value="Mail">Mail Transfer Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                    Operating System
                  </label>
                  <select
                    value={formData.os}
                    onChange={(e) => setFormData({ ...formData, os: e.target.value as OS })}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Linux">Linux (RHEL / Ubuntu / Rocky)</option>
                    <option value="Windows">Windows Server (2019 / 2022)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                    Department / Ministry
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ministry of Innovation"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                    Data Center / Facility
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600 cursor-pointer font-mono"
                  >
                    {dataCenters.map((dc) => (
                      <option key={dc.id} value={`${dc.id} - ${dc.name}`}>
                        {dc.id} - {dc.name} ({dc.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                    Owner / Administrator
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SysAdmin Team A"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingServer(null);
                  }}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-sm font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> {editingServer ? 'Save Changes' : 'Register Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Server Confirmation Modal */}
      {deletingServerId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-5 max-w-md w-full shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Confirm Server De-registration
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-xs">
              Are you sure you want to remove this server from active government ITDB monitoring? This will stop telemetry logging and telemetry heartbeat collection.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingServerId(null)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-sm font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingServerId)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-sm font-bold cursor-pointer"
              >
                Delete Server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

