'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { attendanceApi } from '@/lib/api';
import { toast } from 'sonner';
import { Camera, MapPin, CheckCircle2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

type Step = 'gps' | 'selfie' | 'submitting' | 'done' | 'error';

export default function AttendPage() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get('code') || '';

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>('gps');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Get GPS
  const getLocation = useCallback(() => {
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('GPS non disponible — vous pouvez continuer sans localisation.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setStep('selfie');
      },
      () => setGpsError('Localisation non disponible. Autorisez l\'accès à la position dans les paramètres de votre navigateur, ou continuez sans GPS.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const skipGps = useCallback(() => {
    setStep('selfie');
  }, []);

  // Start camera only after selfie step is rendered
  useEffect(() => {
    if (step === 'selfie' && !selfie) {
      startCamera();
    }
  }, [step, selfie]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;
      // Wait for video element to be in the DOM
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      } else {
        // Try again after another tick
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => setCameraReady(true);
          }
        }, 300);
      }
    } catch {
      setCameraReady(false);
      toast.error('Caméra non disponible. Autorisez l\'accès à la caméra dans les paramètres de votre navigateur.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  const takeSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    setSelfie(dataUrl);
    stopCamera();
  };

  const retakeSelfie = () => {
    setSelfie(null);
  };

  const submit = async () => {
    setStep('submitting');
    try {
      const res = await attendanceApi.signIn({
        code,
        ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
        ...(selfie ? { selfie } : {}),
      });
      setResult(res.data);
      setStep('done');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Erreur lors du pointage');
      setStep('error');
    }
  };

  useEffect(() => () => stopCamera(), []);

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="font-semibold text-gray-800">Code invalide</h2>
          <p className="text-gray-500 text-sm mt-1">Scannez le QR code affiché par l'administrateur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#1E3A5F] px-6 py-5 text-white">
          <h1 className="font-bold text-lg">e-Présence</h1>
          <p className="text-blue-200 text-sm">Pointage du {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        {/* Progress */}
        <div className="flex border-b">
          {[
            { label: 'GPS', icon: MapPin, active: step === 'gps', done: !!location },
            { label: 'Selfie', icon: Camera, active: step === 'selfie', done: !!selfie },
            { label: 'Confirmation', icon: CheckCircle2, active: step === 'done' || step === 'submitting', done: step === 'done' },
          ].map(({ label, icon: Icon, active, done }) => (
            <div key={label} className={`flex-1 py-3 text-center text-xs font-medium border-b-2 transition-colors ${done ? 'border-green-500 text-green-600' : active ? 'border-[#1E3A5F] text-[#1E3A5F]' : 'border-transparent text-gray-400'}`}>
              <Icon className="w-4 h-4 mx-auto mb-0.5" />
              {label}
            </div>
          ))}
        </div>

        <div className="p-6">
          {/* Step 1: GPS */}
          {step === 'gps' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                <MapPin className="w-8 h-8 text-[#1E3A5F]" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Vérification de localisation</h2>
                <p className="text-gray-500 text-sm mt-1">Nous devons confirmer que vous êtes au bureau avant d'enregistrer votre présence.</p>
              </div>
              {gpsError && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-orange-700 text-sm">{gpsError}</div>
              )}
              <button
                onClick={getLocation}
                className="w-full py-3 bg-[#1E3A5F] text-white rounded-xl font-medium hover:bg-[#162d4a] transition-colors flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Autoriser la localisation
              </button>
              {gpsError && (
                <button
                  onClick={skipGps}
                  className="w-full py-3 border border-gray-300 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50"
                >
                  Continuer sans GPS →
                </button>
              )}
            </div>
          )}

          {/* Step 2: Selfie */}
          {step === 'selfie' && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="font-semibold text-gray-800">Selfie de vérification</h2>
                <p className="text-gray-500 text-sm mt-1">Prenez une photo pour confirmer votre identité.</p>
              </div>

              {!selfie ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-[4/3]">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {!cameraReady && (
                      <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                        <p className="text-white text-xs">Chargement caméra...</p>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-36 h-44 border-2 border-white/60 rounded-full" />
                    </div>
                  </div>
                  <button
                    onClick={takeSelfie}
                    disabled={!cameraReady}
                    className="w-full py-3 bg-[#1E3A5F] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Prendre la photo
                  </button>
                  {!cameraReady && (
                    <button
                      onClick={submit}
                      className="w-full py-3 border border-gray-300 text-gray-600 rounded-xl font-medium text-sm"
                    >
                      Continuer sans selfie →
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <img src={selfie} alt="selfie" className="w-full rounded-xl object-cover aspect-[4/3]" />
                  <div className="flex gap-2">
                    <button onClick={retakeSelfie} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" /> Reprendre
                    </button>
                    <button onClick={submit} className="flex-1 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submitting */}
          {step === 'submitting' && (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="w-12 h-12 text-[#1E3A5F] animate-spin mx-auto" />
              <p className="text-gray-600">Enregistrement en cours...</p>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-green-500" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-lg">{result?.message}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Statut: <span className={`font-medium ${result?.status === 'PRESENT' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {result?.status === 'PRESENT' ? 'Présent' : 'En retard'}
                  </span>
                </p>
              </div>
              <button
                onClick={() => router.push('/employee')}
                className="w-full py-3 bg-[#1E3A5F] text-white rounded-xl font-medium"
              >
                Retour à l'accueil
              </button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertCircle className="w-9 h-9 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">Pointage refusé</h2>
                <p className="text-red-500 text-sm mt-1">{errorMsg}</p>
              </div>
              <button
                onClick={() => router.push('/employee')}
                className="w-full py-3 border border-gray-300 text-gray-600 rounded-xl font-medium"
              >
                Retour
              </button>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
