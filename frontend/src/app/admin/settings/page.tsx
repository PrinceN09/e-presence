'use client';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Settings, MapPin, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
  });

  const { register, handleSubmit, reset } = useForm<any>();

  useEffect(() => {
    if (settings) reset(settings);
  }, [settings, reset]);

  const save = useMutation({
    mutationFn: (data: any) => settingsApi.update({
      officeLatitude: parseFloat(data.officeLatitude),
      officeLongitude: parseFloat(data.officeLongitude),
      officeRadius: parseInt(data.officeRadius),
      officeName: data.officeName,
    }),
    onSuccess: () => {
      toast.success('Paramètres enregistrés');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const getMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        reset({
          ...settings,
          officeLatitude: pos.coords.latitude.toFixed(7),
          officeLongitude: pos.coords.longitude.toFixed(7),
        });
        toast.success('Position actuelle utilisée comme bureau');
      },
      () => toast.error('Impossible d\'obtenir la localisation'),
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <Settings className="w-6 h-6" />
        Paramètres
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#1E3A5F]" />
          Localisation du Bureau
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Définissez les coordonnées GPS du bureau. Les employés doivent se trouver dans le rayon autorisé pour pouvoir pointer.
        </p>

        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du bureau</label>
            <input
              {...register('officeName')}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              placeholder="Bureau Principal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                {...register('officeLatitude')}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] font-mono"
                placeholder="-4.3217"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                {...register('officeLongitude')}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] font-mono"
                placeholder="15.3222"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rayon autorisé (mètres)
            </label>
            <input
              {...register('officeRadius')}
              type="number"
              min="50"
              max="5000"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              placeholder="200"
            />
            <p className="text-xs text-gray-400 mt-1">Recommandé: 100–500m selon la taille du site</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={getMyLocation}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#1E3A5F] text-[#1E3A5F] rounded-lg text-sm font-medium hover:bg-blue-50"
            >
              <MapPin className="w-4 h-4" />
              Utiliser ma position
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#162d4a] disabled:opacity-50"
            >
              {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        <p className="font-medium mb-1">💡 Astuce</p>
        <p className="text-amber-600">
          Cliquez <strong>Utiliser ma position</strong> depuis le bureau pour capturer automatiquement les coordonnées GPS exactes.
          Si la localisation GPS n'est pas configurée, les employés peuvent pointer sans vérification de position.
        </p>
      </div>
    </div>
  );
}
