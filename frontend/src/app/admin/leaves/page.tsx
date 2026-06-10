'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leavesApi } from '@/lib/api';
import { toast } from 'sonner';
import { ClipboardList, CheckCircle2, XCircle, Clock, Baby, Stethoscope, UserCheck, Plane, Briefcase, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

const LEAVE_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  MATERNITY: { label: 'Congé maternité',      icon: Baby,        color: 'bg-pink-100 text-pink-700 border-pink-200' },
  SICK:      { label: 'Congé maladie',         icon: Stethoscope, color: 'bg-red-100 text-red-700 border-red-200' },
  PERSONAL:  { label: 'Congé personnel',       icon: UserCheck,   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  VACATION:  { label: 'Congé annuel',          icon: Plane,       color: 'bg-sky-100 text-sky-700 border-sky-200' },
  MISSION:   { label: 'Mission / Déplacement', icon: Briefcase,   color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export default function LeavesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('PENDING');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['admin-leaves', filter],
    queryFn: () => leavesApi.getAll(filter || undefined).then((r) => r.data),
  });

  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      leavesApi.review(id, status, notes[id]),
    onSuccess: (_, { status }) => {
      toast.success(status === 'APPROVED' ? 'Congé approuvé ✓' : 'Congé refusé');
      qc.invalidateQueries({ queryKey: ['admin-leaves'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const FILTERS = [
    { value: 'PENDING',  label: 'En attente',  color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    { value: 'APPROVED', label: 'Approuvés',   color: 'text-green-700 bg-green-50 border-green-200' },
    { value: 'REJECTED', label: 'Refusés',     color: 'text-red-600 bg-red-50 border-red-200' },
    { value: '',         label: 'Tous',         color: 'text-gray-600 bg-gray-50 border-gray-200 dark:border-gray-700' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <ClipboardList className="w-6 h-6" />
        Demandes de congés
      </h1>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f.value ? f.color : 'text-gray-500 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-400">Chargement...</div>
      ) : (leaves as any[]).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-400">Aucune demande</div>
      ) : (
        <div className="space-y-3">
          {(leaves as any[]).map((lr: any) => {
            const typeInfo = LEAVE_TYPES[lr.type] ?? LEAVE_TYPES.PERSONAL;
            const Icon = typeInfo.icon;
            const days = Math.ceil((new Date(lr.endDate).getTime() - new Date(lr.startDate).getTime()) / 86400000) + 1;

            return (
              <div key={lr.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${typeInfo.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/admin/employees/${lr.employee?.id}`} className="font-semibold text-gray-800 hover:text-[#1E3A5F] hover:underline">
                          {lr.employee?.name}
                        </Link>
                        <span className="text-gray-400 text-sm ml-2">{lr.employee?.matricule}</span>
                        <span className="text-gray-400 text-xs ml-2">· {lr.employee?.department?.name}</span>
                      </div>
                      <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${
                        lr.status === 'APPROVED' ? 'bg-green-100 text-green-700 border-green-200' :
                        lr.status === 'REJECTED' ? 'bg-red-100 text-red-600 border-red-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {lr.status === 'APPROVED' ? '✓ Approuvé' : lr.status === 'REJECTED' ? '✗ Refusé' : '⏳ En attente'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${typeInfo.color}`}>{typeInfo.label}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {format(new Date(lr.startDate), 'dd MMM yyyy', { locale: fr })}
                        {lr.startDate !== lr.endDate && <> → {format(new Date(lr.endDate), 'dd MMM yyyy', { locale: fr })}</>}
                        <span className="text-gray-400 ml-1">({days} jour{days > 1 ? 's' : ''})</span>
                      </span>
                    </div>

                    {lr.reason && <p className="text-sm text-gray-500 italic mt-1.5">"{lr.reason}"</p>}
                    {lr.adminNote && <p className="text-xs text-gray-400 mt-1">Note admin: {lr.adminNote}</p>}

                    {/* Review actions */}
                    {lr.status === 'PENDING' && (
                      <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <input
                          placeholder="Note admin (optionnel)"
                          value={notes[lr.id] || ''}
                          onChange={(e) => setNotes((n) => ({ ...n, [lr.id]: e.target.value }))}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => review.mutate({ id: lr.id, status: 'APPROVED' })}
                            disabled={review.isPending}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            {review.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approuver
                          </button>
                          <button
                            onClick={() => review.mutate({ id: lr.id, status: 'REJECTED' })}
                            disabled={review.isPending}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Refuser
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
