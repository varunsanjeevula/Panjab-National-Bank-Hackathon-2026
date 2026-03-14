import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 120000 // 2 mins — scans can take time
});

// Add JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('qs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('qs_token');
      localStorage.removeItem('qs_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ────────────────────────────────────────────────
export const login = (username, password) =>
  API.post('/auth/login', { username, password });

export const register = (username, email, password) =>
  API.post('/auth/register', { username, email, password });

export const getMe = () => API.get('/auth/me');

// ── Scans ───────────────────────────────────────────────
export const startScan = (targets, config = {}) =>
  API.post('/scan', { targets, config });

export const getScans = () => API.get('/scan');

export const getScan = (id) => API.get(`/scan/${id}`);

// ── CBOM ────────────────────────────────────────────────
export const getCbomRecords = (scanId) => API.get(`/cbom/${scanId}`);

export const getCbomRecord = (id) => API.get(`/cbom/record/${id}`);

export const getCbomStats = () => API.get('/cbom/stats/overview');

// ── Reports ─────────────────────────────────────────────
export const getReportsList = () => API.get('/reports/list');

export const exportJSON = (scanId) =>
  API.get(`/reports/${scanId}/json`, { responseType: 'blob' });

export const exportCSV = (scanId) =>
  API.get(`/reports/${scanId}/csv`, { responseType: 'blob' });

export const exportPDF = (scanId) =>
  API.get(`/reports/${scanId}/pdf`, { responseType: 'blob' });

export const downloadLabel = (cbomId) =>
  API.get(`/reports/label/${cbomId}`, { responseType: 'blob' });

// ── Admin ───────────────────────────────────────────────
export const getUsers = () => API.get('/admin/users');
export const createUser = (data) => API.post('/admin/users', data);
export const updateUser = (id, data) => API.put(`/admin/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);
export const getAuditLogs = (params = {}) => API.get('/admin/audit-logs', { params });

// ── Scan History ────────────────────────────────────────
export const compareScan = (id1, id2) => API.get(`/scan/compare/${id1}/${id2}`);

// ── Scheduled Scans ─────────────────────────────────────
export const getSchedules = () => API.get('/schedules');
export const createSchedule = (data) => API.post('/schedules', data);
export const updateSchedule = (id, data) => API.put(`/schedules/${id}`, data);
export const deleteSchedule = (id) => API.delete(`/schedules/${id}`);
export const triggerSchedule = (id) => API.post(`/schedules/${id}/run`);

// ── VPN Scan ────────────────────────────────────────────
export const scanVPN = (host) => API.post('/vpn-scan', { host });

// ── Asset Inventory ────────────────────────────────────
export const getAssetDomains = () => API.get('/asset-inventory/domains');
export const getAssetSSL = () => API.get('/asset-inventory/ssl');
export const getAssetIPs = () => API.get('/asset-inventory/ip');

export default API;

