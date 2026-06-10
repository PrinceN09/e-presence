'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { attendanceApi } from '@/lib/api';
import { Users, CheckCircle2, Clock, XCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const { data: stats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => attendanceApi.dashboard().then((r) => r.data),
    refetchInterval: 30_000,
  });

  // Full class strings so Tailwind JIT includes them
  const cards = [
    {
      label: 'Total employés',
      value: stats?.totalEmployees ?? '—',
      icon: Users,
      color: 'bg-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/40',
      num: 'text-blue-900 dark:text-blue-100',
      sub: 'text-blue-600 dark:text-blue-300',
    },
    {
      label: 'Présents',
      value: stats?.present ?? '—',
      icon: CheckCircle2,
      color: 'bg-green-500',
      bg: 'bg-green-50 dark:bg-green-900/40',
      num: 'text-green-900 dark:text-green-100',
      sub: 'text-green-600 dark:text-green-300',
    },
    {
      label: 'En retard',
      value: stats?.late ?? '—',
      icon: Clock,
      color: 'bg-yellow-500',
      bg: 'bg-yellow-50 dark:bg-yellow-900/40',
      num: 'text-yellow-900 dark:text-yellow-100',
      sub: 'text-yellow-600 dark:text-yellow-300',
    },
    {
      label: 'Absents',
      value: stats?.absent ?? '—',
      icon: XCircle,
      color: 'bg-red-500',
      bg: 'bg-red-50 dark:bg-red-900/40',
      num: 'text-red-900 dark:text-red-100',
      sub: 'text-red-600 dark:text-red-300',
    },
  ];

  const chartData = stats
    ? [
        { name: 'Présents', value: stats.present, fill: '#22c55e' },
        { name: 'En retard', value: stats.late, fill: '#f59e0b' },
        { name: 'Absents', value: stats.absent, fill: '#ef4444' },
      ]
    : [];

  const attendanceRate = stats
    ? Math.round(((stats.present + stats.late) / Math.max(stats.totalEmployees, 1)) * 100)
    : 0;

  const gridColor  = dark ? '#374151' : '#e5e7eb';
  const tickColor  = dark ? '#9ca3af' : '#6b7280';
  const trackColor = dark ? '#374151' : '#e5e7eb';
  const tooltipBg  = dark ? '#1f2937' : '#ffffff';
  const tooltipBorder = dark ? '#374151' : '#e5e7eb';
  const tooltipText = dark ? '#f3f4f6' : '#111827';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Tableau de bord</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {new Date()
            .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg, num, sub }) => (
          <div key={label} className={`${bg} rounded-2xl p-5 shadow-sm`}>
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className={`text-3xl font-bold ${num}`}>{value}</p>
            <p className={`text-sm mt-1 ${sub}`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Chart + Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Répartition d&apos;aujourd&apos;hui
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: tickColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                labelStyle={{ color: tooltipText }}
                itemStyle={{ color: tooltipText }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <rect key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Taux de présence</p>
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={trackColor} strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={attendanceRate >= 80 ? '#22c55e' : attendanceRate >= 60 ? '#f59e0b' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={`${attendanceRate} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-800 dark:text-white">{attendanceRate}%</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            {stats ? `${stats.present + stats.late} / ${stats.totalEmployees} employés présents` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
