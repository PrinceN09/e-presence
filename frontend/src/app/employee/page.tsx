'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { attendanceApi, leavesApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from 'sonner';
import { formatTime } from '@/lib/utils';
import { Clock, CheckCircle2, LogIn, LogOut, Loader2, AlertCircle, QrCode, Coffee, Plus, X } from 'lucide-react';
import jsQR from 'jsqr';
import NotificationBell from '@/components/NotificationBell';

const LEAVE_TYPES = [
  { value: 'VACATION',  label: 'Congé annuel' },
  { value: 'SICK',      label: 'Congé maladie' },
  { value: 'PERSONAL',  label: 'Congé personnel' },
  { value: 'MATERNITY', label: 'Congé maternité' },
  { value: 'MISSION',   label: 'Mission / Déplacement' },
];

// ─── Live QR Scanner ────────────────────────────────────────────────────────
function QrScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);
          scan();
        }
      } catch {
        setError('Impossible d\'accéder à la caméra. Vérifiez les permissions dans votre navigateur.');
      }
    };

    const scan = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
      if (result?.data) {
        stopStream();
        try {
          const url = new URL(result.data);
          const code = url.searchParams.get('code');
          if (code) { onScan(code.toUpperCase()); return; }
        } catch { /* not a URL */ }
        const raw = result.data.trim().toUpperCase();
        if (raw.length >= 6) { onScan(raw.slice(0, 6)); return; }
      }
      rafRef.current = requestAnimationFrame(scan);
    };

    startCamera();
    return () => { active = false; stopStream(); };
  }, [onScan, stopStream]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#1E3A5F] text-white">
          <p className="font-semibold text-sm">Scanner le QR code</p>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        {error ? (
          <div className="p-6 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={onClose} className="w-full py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm">Fermer</button>
          </div>
        ) : (
          <div className="relative bg-black aspect-square">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                {scanning && <div className="absolute inset-x-0 top-0 h-0.5 bg-[#3ABFCF] animate-[scan_2s_ease-in-out_infinite]" />}
              </div>
            </div>
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
        )}
        {!error && (
          <p className="text-xs text-gray-400 text-center py-3 px-4">
            Pointez la caméra vers le QR code affiché à l&apos;entrée
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function EmployeePage() {
  const user = getUser();
  const qc = useQueryClient();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [now, setNow] = useState(new Date());
  const [showScanner, setShowScanner] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'VACATION', startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: status, isLoading } = useQuery({
    queryKey: ['today-status'],
    queryFn: () => attendanceApi.todayStatus().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: myLeaves = [] } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => leavesApi.myRequests().then((r) => r.data),
  });

  const goToAttend = () => {
    if (code.length < 6) return;
    router.push(`/employee/attend?code=${code.trim().toUpperCase()}`);
  };

  const handleScan = (scannedCode: string) => {
    setShowScanner(false);
    router.push(`/employee/attend?code=${scannedCode}`);
  };

  const signOut = useMutation({
    mutationFn: () => attendanceApi.signOut(),
    onSuccess: () => { toast.success('Départ enregistré'); qc.invalidateQueries({ queryKey: ['today-status'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  const lunchOut = useMutation({
    mutationFn: () => attendanceApi.lunchOut(),
    onSuccess: () => { toast.success('Sortie déjeuner enregistrée'); qc.invalidateQueries({ queryKey: ['today-status'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  const lunchIn = useMutation({
    mutationFn: () => attendanceApi.lunchIn(),
    onSuccess: () => { toast.success('Retour de déjeuner enregistré'); qc.invalidateQueries({ queryKey: ['today-status'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  const submitLeave = useMutation({
    mutationFn: () => leavesApi.create(leaveForm as any),
    onSuccess: () => {
      toast.success('Demande de congé envoyée');
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      setShowLeaveForm(false);
      setLeaveForm({ type: 'VACATION', startDate: '', endDate: '', reason: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 30);
  const lunchedOut = !!(status as any)?.lunchOutAt;
  const lunchedIn  = !!(status as any)?.lunchInAt;
  const onLunch    = lunchedOut && !lunchedIn;

  return (
    <div className="space-y-5">
      {showScanner && <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {/* Greeting + Clock */}
      <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2E5090] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-200 text-sm">Bonjour,</p>
            <h1 className="text-2xl font-bold">{user?.name}</h1>
          </div>
          <NotificationBell />
        </div>
        <p className="text-blue-200 text-sm mt-0.5">{user?.grade} — {user?.department}</p>
        <div className="mt-4 text-4xl font-mono font-bold tracking-widest">
          {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <p className="text-blue-200 text-sm mt-1 capitalize">
          {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        {!isLate && !status?.signedIn && (
          <div className="mt-3 flex items-center gap-2 text-green-300 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Signature avant 08:30 → Présent
          </div>
        )}
        {isLate && !status?.signedIn && (
          <div className="mt-3 flex items-center gap-2 text-yellow-300 text-sm">
            <AlertCircle className="w-4 h-4" /> Après 08:30 → En retard
          </div>
        )}
      </div>

      {/* Today status row */}
      {!isLoading && status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Statut', value: status.status === 'PRESENT' ? 'Présent ✓' : status.status === 'LATE' ? 'En retard ⚠' : 'Absent ✗', color: status.status === 'PRESENT' ? 'text-green-600' : status.status === 'LATE' ? 'text-yellow-600' : 'text-red-500' },
            { label: 'Arrivée', value: formatTime(status.signInAt) },
            { label: 'Pause', value: (status as any).lunchOutAt ? `${formatTime((status as any).lunchOutAt)}${(status as any).lunchInAt ? ' → ' + formatTime((status as any).lunchInAt) : ' (en cours)'}` : '—' },
            { label: 'Départ', value: formatTime(status.signOutAt) },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-3 shadow-sm text-center">
              <p className="text-gray-400 text-xs">{item.label}</p>
              <p className={`font-semibold text-sm mt-1 ${item.color || 'text-gray-800'}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sign In */}
      {!status?.signedIn && (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-[#1E3A5F]" /> Signer la présence
          </h2>
          <button
            onClick={() => setShowScanner(true)}
            className="w-full flex items-center gap-3 bg-blue-50 border-2 border-blue-300 rounded-xl px-4 py-4 hover:bg-blue-100 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-[#1E3A5F] rounded-xl flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#1E3A5F]">📷 Scanner le QR code</p>
              <p className="text-xs text-blue-600">Appuyez pour ouvrir le scanner</p>
            </div>
          </button>
          <div>
            <p className="text-xs text-gray-400 mb-2">Ou entrez le code manuellement :</p>
            <div className="space-y-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') goToAttend(); }}
                placeholder="Ex: AB3X9K"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] font-mono text-xl tracking-widest text-center uppercase"
              />
              <button
                onClick={goToAttend}
                disabled={code.length < 6}
                className="w-full py-3 bg-[#1E3A5F] text-white rounded-lg font-medium hover:bg-[#2E5090] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" /> Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signed in actions */}
      {status?.signedIn && !status?.signedOut && (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Actions du jour</h2>
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
              <Coffee className="w-4 h-4" /> Pause déjeuner
            </div>
            {!lunchedOut && (
              <button onClick={() => lunchOut.mutate()} disabled={lunchOut.isPending}
                className="w-full py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {lunchOut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coffee className="w-4 h-4" />}
                Sortie déjeuner
              </button>
            )}
            {onLunch && (
              <button onClick={() => lunchIn.mutate()} disabled={lunchIn.isPending}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {lunchIn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Retour de déjeuner
              </button>
            )}
            {lunchedIn && (
              <p className="text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Déjeuner: {formatTime((status as any).lunchOutAt)} → {formatTime((status as any).lunchInAt)}
              </p>
            )}
          </div>
          <button onClick={() => signOut.mutate()} disabled={signOut.isPending}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {signOut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Enregistrer le départ
          </button>
        </div>
      )}

      {/* Fully done */}
      {status?.signedIn && status?.signedOut && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <h3 className="font-semibold text-green-800">Journée complète enregistrée</h3>
          <p className="text-green-600 text-sm mt-1">
            Arrivée: {formatTime(status.signInAt)} — Départ: {formatTime(status.signOutAt)}
          </p>
        </div>
      )}

      {/* Leave request */}
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Mes congés</h2>
          <button onClick={() => setShowLeaveForm(!showLeaveForm)}
            className="flex items-center gap-1.5 text-sm text-[#1E3A5F] border border-[#1E3A5F] px-3 py-1.5 rounded-lg hover:bg-blue-50">
            <Plus className="w-3.5 h-3.5" /> Demander un congé
          </button>
        </div>

        {showLeaveForm && (
          <div className="border border-[#1E3A5F]/20 bg-blue-50 rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Type de congé</label>
              <select value={leaveForm.type} onChange={(e) => setLeaveForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]">
                {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Date de début</label>
                <input type="date" value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Date de fin</label>
                <input type="date" value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Motif (optionnel)</label>
              <input value={leaveForm.reason} onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Raison de la demande"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLeaveForm(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg bg-white">Annuler</button>
              <button onClick={() => submitLeave.mutate()}
                disabled={submitLeave.isPending || !leaveForm.startDate || !leaveForm.endDate}
                className="flex-1 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {submitLeave.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Envoyer la demande
              </button>
            </div>
          </div>
        )}

        {(myLeaves as any[]).length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-2">Aucune demande de congé</p>
        ) : (
          <div className="space-y-2">
            {(myLeaves as any[]).slice(0, 5).map((lr: any) => (
              <div key={lr.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                <div>
                  <p className="font-medium text-gray-800">{LEAVE_TYPES.find((t) => t.value === lr.type)?.label}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(lr.startDate).toLocaleDateString('fr-FR')} → {new Date(lr.endDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  lr.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                  lr.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {lr.status === 'APPROVED' ? 'Approuvé' : lr.status === 'REJECTED' ? 'Refusé' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
