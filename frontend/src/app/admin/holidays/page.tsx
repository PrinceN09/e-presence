'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { holidaysApi } from '@/lib/api';
import { toast } from 'sonner';
import { CalendarDays, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';

const DRC_MONTH_DAY: Record<string, string> = {
  '01-01': "Jour de l'An",
  '01-04': "Journée des Martyrs de l'Indépendance",
  '03-08': "Journée de la Femme",
  '05-01': "Fête du Travail",
  '05-15': "Journée des Mères",
  '06-30': "Fête de l'Indépendance",
  '08-01': "Journée des Parents",
  '10-14': "Fête de la Jeunesse",
  '11-01': "Journée des Morts",
  '12-21': "Fête Nationale de la Démocratie",
  '12-25': "Noël",
};

function formatDate(dateStr: string) {
  const parts = dateStr.split('T')[0].split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const formatted = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  // Capitalize first letter of month
  return formatted.replace(/(\d+\s)(\w)/, (_, num, letter) => num + letter.toUpperCase());
}

export default function HolidaysPage() {
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', recurring: true });

  useEffect(() => { setMounted(true); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => holidaysApi.getAll().then((r) => r.data),
    enabled: mounted,
  });

  const holidays: any[] = Array.isArray(data) ? data : [];

  const create = useMutation({
    mutationFn: () => holidaysApi.create(form),
    onSuccess: () => {
      toast.success('Jour férié ajouté');
      qc.invalidateQueries({ queryKey: ['holidays'] });
      setForm({ name: '', date: '', recurring: true });
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => holidaysApi.remove(id),
    onSuccess: () => {
      toast.success('Jour férié supprimé');
      qc.invalidateQueries({ queryKey: ['holidays'] });
    },
  });

  // All hooks above — safe to return early now
  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarDays className="w-6 h-6" />
          Jours fériés
        </h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#162d4a]"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-[#1E3A5F]/20 space-y-4">
          <h2 className="font-medium text-gray-800 dark:text-white">Nouveau jour férié</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Fête de l'Indépendance"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Récurrence</label>
              <select
                value={form.recurring ? 'true' : 'false'}
                onChange={(e) => setForm((f) => ({ ...f, recurring: e.target.value === 'true' }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              >
                <option value="true">Tous les ans</option>
                <option value="false">Date unique</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Annuler
            </button>
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending || !form.name.trim() || !form.date}
              className="flex items-center gap-2 px-5 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : holidays.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Aucun jour férié. Cliquez &ldquo;Ajouter&rdquo; ou appliquez la migration SQL pour charger les jours fériés DRC.
          </div>
        ) : (
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Récurrence</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {holidays.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-white">{h.name}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{formatDate(h.date)}</td>
                  <td className="px-5 py-3.5">
                    {h.recurring ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        <RefreshCw className="w-3 h-3" /> Annuel
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Date unique</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => {
                        if (confirm('Supprimer ce jour férié ?')) remove.mutate(h.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">ℹ️ À propos des jours fériés</p>
        <p className="text-blue-600">
          Les jours fériés <strong>annuels</strong> s&apos;appliquent chaque année au même jour du même mois — ils apparaissent automatiquement en bleu dans l&apos;historique de présence de chaque employé. Les 11 jours fériés officiels de la RDC sont pré-chargés via la migration SQL.
        </p>
      </div>
    </div>
  );
}
