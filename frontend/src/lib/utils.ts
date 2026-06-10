import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'PRESENT': return { label: 'Présent', color: 'bg-green-100 text-green-800' };
    case 'LATE': return { label: 'En retard', color: 'bg-yellow-100 text-yellow-800' };
    case 'ABSENT': return { label: 'Absent', color: 'bg-red-100 text-red-800' };
    default: return { label: status, color: 'bg-gray-100 text-gray-800' };
  }
}

export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr)
    .toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
