'use client';

export interface AuthUser {
  id: string;
  matricule: string;
  name: string;
  grade: string;
  gradeLabel?: string;
  role: 'EMPLOYEE' | 'ADMIN';
  department: string;
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setSession(data: { accessToken: string; refreshToken: string; employee: AuthUser; mustChangePassword?: boolean }) {
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.employee));
  if (data.mustChangePassword) {
    localStorage.setItem('mustChangePassword', 'true');
  } else {
    localStorage.removeItem('mustChangePassword');
  }
}

export function getMustChangePassword(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('mustChangePassword') === 'true';
}

export function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('accessToken');
}
