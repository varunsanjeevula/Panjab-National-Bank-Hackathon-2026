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
export const exportJSON = (scanId) =>
  API.get(`/reports/${scanId}/json`, { responseType: 'blob' });

export const exportCSV = (scanId) =>
  API.get(`/reports/${scanId}/csv`, { responseType: 'blob' });

export default API;
