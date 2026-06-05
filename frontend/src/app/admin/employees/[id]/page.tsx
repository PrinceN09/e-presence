'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, leavesApi, holidaysApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft, User, Phone, Mail, Building2, Calendar, Clock,
  CheckCircle2, AlertCircle, XCircle, Coffee, Plane, Stethoscope,
  Baby, Briefcase, UserCheck, Plus, X, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

const LEAVE_TYPES = [
  { value: 'MATERNITY', label: 'Congé maternité', icon: Baby,       color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'SICK',      label: 'Congé maladie',   icon: Stethoscope, color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'PERSONAL',  label: 'Congé personnel', icon: UserCheck,   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'VACATION',  label: 'Congé annuel',    icon: Plane,       color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'MISSION',   label: 'Mission / Déplacement', icon: Briefcase, color: 'bg-amber-100 text-amber-700 border-amber-200' },
];

const leaveStyle = (type: string) => LEAVE_TYPES.find((t) => t.value === type) ?? LEAVE_TYPES[2];

function StatusBadge({ status }: { status: string }) {
  if (status === 'PRESENT') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" />Présent</span>;
  if (status === 'LATE')    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><AlertCircle className="w-3 h-3" />En retard</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" />Absent</span>;
}

function lunchDuration(out?: string | null, inn?: string | null) {
  if (!out || !inn) return null;
  const mins = differenceInMinutes(new Date(inn), new Date(out));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

function fmt(t?: string | null) {
  if (!t) return '—';
  return format(new Date(t), 'HH:mm');
}

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'VACATION', startDate: '', endDate: '', reason: '' });
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['employee-profile', id],
    queryFn: () => attendanceApi.employeeProfile(id).then((r) => r.data),
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['employee-leaves', id],
    queryFn: () => leavesApi.getByEmployee(id).then((r) => r.data),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => holidaysApi.getAll().then((r) => r.data),
  });

  const adminCreateLeave = useMutation({
    mutationFn: () => leavesApi.adminCreate({ ...leaveForm, employeeId: id }),
    onSuccess: () => {
      toast.success('Congé enregistré');
      qc.invalidateQueries({ queryKey: ['employee-leaves', id] });
      setShowLeaveForm(false);
      setLeaveForm({ type: 'VACATION', startDate: '', endDate: '', reason: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const reviewLeave = useMutation({
    mutationFn: ({ leaveId, status }: { leaveId: string; status: 'APPROVED' | 'REJECTED' }) =>
      leavesApi.review(leaveId, status, reviewNote[leaveId]),
    onSuccess: () => {
      toast.success('Demande traitée');
      qc.invalidateQueries({ queryKey: ['employee-leaves', id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const deleteLeave = useMutation({
    mutationFn: (leaveId: string) => leavesApi.remove(leaveId),
    onSuccess: () => { toast.success('Congé supprimé'); qc.invalidateQueries({ queryKey: ['employee-leaves', id] }); },
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">Chargement...</div>;
  if (!profile) return <div className="p-8 text-center text-red-400">Employé introuvable</div>;

  const { employee, attendances } = profile;

  // Build a set of holiday dates for quick lookup
  const holidayMap = new Map<string, string>();
  for (const h of (holidays as any[])) {
    const hd = new Date(h.date);
    // recurring: match by month+day for current year
    if (h.recurring) {
      const key = `${new Date().getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
      holidayMap.set(key, h.name);
    } else {
      holidayMap.set(hd.toISOString().split('T')[0], h.name);
    }
  }

  // Build leave map: date string → leave
  const leaveMap = new Map<string, any>();
  for (const lr of (leaveRequests as any[]).filter((l: any) => l.status === 'APPROVED')) {
    const start = new Date(lr.startDate);
    const end = new Date(lr.endDate);
    const cur = new Date(start);
    while (cur <= end) {
      leaveMap.set(cur.toISOString().split('T')[0], lr);
      cur.setDate(cur.getDate() + 1);
    }
  }

  const pending = (leaveRequests as any[]).filter((l: any) => l.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      {/* Employee card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2E5090] p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
              {employee.name?.[0]}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{employee.name}</h1>
              <p className="text-blue-200 text-sm mt-0.5">{employee.matricule} · {employee.grade} {employee.gradeLabel ? `— ${employee.gradeLabel}` : ''}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1.5 text-blue-200"><Building2 className="w-3.5 h-3.5" />{employee.department?.name}</span>
                {employee.phone && <span className="flex items-center gap-1.5 text-blue-200"><Phone className="w-3.5 h-3.5" />{employee.phone}</span>}
                {employee.email && <span className="flex items-center gap-1.5 text-blue-200"><Mail className="w-3.5 h-3.5" />{employee.email}</span>}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${employee.isActive ? 'bg-green-400/20 text-green-200' : 'bg-gray-400/20 text-gray-300'}`}>
              {employee.isActive ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>

        {/* Stats row */}
        {attendances.length > 0 && (() => {
          const total = attendances.length;
          const present = attendances.filter((a: any) => a.status === 'PRESENT').length;
          const late    = attendances.filter((a: any) => a.status === 'LATE').length;
          const absent  = attendances.filter((a: any) => a.status === 'ABSENT').length;
          return (
            <div className="grid grid-cols-4 divide-x border-t">
              {[
                { label: 'Total jours', value: total, color: 'text-gray-800' },
                { label: 'Présent', value: present, color: 'text-green-600' },
                { label: 'En retard', value: late, color: 'text-yellow-600' },
                { label: 'Absent', value: absent, color: 'text-red-500' },
              ].map((s) => (
                <div key={s.label} className="px-6 py-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Attendance history */}
        <div className="xl:col-span-2 space-y-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1E3A5F]" />
            Historique de présence
          </h2>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {attendances.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Aucun historique</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Date', 'Statut', 'Entrée', 'Sortie', 'Déjeuner', 'Durée totale'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(attendances as any[]).map((rec: any) => {
                    const dateKey = new Date(rec.date).toISOString().split('T')[0];
                    const holiday = holidayMap.get(dateKey);
                    const leave   = leaveMap.get(dateKey);
                    const lunch   = lunchDuration(rec.lunchOutAt, rec.lunchInAt);
                    const totalMins = rec.signInAt && rec.signOutAt
                      ? differenceInMinutes(new Date(rec.signOutAt), new Date(rec.signInAt))
                      : null;
                    const totalDur = totalMins != null
                      ? `${Math.floor(totalMins / 60)}h${String(totalMins % 60).padStart(2, '0')}`
                      : '—';

                    return (
                      <tr key={rec.id} className={`hover:bg-gray-50 ${holiday ? 'bg-blue-50/50' : leave ? 'bg-amber-50/50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 capitalize">
                            {format(new Date(rec.date), 'EEE dd MMM', { locale: fr })}
                          </div>
                          {holiday && <div className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">🎉 {holiday}</div>}
                          {leave && !holiday && (
                            <div className={`text-xs mt-0.5 flex items-center gap-1 px-1.5 py-0.5 rounded ${leaveStyle(leave.type).color}`}>
                              {leave.type === 'MATERNITY' ? '🤱' : leave.type === 'SICK' ? '🏥' : leave.type === 'VACATION' ? '✈️' : leave.type === 'MISSION' ? '💼' : '👤'} {leaveStyle(leave.type).label}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {holiday ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">🏖 Férié</span>
                          ) : leave ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${leaveStyle(leave.type).color}`}>Congé</span>
                          ) : (
                            <StatusBadge status={rec.status} />
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-700">{fmt(rec.signInAt)}</td>
                        <td className="px-4 py-3 font-mono text-gray-700">{fmt(rec.signOutAt)}</td>
                        <td className="px-4 py-3">
                          {lunch ? (
                            <span className="flex items-center gap-1 text-gray-600">
                              <Coffee className="w-3.5 h-3.5 text-amber-500" />
                              {lunch}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{totalDur}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Leaves panel */}
        <div className="space-y-4">
          {/* Pending approvals */}
          {pending.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {pending.length} demande{pending.length > 1 ? 's' : ''} en attente
              </h3>
              {pending.map((lr: any) => {
                const style = leaveStyle(lr.type);
                return (
                  <div key={lr.id} className="bg-white rounded-xl border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${style.color}`}>{style.label}</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {format(new Date(lr.startDate), 'dd MMM', { locale: fr })} → {format(new Date(lr.endDate), 'dd MMM yyyy', { locale: fr })}
                    </p>
                    {lr.reason && <p className="text-xs text-gray-500 italic">"{lr.reason}"</p>}
                    <input
                      placeholder="Note admin (optionnel)"
                      value={reviewNote[lr.id] || ''}
                      onChange={(e) => setReviewNote((n) => ({ ...n, [lr.id]: e.target.value }))}
                      className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => reviewLeave.mutate({ leaveId: lr.id, status: 'APPROVED' })}
                        className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                      >✓ Approuver</button>
                      <button
                        onClick={() => reviewLeave.mutate({ leaveId: lr.id, status: 'REJECTED' })}
                        className="flex-1 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600"
                      >✗ Refuser</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Leave history + add */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Congés &amp; Absences</h3>
              <button
                onClick={() => setShowLeaveForm(!showLeaveForm)}
                className="flex items-center gap-1 text-xs text-[#1E3A5F] border border-[#1E3A5F] px-2 py-1 rounded-lg hover:bg-blue-50"
              >
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>

            {/* Add leave form */}
            {showLeaveForm && (
              <div className="border border-[#1E3A5F]/20 bg-blue-50 rounded-xl p-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Type de congé</label>
                  <select
                    value={leaveForm.type}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                  >
                    {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Du</label>
                    <input type="date" value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm((f) => ({ ...f, startDate: e.target.value }))}
                      className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Au</label>
                    <input type="date" value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Motif (optionnel)</label>
                  <input value={leaveForm.reason}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                    placeholder="Raison du congé"
                    className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowLeaveForm(false)} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded-lg bg-white">Annuler</button>
                  <button
                    onClick={() => adminCreateLeave.mutate()}
                    disabled={adminCreateLeave.isPending || !leaveForm.startDate || !leaveForm.endDate}
                    className="flex-1 py-1.5 bg-[#1E3A5F] text-white rounded-lg text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {adminCreateLeave.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Enregistrer
                  </button>
                </div>
              </div>
            )}

            {/* Leave list */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(leaveRequests as any[]).length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-4">Aucun congé enregistré</p>
              ) : (
                (leaveRequests as any[]).map((lr: any) => {
                  const style = leaveStyle(lr.type);
                  const Icon = style.icon;
                  return (
                    <div key={lr.id} className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs ${
                      lr.status === 'APPROVED' ? style.color :
                      lr.status === 'REJECTED' ? 'bg-gray-50 text-gray-400 border-gray-200 line-through' :
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{style.label}</p>
                        <p className="opacity-75">
                          {format(new Date(lr.startDate), 'dd MMM', { locale: fr })} → {format(new Date(lr.endDate), 'dd MMM yyyy', { locale: fr })}
                        </p>
                        {lr.reason && <p className="italic opacity-60 truncate">"{lr.reason}"</p>}
                        <p className="mt-0.5 font-medium">
                          {lr.status === 'APPROVED' ? '✓ Approuvé' : lr.status === 'REJECTED' ? '✗ Refusé' : '⏳ En attente'}
                        </p>
                      </div>
                      <button onClick={() => { if (confirm('Supprimer ce congé ?')) deleteLeave.mutate(lr.id); }}
                        className="text-current opacity-40 hover:opacity-100 p-0.5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
