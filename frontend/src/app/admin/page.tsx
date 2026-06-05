'use client';
import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api';
import { Users, CheckCircle2, Clock, XCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => attendanceApi.dashboard().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const cards = [
    { label: 'Total employés', value: stats?.totalEmployees ?? '—', icon: Users, color: 'bg-blue-500', bg: 'bg-blue-50' },
    { label: 'Présents', value: stats?.present ?? '—', icon: CheckCircle2, color: 'bg-green-500', bg: 'bg-green-50' },
    { label: 'En retard', value: stats?.late ?? '—', icon: Clock, color: 'bg-yellow-500', bg: 'bg-yellow-50' },
    { label: 'Absents', value: stats?.absent ?? '—', icon: XCircle, color: 'bg-red-500', bg: 'bg-red-50' },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-5 shadow-sm`}>
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart + Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Répartition d&apos;aujourd&apos;hui
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <rect key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center">
          <p className="text-gray-500 text-sm mb-2">Taux de présence</p>
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f0" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={attendanceRate >= 80 ? '#22c55e' : attendanceRate >= 60 ? '#f59e0b' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={`${attendanceRate} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-800">{attendanceRate}%</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">
            {stats ? `${stats.present + stats.late} / ${stats.totalEmployees} employés présents` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
