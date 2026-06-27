// src/services/routes.js
import api from './api';

export const getRoute  = (id) => api.get(`/routes/${id}`);
export const checkIn   = (routeId, stopId, coords) =>
  api.post(`/routes/${routeId}/stops/${stopId}/checkin`, { coords });
export const getClusters = () => api.get('/clusters');
