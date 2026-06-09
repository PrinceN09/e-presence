'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceApi, departmentsApi } from '@/lib/api';
import { formatTime, formatDate, getStatusBadge } from '@/lib/utils';
import { Search, CalendarCheck, Clock, TrendingUp, AlertCircle } from 'lucide-react';

const STANDARD_HOURS = 8;

function calcHours(
  signIn: string | null,
  signOut: string | null,
  lunchOut: string | null,
  lunchIn: string | null,
): number | null {
  if (!signIn || !signOut) return null;
  let ms = new Date(signOut).getTime() - new Date(signIn).getTime();
  if (lunchOut && lunchIn) ms -= new Date(lunchIn).getTime() - new Date(lunchOut).getTime();
  return Math.max(0, ms / 3_600_000);
}

function fmtHours(h: number | null): string {
  if (h === null) return '—';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h${mm.toString().padStart(2, '0')}`;
}

function getWeekRange(ref: Date) {
  const d = new Date(ref);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().split('T')[0], end: sun.toISOString().split('T')[0] };
}

function getMonthRange(ref: Date) {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

type PeriodMode = 'day' | 'week' | 'month' | 'custom';

export default function AttendancePage() {
  const today = new Date().toISOString().split('T')[0];
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mode, setMode] = useState<PeriodMode>('day');
  const [singleDate, setSingleDate] = useState(today);
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  // Derive query dates from mode
  const queryDates = useMemo(() => {
    const ref = new Date(singleDate);
    if (mode === 'day') return { date: singleDate };
    if (mode === 'week') {
      const { start, end } = getWeekRange(ref);
      return { startDate: start, endDate: end };
    }
    if (mode === 'month') {
      const { start, end } = getMonthRange(ref);
      return { startDate: start, endDate: end };
    }
    return { startDate: customStart, endDate: customEnd };
  }, [mode, singleDate, customStart, customEnd]);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance-all', queryDates, deptFilter, statusFilter, search],
    queryFn: () =>
      attendanceApi.getAll({
        ...queryDates,
        ...(deptFilter && { departmentId: deptFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(search && { search }),
      }).then((r) => r.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll().then((r) => r.data),
  });

  // Per-row hours
  const recordsWithHours = useMemo(
    () =>
      records.map((rec: any) => ({
        ...rec,
        hours: calcHours(rec.signInAt, rec.signOutAt, rec.lunchOutAt, rec.lunchInAt),
      })),
    [records],
  );

  // Summary (only meaningful when searching a specific employee or small result set)
  const summary = useMemo(() => {
    const withHours = recordsWithHours.filter((r: any) => r.hours !== null);
    const totalHours = withHours.reduce((s: number, r: any) => s + r.hours, 0);
    const workDays = recordsWithHours.filter(
      (r: any) => r.status === 'PRESENT' || r.status === 'LATE',
    ).length;
    const expectedHours = workDays * STANDARD_HOURS;
    const overtime = Math.max(0, totalHours - expectedHours);
    const avgPerDay = workDays > 0 ? totalHours / workDays : 0;
    return { totalHours, expectedHours, overtime, avgPerDay, workDays };
  }, [recordsWithHours]);

  const modeLabel = (m: PeriodMode) =>
    ({ day: 'Jour', week: 'Semaine', month: 'Mois', custom: 'Période' }[m]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <CalendarCheck className="w-6 h-6" />
        Gestion des Présences
      </h1>

      {/* Period mode tabs */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(['day', 'week', 'month', 'custom'] as PeriodMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {modeLabel(m)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Date pickers */}
          {mode === 'day' && (
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          )}
          {mode === 'week' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Semaine du</span>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
              {(() => {
                const { start, end } = getWeekRange(new Date(singleDate));
                return <span className="text-gray-400">{start} → {end}</span>;
              })()}
            </div>
          )}
          {mode === 'month' && (
            <input
              type="month"
              value={singleDate.slice(0, 7)}
              onChange={(e) => setSingleDate(`${e.target.value}-01`)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          )}
          {mode === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
          )}

          {/* Search & filters */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom ou matricule..."
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] w-48"
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
          >
            <option value="">Tous les depts</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
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
      </div>

      {/* Summary cards — shown when there are records with hours */}
      {recordsWithHours.some((r: any) => r.hours !== null) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <Clock className="w-8 h-8 text-[#1E3A5F] shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Heures travaillées</p>
              <p className="text-xl font-bold text-gray-800">{fmtHours(summary.totalHours)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <CalendarCheck className="w-8 h-8 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Heures attendues</p>
              <p className="text-xl font-bold text-gray-800">{fmtHours(summary.expectedHours)}</p>
              <p className="text-xs text-gray-400">{summary.workDays} jour(s) × {STANDARD_HOURS}h</p>
            </div>
          </div>
          <div className={`rounded-2xl p-4 shadow-sm flex items-center gap-3 ${summary.overtime > 0 ? 'bg-amber-50' : 'bg-white'}`}>
            <TrendingUp className={`w-8 h-8 shrink-0 ${summary.overtime > 0 ? 'text-amber-500' : 'text-gray-300'}`} />
            <div>
              <p className="text-xs text-gray-500">Heures sup.</p>
              <p className={`text-xl font-bold ${summary.overtime > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {fmtHours(summary.overtime)}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Moy. / jour</p>
              <p className="text-xl font-bold text-gray-800">{fmtHours(summary.avgPerDay)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : (
          <>
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <span className="text-sm text-gray-500">{records.length} enregistrement(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Date', 'Matricule', 'Nom & Prénom', 'Département', 'Arrivée', 'Pause', 'Départ', 'Durée', 'H. Sup.', 'Statut'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recordsWithHours.map((rec: any) => {
                    const { label, color } = getStatusBadge(rec.status);
                    const ot = rec.hours !== null ? Math.max(0, rec.hours - STANDARD_HOURS) : null;
                    return (
                      <tr key={rec.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(rec.date)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{rec.employee?.matricule}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{rec.employee?.name}</td>
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
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-700">{fmtHours(rec.hours)}</td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {ot !== null && ot > 0 ? (
                            <span className="text-amber-600 font-semibold">+{fmtHours(ot)}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {!records.length && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                        Aucun enregistrement pour ce filtre
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
