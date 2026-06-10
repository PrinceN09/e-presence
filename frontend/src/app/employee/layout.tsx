'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, clearSession } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { Clock, LogOut, User, History } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    if (u.role === 'ADMIN') { router.replace('/admin'); return; }
    setUser(u);
  }, [router]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    clearSession();
    toast.success('Déconnexion réussie');
    router.push('/login');
  };

  if (!user) return null;

  const navItems = [
    { href: '/employee', label: 'Présence', icon: Clock },
    { href: '/employee/history', label: 'Mon historique', icon: History },
    { href: '/employee/profile', label: 'Mon profil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top bar */}
      <header className="bg-[#1E3A5F] text-white shadow">
        <div className="w-full max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6" />
            <span className="font-bold text-lg">e-Présence</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-blue-200 text-sm hidden sm:block">{user.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-blue-200 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="w-full max-w-2xl mx-auto px-4">
          <div className="flex gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  pathname === href
                    ? 'border-[#1E3A5F] text-[#1E3A5F]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="w-full max-w-2xl mx-auto px-3 py-4 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
