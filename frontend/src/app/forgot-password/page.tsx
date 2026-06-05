'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Erreur — veuillez réessayer');
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
            <Mail className="w-7 h-7 text-white" />
          </div>
        </div>

        {!sent ? (
          <>
            <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Mot de passe oublié</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@exemple.com"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F]"
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#1E3A5F] text-white rounded-lg text-sm font-semibold hover:bg-[#162d4a] disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Envoyer le lien
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Email envoyé !</h2>
            <p className="text-sm text-gray-500 mb-2">
              Si <strong>{email}</strong> est enregistré dans le système, vous recevrez un lien de réinitialisation.
            </p>
            <p className="text-xs text-gray-400">Le lien expire dans 2 heures. Vérifiez aussi vos spams.</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#1E3A5F]">
            <ArrowLeft className="w-3 h-3" /> Retour à la connexion
          </Link>
        </div>
      </div>

      <div className="absolute bottom-4 w-full text-center">
        <p className="text-blue-300 text-xs">© {new Date().getFullYear()} e-Présence. Tous droits réservés.</p>
      </div>
    </div>
  );
}
