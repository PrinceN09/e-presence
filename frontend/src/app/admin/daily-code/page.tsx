'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dailyCodeApi } from '@/lib/api';
import { toast } from 'sonner';
import { RefreshCw, Code2, Loader2, Download, History, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DailyCodePage() {
  const qc = useQueryClient();
  const [qrObjectUrl, setQrObjectUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: code, isLoading } = useQuery({
    queryKey: ['daily-code'],
    queryFn: () => dailyCodeApi.getToday().then((r) => r.data),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['daily-code-history'],
    queryFn: () => dailyCodeApi.getHistory().then((r) => r.data),
  });

  const fetchQr = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await dailyCodeApi.getQrBlob();
      const url = URL.createObjectURL(res.data);
      setQrObjectUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    } catch {
      toast.error('Impossible de charger le QR code');
    } finally {
      setQrLoading(false);
    }
  }, []);

  useEffect(() => { fetchQr(); }, [fetchQr]);

  const regenerate = useMutation({
    mutationFn: () => dailyCodeApi.regenerate(),
    onSuccess: (res) => {
      toast.success(`Nouveau code: ${res.data.code}`);
      qc.invalidateQueries({ queryKey: ['daily-code'] });
      qc.invalidateQueries({ queryKey: ['daily-code-history'] });
      fetchQr();
    },
    onError: () => toast.error('Erreur lors de la génération'),
  });

  // Download the styled SCAN ME card as PNG using canvas
  const downloadScanCard = async () => {
    if (!qrObjectUrl) return;
    const canvas = document.createElement('canvas');
    const W = 520, H = 660;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Top header band
    ctx.fillStyle = '#1E3A5F';
    ctx.fillRect(0, 0, W, 90);

    // Logo text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('e-Présence', W / 2, 40);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#90B4D8';
    ctx.fillText('Gestion des Présences', W / 2, 65);

    // Date
    const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillStyle = '#1E3A5F';
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(dateStr, W / 2, 115);

    // Decorative corner brackets
    const drawBrackets = (x: number, y: number, size: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      const s = size;
      // Top-left
      ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x, y); ctx.lineTo(x + s, y); ctx.stroke();
      // Top-right
      ctx.beginPath(); ctx.moveTo(x + 280 - s, y); ctx.lineTo(x + 280, y); ctx.lineTo(x + 280, y + s); ctx.stroke();
      // Bottom-left
      ctx.beginPath(); ctx.moveTo(x, y + 280 - s); ctx.lineTo(x, y + 280); ctx.lineTo(x + s, y + 280); ctx.stroke();
      // Bottom-right
      ctx.beginPath(); ctx.moveTo(x + 280 - s, y + 280); ctx.lineTo(x + 280, y + 280); ctx.lineTo(x + 280, y + 280 - s); ctx.stroke();
    };
    drawBrackets(120, 130, 30, '#1E3A5F');

    // QR Image
    const img = new Image();
    img.src = qrObjectUrl;
    await new Promise((resolve) => { img.onload = resolve; });
    ctx.drawImage(img, 120, 130, 280, 280);

    // SCAN ME text
    ctx.fillStyle = '#1E3A5F';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📷  SCAN ME', W / 2, 460);

    // Subtitle
    ctx.font = '14px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText('Scannez pour enregistrer votre présence', W / 2, 490);

    // Code badge
    ctx.fillStyle = '#F0F4F8';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 100, 510, 200, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#1E3A5F';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(code?.code || '', W / 2, 539);

    // Footer
    ctx.fillStyle = '#1E3A5F';
    ctx.fillRect(0, 600, W, 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.fillText(`Code valable le ${new Date().toLocaleDateString('fr-FR')} uniquement`, W / 2, 635);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scan-me-${new Date().toISOString().split('T')[0]}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, 'image/png');
  };

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <Code2 className="w-6 h-6" />
        Code QR de Présence
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="bg-[#1E3A5F] px-6 py-4 text-center">
            <p className="text-white font-bold text-lg">e-Présence</p>
            <p className="text-blue-300 text-xs mt-0.5">Gestion des Présences</p>
          </div>

          <div className="p-6 text-center space-y-4">
            <p className="text-gray-500 text-sm capitalize">{todayStr}</p>

            {/* QR Image with corner brackets */}
            <div className="relative inline-block p-2">
              {/* Corner brackets */}
              {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                <div
                  key={i}
                  className={`absolute w-8 h-8 ${pos} ${
                    i === 0 ? 'border-t-4 border-l-4' :
                    i === 1 ? 'border-t-4 border-r-4' :
                    i === 2 ? 'border-b-4 border-l-4' :
                    'border-b-4 border-r-4'
                  } border-[#1E3A5F] rounded-sm`}
                />
              ))}

              {qrLoading || isLoading ? (
                <div className="w-56 h-56 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : qrObjectUrl ? (
                <img
                  src={qrObjectUrl}
                  alt="QR Code"
                  className="w-56 h-56"
                />
              ) : (
                <div className="w-56 h-56 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                  Erreur chargement QR
                </div>
              )}
            </div>

            {/* SCAN ME */}
            <div className="space-y-1">
              <p className="text-2xl font-black text-[#1E3A5F] tracking-widest">📷 SCAN ME</p>
              <p className="text-gray-500 text-xs">Scannez pour enregistrer votre présence</p>
            </div>

            {/* Code badge */}
            <div className="inline-flex items-center gap-2 bg-[#F0F4F8] px-4 py-2 rounded-xl">
              <span className="text-xs text-gray-500 dark:text-gray-400">Code:</span>
              <span className="font-mono font-bold text-[#1E3A5F] text-lg tracking-widest">
                {code?.code || '——————'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={downloadScanCard}
                disabled={qrLoading || !qrObjectUrl}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                Télécharger
              </button>
              <button
                onClick={() => regenerate.mutate()}
                disabled={regenerate.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#162d4a] disabled:opacity-50"
              >
                {regenerate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Régénérer
              </button>
            </div>
          </div>

          {/* Footer band */}
          <div className="bg-[#1E3A5F] px-6 py-2 text-center">
            <p className="text-blue-300 text-xs">Code valable aujourd&apos;hui uniquement</p>
          </div>
        </div>

        {/* Info + History */}
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 space-y-2">
            <p className="font-semibold">ℹ️ Comment ça fonctionne</p>
            <p className="text-blue-600">1. Affichez ce QR code sur un écran au bureau</p>
            <p className="text-blue-600">2. L&apos;employé scanne avec son téléphone</p>
            <p className="text-blue-600">3. Il autorise sa localisation GPS</p>
            <p className="text-blue-600">4. Il prend un selfie de vérification</p>
            <p className="text-blue-600">5. La présence est enregistrée automatiquement</p>
          </div>

          {/* Code History */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-[#1E3A5F]" />
              Historique des codes
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(history as any[]).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Aucun historique</p>
              ) : (
                (history as any[]).map((h: any, i: number) => {
                  const isToday = new Date(h.date).toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={h.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
                        isToday ? 'bg-[#1E3A5F]/10 border border-[#1E3A5F]/20' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600 capitalize">
                          {format(new Date(h.date), 'EEEE dd MMM yyyy', { locale: fr })}
                        </span>
                        {isToday && (
                          <span className="text-xs bg-[#1E3A5F] text-white px-1.5 py-0.5 rounded-full">
                            Aujourd&apos;hui
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-[#1E3A5F] text-sm">{h.code}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
