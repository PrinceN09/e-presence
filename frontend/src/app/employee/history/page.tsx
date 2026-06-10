'use client';
import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api';
import { formatTime, formatDate, getStatusBadge } from '@/lib/utils';
import { History, LogIn, LogOut, Coffee, Clock } from 'lucide-react';

function calcDuration(signInAt: string | null, signOutAt: string | null, lunchOutAt: string | null, lunchInAt: string | null): string {
  if (!signInAt || !signOutAt) return '—';
  let ms = new Date(signOutAt).getTime() - new Date(signInAt).getTime();
  // Subtract lunch break if both times are recorded
  if (lunchOutAt && lunchInAt) {
    ms -= new Date(lunchInAt).getTime() - new Date(lunchOutAt).getTime();
  }
  if (ms <= 0) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function calcLunchDuration(lunchOutAt: string | null, lunchInAt: string | null): string {
  if (!lunchOutAt || !lunchInAt) return '';
  const ms = new Date(lunchInAt).getTime() - new Date(lunchOutAt).getTime();
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m} min`;
}

export default function HistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: () => attendanceApi.myHistory().then((r) => r.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <History className="w-5 h-5" />
        Mon Historique de Présence
      </h1>

      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-400">Chargement...</div>
      ) : !data?.length ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-400">Aucun historique disponible</div>
      ) : (
        <div className="space-y-3">
          {data.map((rec: any) => {
            const { label, color } = getStatusBadge(rec.status);
            const duration = calcDuration(rec.signInAt, rec.signOutAt, rec.lunchOutAt, rec.lunchInAt);
            const lunchDuration = calcLunchDuration(rec.lunchOutAt, rec.lunchInAt);
            const lunchOngoing = rec.lunchOutAt && !rec.lunchInAt;

            return (
              <div key={rec.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 space-y-3">
                {/* Date + status row */}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800 text-sm">{formatDate(rec.date)}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
                    {label}
                  </span>
                </div>

                {/* Time grid */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Arrivée */}
                  <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                    <LogIn className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Arrivée</p>
                      <p className="text-sm font-mono font-medium text-gray-800 dark:text-white">
                        {formatTime(rec.signInAt) || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Départ */}
                  <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2">
                    <LogOut className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Départ</p>
                      <p className="text-sm font-mono font-medium text-gray-800 dark:text-white">
                        {formatTime(rec.signOutAt) || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Pause */}
                  <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
                    <Coffee className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Pause</p>
                      <p className="text-sm font-mono font-medium text-gray-800 dark:text-white">
                        {rec.lunchOutAt
                          ? lunchOngoing
                            ? `${formatTime(rec.lunchOutAt)} (en cours)`
                            : `${formatTime(rec.lunchOutAt)} → ${formatTime(rec.lunchInAt)}${lunchDuration ? ` · ${lunchDuration}` : ''}`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Durée travaillée */}
                  <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                    <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Temps travaillé</p>
                      <p className="text-sm font-mono font-medium text-gray-800 dark:text-white">{duration}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
