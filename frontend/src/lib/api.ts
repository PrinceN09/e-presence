import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

// Attach access token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  login: (matricule: string, password: string) =>
    api.post('/auth/login', { matricule, password }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// Settings
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data),
};

// Attendance
export const attendanceApi = {
  signIn: (data: { code: string; latitude?: number; longitude?: number; selfie?: string }) =>
    api.post('/attendance/sign-in', data),
  signOut: () => api.post('/attendance/sign-out'),
  lunchOut: () => api.post('/attendance/lunch-out'),
  lunchIn: () => api.post('/attendance/lunch-in'),
  myHistory: (params?: Record<string, string>) =>
    api.get('/attendance/my', { params }),
  todayStatus: () => api.get('/attendance/today-status'),
  dashboard: () => api.get('/attendance/dashboard'),
  getAll: (params?: Record<string, string>) =>
    api.get('/attendance', { params }),
  employeeProfile: (employeeId: string) =>
    api.get(`/attendance/employee/${employeeId}/profile`),
};

// Leaves
export const leavesApi = {
  create: (data: { type: string; startDate: string; endDate: string; reason?: string }) =>
    api.post('/leaves', data),
  myRequests: () => api.get('/leaves/my'),
  getAll: (status?: string) => api.get('/leaves', { params: status ? { status } : {} }),
  getByEmployee: (employeeId: string) => api.get(`/leaves/employee/${employeeId}`),
  review: (id: string, status: 'APPROVED' | 'REJECTED', adminNote?: string) =>
    api.patch(`/leaves/${id}/review`, { status, adminNote }),
  adminCreate: (data: any) => api.post('/leaves/admin', data),
  remove: (id: string) => api.delete(`/leaves/${id}`),
};

// Public Holidays
export const holidaysApi = {
  getAll: () => api.get('/public-holidays'),
  create: (data: { name: string; date: string; recurring?: boolean }) =>
    api.post('/public-holidays', data),
  update: (id: string, data: any) => api.patch(`/public-holidays/${id}`, data),
  remove: (id: string) => api.delete(`/public-holidays/${id}`),
};

// Employees
export const employeesApi = {
  getAll: (params?: Record<string, string>) =>
    api.get('/employees', { params }),
  getOne: (id: string) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  toggleActive: (id: string) => api.put(`/employees/${id}/toggle-active`),
  remove: (id: string) => api.delete(`/employees/${id}`),
  resetPassword: (id: string) => api.post(`/employees/${id}/reset-password`),
};

// Departments
export const departmentsApi = {
  getAll: () => api.get('/departments'),
  create: (name: string) => api.post('/departments', { name }),
  update: (id: string, name: string) => api.put(`/departments/${id}`, { name }),
  remove: (id: string) => api.delete(`/departments/${id}`),
};

// Daily Code
export const dailyCodeApi = {
  getToday: () => api.get('/daily-code/today'),
  getHistory: () => api.get('/daily-code/history'),
  getQrBlob: () => api.get('/daily-code/qr', { responseType: 'blob' }),
  regenerate: () => api.post('/daily-code/regenerate'),
  sendToEmployee: (employeeId: string) =>
    api.post(`/daily-code/send/${employeeId}`),
};

// Employees — extra helpers
const downloadEmployeeTemplate = async () => {
  const res = await api.get('/employees/template', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modele-import-employes.xlsx';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

const importEmployeesFromExcel = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('/employees/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { imported: number; skipped: number; errors: string[] };
};

export { downloadEmployeeTemplate, importEmployeesFromExcel };

// Reports
const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const reportsApi = {
  downloadExcel: async (type: string, date?: string) => {
    const params = new URLSearchParams({ type, ...(date ? { date } : {}) });
    const res = await api.get(`/reports/excel?${params}`, { responseType: 'blob' });
    triggerBlobDownload(res.data, `rapport-${type}-${date || 'today'}.xlsx`);
  },
  downloadPdf: async (type: string, date?: string) => {
    const params = new URLSearchParams({ type, ...(date ? { date } : {}) });
    const res = await api.get(`/reports/pdf?${params}`, { responseType: 'blob' });
    if ((res.data as Blob)?.type === 'application/json') {
      const text = await (res.data as Blob).text();
      throw new Error(JSON.parse(text)?.message || 'Erreur PDF');
    }
    triggerBlobDownload(res.data, `rapport-${type}-${date || 'today'}.pdf`);
    return true;
  },
  sendByEmail: (data: { type: string; date?: string; format: 'pdf' | 'excel'; recipientEmail: string; recipientName: string }) =>
    api.post('/reports/send-email', data),
};

export const auditApi = {
  getAll: (params?: { from?: string; to?: string; action?: string; limit?: number }) =>
    api.get('/audit-logs', { params }),
  downloadPdf: async (params?: { from?: string; to?: string; action?: string }) => {
    const res = await api.get('/audit-logs/pdf', { params, responseType: 'blob' });
    const date = new Date().toISOString().split('T')[0];
    triggerBlobDownload(res.data, `journal-audit-${date}.pdf`);
  },
};
