'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { Loader2, Eye, EyeOff, KeyRound, AlertCircle } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6) return toast.error('Minimum 6 caractères');
    if (newPwd !== confirm) return toast.error('Les mots de passe ne correspondent pas');

    setLoading(true);
    try {
      await authApi.resetPassword(token!, newPwd);
      setDone(true);
      toast.success('Mot de passe réinitialisé !');
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl px-10 py-10">
      <div className="flex justify-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-[#1E3A5F] flex items-center justify-center shadow-md">
          <KeyRound className="w-7 h-7 text-white" />
        </div>
      </div>

      {!done ? (
        <>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Nouveau mot de passe</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Choisissez un mot de passe sécurisé.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Min. 6 caractères"
                  className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F]"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirmer</label>
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
              disabled={loading || !newPwd || !confirm}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#1E3A5F] text-white rounded-lg text-sm font-semibold hover:bg-[#162d4a] disabled:opacity-50 mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Réinitialiser le mot de passe
            </button>
          </form>
        </>
      ) : (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Mot de passe mis à jour !</h2>
          <p className="text-sm text-gray-500">Redirection vers la page de connexion...</p>
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/login" className="text-xs text-gray-400 hover:text-[#1E3A5F]">Retour à la connexion</Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at top, #1a3a6b 0%, #0d1f3c 50%, #080f1e 100%)' }}
    >
      <Suspense fallback={<div className="text-white">Chargement...</div>}>
        <ResetPasswordForm />
      </Suspense>
      <div className="absolute bottom-4 w-full text-center">
        <p className="text-blue-300 text-xs">© {new Date().getFullYear()} e-Présence. Tous droits réservés.</p>
      </div>
    </div>
  );
}
