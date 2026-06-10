'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { setSession } from '@/lib/auth';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  matricule: z.string().min(1, 'Matricule requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});
type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await authApi.login(data.matricule, data.password);
      setSession(res.data);
      toast.success(`Bienvenue, ${res.data.employee.name}!`);
      if (res.data.mustChangePassword) {
        router.push('/first-login');
      } else {
        router.push(res.data.employee.role === 'ADMIN' ? '/admin' : '/employee');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative"
      style={{
        background: 'radial-gradient(ellipse at top, #1a3a6b 0%, #0d1f3c 50%, #080f1e 100%)',
      }}
    >
      {/* Card */}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl px-10 py-10">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-[#1E3A5F] flex items-center justify-center shadow-md">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="9" r="4" fill="white" />
                <path d="M6 24c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="22" cy="8" r="1.5" fill="#60A5FA" />
                <path d="M19.5 8H24M21.75 5.75v4.5" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-bold text-[#1E3A5F] dark:text-white text-lg leading-none">e-Présence</p>
              <p className="text-gray-400 dark:text-gray-400 text-xs mt-0.5">Gestion des Présences</p>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">Bienvenue</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Matricule */}
          <div>
            <input
              {...register('matricule')}
              placeholder="Numéro matricule"
              autoComplete="username"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] transition-colors"
            />
            {errors.matricule && (
              <p className="text-red-500 text-xs mt-1">{errors.matricule.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              autoComplete="current-password"
              className="w-full px-4 py-3 pr-11 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1E3A5F] text-white rounded-lg text-sm font-semibold hover:bg-[#162d4a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="text-center mt-5 space-y-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">Mot de passe par défaut = numéro de matricule</p>
          <Link href="/forgot-password" className="text-xs text-[#1E3A5F] hover:underline font-medium">
            Mot de passe oublié ?
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 w-full text-center">
        <p className="text-blue-300 text-xs">
          © {new Date().getFullYear()} e-Présence. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
