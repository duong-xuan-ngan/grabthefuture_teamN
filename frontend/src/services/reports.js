// src/services/reports.js
// TODO (FE Dev): implement all report API calls

import api from './api';

export const submitReport = (data) => api.post('/reports', data);
export const getReports   = (params) => api.get('/reports', { params });
export const getReport    = (id) => api.get(`/reports/${id}`);
export const updateStatus = (id, status) => api.patch(`/reports/${id}/status`, { status });
