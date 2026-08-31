import React, { useEffect, useState } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AuditLog } from '../../types';
import { History, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

export const AuditLogsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user && (
    user.roleName === 'Admin' ||
    user.roleId === 'role_admin' ||
    user.roleName?.toLowerCase().includes('admin')
  );

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  const fetchLogs = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        search,
        moduleKey: moduleFilter !== 'all' ? moduleFilter : undefined
      });
      setLogs(res.logs || []);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [moduleFilter, isAdmin]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  if (!authLoading && !isAdmin) {
    return (
      <PortalLayout currentModule="audit_logs" title="System Audit Logs">
        <div className="p-8 sm:p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 my-8">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white font-heading">ހުއްދައެއް ނެތް (Access Restricted)</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            ސިސްޓަމް އޮޑިޓް ލޮގްތައް ބެއްލެވޭނީ އެޑްމިނިސްޓްރޭޓަރުންނަށް އެކަނިއެވެ. (System Audit Logs are strictly restricted to Admin users only).
          </p>
          <a
            href="/portal"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            ޑޭޝްބޯޑަށް އެނބުރި ވަޑައިގަންނަވާ
          </a>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout currentModule="audit_logs" title="System Audit Logs">
      <div className="space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-heading text-white">Portal Security Audit Trail</h2>
            <p className="text-xs text-slate-400">Immutable record of all portal actions, authentication events, and administrative updates.</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search user, action, IP..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </form>

          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white w-full md:w-auto"
          >
            <option value="all">All Modules</option>
            <option value="auth">Authentication</option>
            <option value="ramazan_quiz">Ramazan Quiz</option>
            <option value="users">User Management</option>
            <option value="slideshow">Photo Slideshow</option>
            <option value="content">Public Content</option>
          </select>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading security audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
            No audit log entries match the search criteria.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Module</th>
                    <th className="p-3.5">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200 font-mono">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="p-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        {log.fullName} (@{log.username})
                      </td>
                      <td className="p-3.5 font-sans font-medium text-orange-400">{log.action}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 uppercase text-[10px]">
                          {log.module}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">{log.deviceReference || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
};
