'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getUser } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { User, Lock, Loader2 } from 'lucide-react';

const schema = z.object({
  currentPassword: z.string().min(1, 'Requis'),
  newPassword: z.string().min(8, 'Minimum 8 caractères'),
  confirm: z.string(),
}).refine((d) => d.newPassword === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm'],
});

type Form = z.infer<typeof schema>;

export default function ProfilePage() {
  const user = getUser();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Mot de passe modifié avec succès');
      reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <User className="w-5 h-5" />
        Mon Profil
      </h1>

      {/* Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xl font-bold">
            {user?.name?.[0]}
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-white">{user?.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.department}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Matricule', user?.matricule],
            ['Grade', user?.grade],
            ['Libellé du grade', user?.gradeLabel || '—'],
            ['Département', user?.department],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
              <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Changer le mot de passe
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name: 'currentPassword', label: 'Mot de passe actuel', type: 'password' },
            { name: 'newPassword', label: 'Nouveau mot de passe', type: 'password' },
            { name: 'confirm', label: 'Confirmer le nouveau mot de passe', type: 'password' },
          ].map(({ name, label, type }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                {...register(name as keyof Form)}
                type={type}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] text-sm"
              />
              {errors[name as keyof Form] && (
                <p className="text-red-500 text-xs mt-1">{errors[name as keyof Form]?.message}</p>
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1E3A5F] text-white rounded-lg font-medium hover:bg-[#2E5090] disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Modifier
          </button>
        </form>
      </div>
    </div>
  );
}
