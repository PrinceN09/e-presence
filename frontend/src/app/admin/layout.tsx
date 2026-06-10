'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, clearSession } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { Clock, LogOut, LayoutDashboard, Users, CalendarCheck, FileText, Code2, Settings, Building2, ClipboardList, CalendarDays, Shield, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/NotificationBell';

const nav = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/employees', label: 'Employés', icon: Users },
  { href: '/admin/departments', label: 'Départements', icon: Building2 },
  { href: '/admin/attendance', label: 'Présences', icon: CalendarCheck },
  { href: '/admin/leaves', label: 'Congés', icon: ClipboardList },
  { href: '/admin/holidays', label: 'Jours fériés', icon: CalendarDays },
  { href: '/admin/daily-code', label: 'Code QR du jour', icon: Code2 },
  { href: '/admin/reports', label: 'Rapports', icon: FileText },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
  { href: '/admin/audit', label: "Journal d'audit", icon: Shield },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    if (u.role !== 'ADMIN') { router.replace('/employee'); return; }
    setUser(u);
  }, [router]);

  // Close sidebar when navigating on mobile
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    clearSession();
    toast.success('Déconnexion réussie');
    router.push('/login');
  };

  if (!user) return null;

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6" />
            <span className="font-bold text-lg">e-Présence</span>
          </div>
          <p className="text-blue-300 text-xs mt-1">Administration</p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-blue-200 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-white/15 text-white'
                : 'text-blue-200 hover:bg-white/10 hover:text-white',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
            {user.name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-blue-300 text-xs">{user.matricule}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">

      {/* ── Desktop sidebar: fixed, full height, never scrolls with content ── */}
      <aside className="hidden lg:flex w-64 bg-[#1E3A5F] text-white flex-col h-screen shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar: slide-in overlay ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-72 bg-[#1E3A5F] text-white flex flex-col h-full z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#1E3A5F] text-white shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-white">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="font-bold">e-Présence</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-blue-200 hover:text-white"
            title="Déconnexion"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>

      {/* Floating notification bell */}
      <div className="fixed bottom-6 right-6 z-50">
        <NotificationBell floating />
      </div>
    </div>
  );
}
