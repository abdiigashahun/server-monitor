// src/pages/Auth/LoginPage.tsx
import React, { useState } from 'react';
import { User, Lock, ChevronDown, Eye, EyeOff, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { UserRole } from '../../types';
import { useMonitoring } from '../../context/MonitoringContext';
import { login } from '../../services/auth';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  let monitoringContext: ReturnType<typeof useMonitoring> | null = null;
  try {
    monitoringContext = useMonitoring();
  } catch (e) {
    monitoringContext = null;
  }

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles: UserRole[] = ['Admin', 'Operator', 'Viewer'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Call real authentication service targeting Render backend
      const loginResponse = await login(username.trim(), password);

      // 2. Extract tokens safely from response
      const token = loginResponse.accessToken || loginResponse.token;
      const refreshToken = loginResponse.refreshToken || token;

      if (token) {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('authToken', token);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      // 3. Determine active role (from backend user profile or fallback to dropdown selection)
      const backendRole = loginResponse.user?.role as UserRole | undefined;
      const activeRole: UserRole = backendRole || selectedRole;
      const activeName = username.trim() || loginResponse.user?.name || `${activeRole} User`;

      localStorage.setItem('userRole', activeRole);

      // 4. Update local monitoring state & audit logs
      if (monitoringContext) {
        monitoringContext.updateUserProfile({
          name: activeName,
          role: activeRole,
        });

        monitoringContext.addAuditLog(
          'User Authentication',
          'Auth Service',
          `User ${activeName} authenticated successfully as [${activeRole}]`
        );
      }

      // 5. Complete login flow
      onLoginSuccess(activeRole);
    } catch (err: any) {
      console.error('Authentication Error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#94A3B8] via-[#CBD5E1] to-[#94A3B8] text-white flex flex-col items-center justify-center p-4 overflow-hidden">
      
      {/* Background Graphic Patterns */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Top Right Role Selector Dropdown */}
      <div className="absolute top-5 right-5 z-20">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#1F2937]/90 backdrop-blur-md border border-slate-700/80 hover:bg-slate-800 rounded-lg text-sm text-gray-200 shadow-lg transition-all cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-[10px]">
              <User className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <span className="font-medium text-xs">{selectedRole}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl py-1 z-30">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Select Profile Role
              </div>
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-medium flex items-center justify-between hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors cursor-pointer ${
                    selectedRole === role ? 'text-cyan-400 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <span>{role}</span>
                  {selectedRole === role && <Shield className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Login Portal Container */}
      <div className="w-full max-w-md space-y-3 z-10">
        
        {/* Brand Header Banner */}
        <div className="bg-[#0F172A]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-2xl">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-bold text-teal-400 text-xs">
            ITDB
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">ITDB Server Monitor</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">
              Innovation & Technology Bureau
            </p>
          </div>
        </div>

        {/* Portal Form Box */}
        <div className="bg-[#0F172A]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="text-center border-b border-slate-800/80 pb-3">
            <h3 className="text-base font-semibold text-slate-200">System Access Portal</h3>
            <p className="text-xs text-cyan-400 mt-1">
              Active Role: <strong className="font-semibold">{selectedRole}</strong>
            </p>
          </div>

          {/* Dynamic Error Notification */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username/Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Username or Email</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Enter name or Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#1E293B] border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-[#1E293B] border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Blue Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                `Sign In as ${selectedRole}`
              )}
            </button>
          </form>

          {/* Links */}
          <div className="text-center space-y-2 pt-1">
            <div>
              <button type="button" className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                Forgot Password?
              </button>
            </div>
            <div>
              <button type="button" className="text-xs text-slate-500 hover:text-slate-400 cursor-pointer">
                Request an Account (Admin Approval Required)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Copyright */}
      <footer className="mt-8 text-xs text-slate-600 z-10 font-medium">
        © 2026 ITDB Server Monitor
      </footer>
    </div>
  );
};