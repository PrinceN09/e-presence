'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { getUser, getMustChangePassword, clearSession } from '@/lib/auth';
import { Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function FirstLoginPage() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = typeof window !== 'undefined' ? getUser() : null;

  useEffect(() => {
    if (!getMustChangePassword()) {
      router.replace('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6) return toast.error('Le mot de passe doit contenir au moins 6 caractères');
    if (newPwd !== confirm) return toast.error('Les mots de passe ne correspondent pas');
    if (newPwd === current) return toast.error('Le nouveau mot de passe doit être différent');

    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: newPwd });
      localStorage.removeItem('mustChangePassword');
      toast.success('Mot de passe mis à jour avec succès !');
      router.replace(user?.role === 'ADMIN' ? '/admin' : '/employee');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at top, #1a3a6b 0%, #0d1f3c 50%, #080f1e 100%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl px-10 py-10">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#1E3A5F] flex items-center justify-center shadow-md">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Bienvenue, {user?.name?.split(' ')[0]} !</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Première connexion — veuillez choisir un nouveau mot de passe.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5 text-xs text-amber-700">
          Votre mot de passe actuel est votre numéro de matricule : <strong>{user?.matricule}</strong>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe actuel</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Votre matricule"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Min. 6 caractères"
                className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F]"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Répéter le mot de passe"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !current || !newPwd || !confirm}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#1E3A5F] text-white rounded-lg text-sm font-semibold hover:bg-[#162d4a] disabled:opacity-50 mt-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmer et continuer
          </button>
        </form>
      </div>

      <div className="absolute bottom-4 w-full text-center">
        <p className="text-blue-300 text-xs">© {new Date().getFullYear()} e-Présence. Tous droits réservés.</p>
      </div>
    </div>
  );
}
