'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, FileSpreadsheet, Download, Send, Loader2, Mail } from 'lucide-react';

type ReportType = 'daily' | 'weekly' | 'monthly';

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailFormat, setEmailFormat] = useState<'pdf' | 'excel'>('pdf');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');

  const downloadPdf = useMutation({
    mutationFn: () => reportsApi.downloadPdf(type, date),
    onSuccess: () => toast.success('Rapport PDF téléchargé'),
    onError: (err: any) => {
      // If blob downloaded successfully, ignore false errors
      if (err?.response?.status !== 401) toast.error('Erreur lors du téléchargement PDF');
    },
  });

  const downloadExcel = useMutation({
    mutationFn: () => reportsApi.downloadExcel(type, date),
    onSuccess: () => toast.success('Rapport Excel téléchargé'),
    onError: () => toast.error('Erreur lors du téléchargement'),
  });

  const sendEmail = useMutation({
    mutationFn: () => reportsApi.sendByEmail({ type, date, format: emailFormat, recipientEmail, recipientName }),
    onSuccess: (res: any) => {
      toast.success(res.data?.message || `Rapport envoyé à ${recipientEmail}`);
      setShowEmailForm(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur envoi email'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <FileText className="w-6 h-6" />
        Rapports
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Type de rapport</label>
          <div className="flex gap-3">
            {([
              { value: 'daily', label: 'Journalier' },
              { value: 'weekly', label: 'Hebdomadaire' },
              { value: 'monthly', label: 'Mensuel' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setType(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  type === value
                    ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                    : 'bg-white text-gray-600 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {type === 'daily' ? 'Date' : type === 'weekly' ? 'Semaine (choisir une date dans la semaine)' : 'Mois (choisir une date dans le mois)'}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => downloadPdf.mutate()}
            disabled={downloadPdf.isPending}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {downloadPdf.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            Exporter en PDF
            <Download className="w-4 h-4 ml-1" />
          </button>
          <button
            onClick={() => downloadExcel.mutate()}
            disabled={downloadExcel.isPending}
            className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {downloadExcel.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
            Exporter en Excel
            <Download className="w-4 h-4 ml-1" />
          </button>
          <button
            onClick={() => setShowEmailForm(!showEmailForm)}
            className="flex items-center gap-2 px-5 py-3 bg-[#1E3A5F] text-white rounded-xl font-medium hover:bg-[#162d4a] transition-colors"
          >
            <Mail className="w-5 h-5" />
            Envoyer par email
          </button>
        </div>

        {/* Email form */}
        {showEmailForm && (
          <div className="border border-[#1E3A5F]/20 bg-blue-50 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Send className="w-4 h-4 text-[#1E3A5F]" />
              Envoyer le rapport par email
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Format</label>
                <select
                  value={emailFormat}
                  onChange={(e) => setEmailFormat(e.target.value as 'pdf' | 'excel')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom du destinataire</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ex: Secrétaire Général"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Email du destinataire</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="secretaire@organisation.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 bg-white"
              >
                Annuler
              </button>
              <button
                onClick={() => sendEmail.mutate()}
                disabled={sendEmail.isPending || !recipientEmail}
                className="flex items-center gap-2 px-5 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#162d4a] disabled:opacity-50"
              >
                {sendEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        <p className="font-medium mb-1">ℹ️ Note sur les rapports</p>
        <p className="text-amber-600">
          Les rapports incluent: matricule, nom, grade, département, heure d&apos;arrivée, heure de départ, et statut pour chaque employé sur la période sélectionnée.
        </p>
      </div>
    </div>
  );
}
