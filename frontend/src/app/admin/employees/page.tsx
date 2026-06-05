'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi, departmentsApi } from '@/lib/api';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Edit2, Trash2, RotateCcw, UserX, UserCheck, Loader2, X, Eye, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { downloadEmployeeTemplate, importEmployeesFromExcel } from '@/lib/api';
import Link from 'next/link';

const empSchema = z.object({
  matricule: z.string().min(1),
  name: z.string().min(2),
  grade: z.string().min(1),
  gradeLabel: z.string().optional(),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')),
  departmentId: z.string().min(1),
  role: z.enum(['EMPLOYEE', 'ADMIN']).default('EMPLOYEE'),
});
type EmpForm = z.infer<typeof empSchema>;

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll().then((r) => r.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll().then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<EmpForm>({
    resolver: zodResolver(empSchema),
    defaultValues: { role: 'EMPLOYEE' },
  });

  const createMut = useMutation({
    mutationFn: (data: EmpForm) => employeesApi.create(data),
    onSuccess: () => { toast.success('Employé ajouté'); qc.invalidateQueries({ queryKey: ['employees'] }); closeForm(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => employeesApi.update(id, data),
    onSuccess: () => { toast.success('Employé modifié'); qc.invalidateQueries({ queryKey: ['employees'] }); closeForm(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => employeesApi.remove(id),
    onSuccess: () => { toast.success('Employé supprimé'); qc.invalidateQueries({ queryKey: ['employees'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => employeesApi.toggleActive(id),
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries({ queryKey: ['employees'] }); },
  });

  const resetPwdMut = useMutation({
    mutationFn: (id: string) => employeesApi.resetPassword(id),
    onSuccess: () => toast.success('Mot de passe réinitialisé (= matricule)'),
  });

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importEmployeesFromExcel(file);
      setImportResult(result);
      if (result.imported > 0) qc.invalidateQueries({ queryKey: ['employees'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'importation');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const openCreate = () => { reset({ role: 'EMPLOYEE' }); setEditing(null); setShowForm(true); };
  const openEdit = (emp: any) => {
    setEditing(emp);
    setValue('matricule', emp.matricule);
    setValue('name', emp.name);
    setValue('grade', emp.grade);
    setValue('gradeLabel', emp.gradeLabel || '');
    setValue('phone', emp.phone);
    setValue('departmentId', emp.department?.id || '');
    setValue('role', emp.role);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); reset(); };

  const onSubmit = (data: EmpForm) => {
    // Strip empty optional fields so they don't hit unique constraints
    if (!data.email) delete (data as any).email;
    if (!data.gradeLabel) delete (data as any).gradeLabel;
    if (editing) updateMut.mutate({ id: editing.id, data });
    else createMut.mutate(data);
  };

  const filtered = employees.filter((e: any) => {
    const matchSearch = !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.matricule.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department?.id === deptFilter;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des Employés</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadEmployeeTemplate().catch(() => toast.error('Erreur téléchargement'))}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            title="Télécharger le modèle Excel"
          >
            <Download className="w-4 h-4" />
            Modèle Excel
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importer Excel
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} disabled={importing} />
          </label>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2E5090]"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
        >
          <option value="">Tous les départements</option>
          {departments.map((d: any) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Matricule', 'Nom & Prénom', 'Grade', 'Département', 'Téléphone', 'Statut', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">{emp.matricule}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-gray-800">{emp.name}</div>
                    <div className="text-xs text-gray-400">{emp.role === 'ADMIN' ? 'Admin' : 'Employé'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span title={emp.gradeLabel || ''}>{emp.grade}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.department?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${emp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {emp.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/employees/${emp.id}`} className="p-1.5 text-gray-500 hover:text-[#1E3A5F] hover:bg-gray-100 rounded" title="Voir le profil">
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => openEdit(emp)} className="p-1.5 text-gray-500 hover:text-[#1E3A5F] hover:bg-gray-100 rounded" title="Modifier">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button onClick={() => toggleMut.mutate(emp.id)} className="p-1.5 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded" title={emp.isActive ? 'Désactiver' : 'Activer'}>
                        {emp.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => resetPwdMut.mutate(emp.id)} className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded" title="Réinitialiser MDP">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Supprimer ${emp.name} ?`)) deleteMut.mutate(emp.id); }}
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun résultat</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Import Results Modal */}
      {importResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-800">Résultat de l&apos;importation</h2>
              <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{importResult.imported}</p>
                <p className="text-sm text-green-600">Importé(s)</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                <AlertCircle className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-600">{importResult.skipped}</p>
                <p className="text-sm text-orange-500">Ignoré(s)</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                <p className="text-sm font-medium text-red-700 mb-2">Détails des erreurs :</p>
                <ul className="space-y-1">
                  {importResult.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-600">• {e}</li>
                  ))}
                </ul>
              </div>
            )}

            {importResult.imported > 0 && importResult.errors.length === 0 && (
              <p className="text-sm text-green-600 text-center mt-2">✅ Tous les employés ont été importés avec succès.</p>
            )}

            <div className="flex justify-end mt-5">
              <button
                onClick={() => setImportResult(null)}
                className="px-5 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#162d4a]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-800">{editing ? 'Modifier l\'employé' : 'Ajouter un employé'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
              {[
                { name: 'matricule', label: 'Matricule', placeholder: '1.642.394', disabled: !!editing },
                { name: 'name', label: 'Nom & Prénom', placeholder: 'Odia Tshimanga Dorcas', col2: true },
                { name: 'grade', label: 'Grade', placeholder: '200' },
                { name: 'gradeLabel', label: 'Libellé grade', placeholder: 'ATA2 — Attaché...' },
                { name: 'phone', label: 'Téléphone', placeholder: '+243810000000' },
                { name: 'email', label: 'Email', placeholder: 'employee@example.com' },
              ].map(({ name, label, placeholder, col2, disabled }: any) => (
                <div key={name} className={col2 ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    {...register(name as keyof EmpForm)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] disabled:bg-gray-50"
                  />
                  {errors[name as keyof EmpForm] && (
                    <p className="text-red-500 text-xs mt-0.5">{(errors[name as keyof EmpForm] as any)?.message}</p>
                  )}
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Département</label>
                <select {...register('departmentId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]">
                  <option value="">Sélectionner...</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {errors.departmentId && <p className="text-red-500 text-xs mt-0.5">Requis</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rôle</label>
                <select {...register('role')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]">
                  <option value="EMPLOYEE">Employé</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>

              <div className="col-span-2 flex justify-end gap-3 mt-2">
                <button type="button" onClick={closeForm} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2E5090] disabled:opacity-50"
                >
                  {(createMut.isPending || updateMut.isPending) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editing ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
