// src/services/dashboard.js
import api from './api';

export const getMetrics = (params) => api.get('/dashboard/metrics', { params });
export const getMapData = () => api.get('/dashboard/map');
export const exportCSV  = (params) => api.get('/dashboard/export', { params, responseType: 'blob' });
