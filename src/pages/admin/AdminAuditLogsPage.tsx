import React, { useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { selectAuditLogs } from '../../store/slices/productSlice';
import { AuditLog } from '../../types';
import {
  ScrollText,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  User,
  Activity,
  Download,
  Info,
} from 'lucide-react';
import { Dialog } from '../../components/common/Dialog';

export const AdminAuditLogsPage: React.FC = () => {
  const auditLogs = useAppSelector(selectAuditLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);

  const actions = ['ALL', ...Array.from(new Set(auditLogs.map((log) => log.action)))];

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('UPDATE') || action.includes('EDIT')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const exportLogsAsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
              Audit Logs & Security Trail
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {auditLogs.length} events
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Immutable tracking of administrative actions, catalog changes, order updates, and system operations.
          </p>
        </div>

        <button
          onClick={exportLogsAsJSON}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export JSON Audit Trail</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by actor, action, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-medium shrink-0">Action:</span>
          {actions.slice(0, 5).map((act) => (
            <button
              key={act}
              onClick={() => setSelectedAction(act)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedAction === act
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {act}
            </button>
          ))}
          {actions.length > 5 && (
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              aria-label="Filter audit logs by action"
              className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-xl font-medium focus:outline-none"
            >
              {actions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ScrollText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No audit logs matching query</p>
                    <p className="text-xs text-slate-400">Try adjusting your search criteria</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{log.actor}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {log.resource}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveLog(log)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                        title="View details"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      <Dialog
        isOpen={!!activeLog}
        onClose={() => setActiveLog(null)}
        title="Audit Event Details"
        description="Full immutable security payload and event metadata"
      >
        {activeLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block font-medium">Log ID</span>
                <span className="font-mono font-semibold text-slate-800">{activeLog.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Timestamp</span>
                <span className="text-slate-800 font-medium">
                  {new Date(activeLog.timestamp).toISOString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Authorized Actor</span>
                <span className="text-blue-700 font-semibold">{activeLog.actor}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Operation Target</span>
                <span className="font-mono font-semibold text-slate-800">{activeLog.resource}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-semibold block mb-1.5">Action Summary</span>
              <p className="p-3 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium">
                {activeLog.details}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
