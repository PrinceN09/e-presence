'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, Plus, Edit2, Trash2, Loader2, X, Check, Users } from 'lucide-react';

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newName, setNewName] = useState('');

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => departmentsApi.create(newName.trim()),
    onSuccess: () => {
      toast.success('Département ajouté');
      qc.invalidateQueries({ queryKey: ['departments'] });
      setNewName('');
      setShowForm(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => departmentsApi.update(id, name),
    onSuccess: () => {
      toast.success('Département modifié');
      qc.invalidateQueries({ queryKey: ['departments'] });
      setEditingId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => departmentsApi.remove(id),
    onSuccess: () => {
      toast.success('Département supprimé');
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Impossible de supprimer: des employés y sont affectés'),
  });

  const startEdit = (dept: any) => {
    setEditingId(dept.id);
    setEditingName(dept.name);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Départements
        </h1>
        <button
          onClick={() => { setShowForm(true); setNewName(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#162d4a]"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-[#1E3A5F]/20">
          <h2 className="font-medium text-gray-800 mb-3">Nouveau département</h2>
          <div className="flex gap-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createMut.mutate(); if (e.key === 'Escape') setShowForm(false); }}
              placeholder="Ex: Division Unique, Ressources Humaines..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
            <button
              onClick={() => { if (newName.trim()) createMut.mutate(); }}
              disabled={createMut.isPending || !newName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Ajouter
            </button>
            <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : (departments as any[]).length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun département</div>
        ) : (
          <div className="divide-y">
            {(departments as any[]).map((dept: any) => (
              <div key={dept.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-[#1E3A5F]" />
                </div>

                {editingId === dept.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateMut.mutate({ id: dept.id, name: editingName });
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 px-3 py-1.5 border border-[#1E3A5F] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    />
                    <button
                      onClick={() => updateMut.mutate({ id: dept.id, name: editingName })}
                      disabled={updateMut.isPending}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                    >
                      {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 dark:text-white">{dept.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3" />
                      {dept._count?.employees ?? 0} employé{(dept._count?.employees ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {editingId !== dept.id && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(dept)}
                      className="p-1.5 text-gray-400 hover:text-[#1E3A5F] hover:bg-gray-100 rounded"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (dept._count?.employees > 0) {
                          toast.error('Impossible: des employés sont dans ce département');
                          return;
                        }
                        if (confirm(`Supprimer "${dept.name}" ?`)) deleteMut.mutate(dept.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
