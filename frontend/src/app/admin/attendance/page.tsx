'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceApi, departmentsApi } from '@/lib/api';
import { formatTime, formatDate, getStatusBadge } from '@/lib/utils';
import { Search, Filter, CalendarCheck } from 'lucide-react';

export default function AttendancePage() {
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance-all', date, deptFilter, statusFilter, search],
    queryFn: () =>
      attendanceApi.getAll({
        ...(date && { date }),
        ...(deptFilter && { departmentId: deptFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(search && { search }),
      }).then((r) => r.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll().then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <CalendarCheck className="w-6 h-6" />
        Gestion des Présences
      </h1>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom ou matricule..."
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] w-48"
          />
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
        />
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
        >
          <option value="">Tous les depts</option>
          {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
        >
          <option value="">Tous les statuts</option>
          <option value="PRESENT">Présent</option>
          <option value="LATE">En retard</option>
          <option value="ABSENT">Absent</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : (
          <>
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <span className="text-sm text-gray-500">{records.length} enregistrement(s)</span>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Date', 'Matricule', 'Nom & Prénom', 'Département', 'Arrivée', 'Pause', 'Départ', 'Statut'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((rec: any) => {
                  const { label, color } = getStatusBadge(rec.status);
                  return (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(rec.date)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{rec.employee?.matricule}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{rec.employee?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{rec.employee?.department?.name}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{formatTime(rec.signInAt)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {rec.lunchOutAt ? (
                          <span>
                            {formatTime(rec.lunchOutAt)}
                            {rec.lunchInAt ? ` → ${formatTime(rec.lunchInAt)}` : ' (en cours)'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{formatTime(rec.signOutAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>
                      </td>
                    </tr>
                  );
                })}
                {!records.length && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucun enregistrement pour ce filtre</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
