'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api';
import { Shield, Search, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE_EMPLOYEE:    { label: 'Création employé',      color: 'bg-green-100 text-green-700' },
  UPDATE_EMPLOYEE:    { label: 'Modif. employé',        color: 'bg-blue-100 text-blue-700' },
  DELETE_EMPLOYEE:    { label: 'Suppression employé',   color: 'bg-red-100 text-red-700' },
  ACTIVATE_EMPLOYEE:  { label: 'Activation',            color: 'bg-emerald-100 text-emerald-700' },
  DEACTIVATE_EMPLOYEE:{ label: 'Désactivation',         color: 'bg-orange-100 text-orange-700' },
  IMPORT_EMPLOYEES:   { label: 'Import Excel',          color: 'bg-purple-100 text-purple-700' },
  LEAVE_APPROVED:     { label: 'Congé approuvé',        color: 'bg-teal-100 text-teal-700' },
  LEAVE_REJECTED:     { label: 'Congé refusé',          color: 'bg-rose-100 text-rose-700' },
  UPDATE_SETTINGS:    { label: 'Paramètres modifiés',   color: 'bg-yellow-100 text-yellow-700' },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AuditPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await auditApi.downloadPdf({
        ...(from && { from }),
        ...(to && { to }),
        ...(actionFilter && { action: actionFilter }),
      });
      toast.success('Rapport téléchargé');
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setDownloading(false);
    }
  };

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', from, to, actionFilter],
    queryFn: () =>
      auditApi.getAll({
        ...(from && { from }),
        ...(to && { to }),
        ...(actionFilter && { action: actionFilter }),
        limit: 300,
      }).then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Journal d'audit
        </h1>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-xl text-sm font-medium hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          Exporter PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          >
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Du</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
          <span>au</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        {(from || to || actionFilter) && (
          <button
            onClick={() => { setFrom(''); setTo(''); setActionFilter(''); }}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : (
          <>
            <div className="px-4 py-3 bg-gray-50 border-b">
              <span className="text-sm text-gray-500 dark:text-gray-400">{logs.length} entrée(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                  <tr>
                    {['Date & Heure', 'Action', 'Entité', 'Effectué par', 'Détails'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {logs.map((log: any) => {
                    const badge = ACTION_LABELS[log.action] ?? { label: log.action, color: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm font-mono text-gray-600 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{log.entity}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {log.admin ? (
                            <span>
                              {log.admin.name}
                              <span className="text-gray-400 text-xs ml-1">({log.admin.matricule})</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">Système</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {!logs.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        Aucune entrée dans le journal
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
