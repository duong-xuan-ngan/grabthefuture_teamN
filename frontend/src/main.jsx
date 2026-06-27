import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './index.css';

import LoginPage      from './pages/LoginPage';
import DispatcherPage from './pages/DispatcherPage';
import DriverPage     from './pages/DriverPage';
import ResidentPage   from './pages/ResidentPage';

function PrivateRoute({ children, role }) {
  const token = localStorage.getItem('wh_token');
  const userRole = localStorage.getItem('wh_role');
  if (!token) return <Navigate to="/login" replace />;
  if (role && userRole !== role) return <Navigate to="/login" replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Resident — unauthenticated QR report form */}
        <Route path="/report" element={<ResidentPage />} />

        {/* Dispatcher dashboard */}
        <Route
          path="/dispatcher"
          element={
            <PrivateRoute role="dispatcher">
              <DispatcherPage />
            </PrivateRoute>
          }
        />

        {/* Driver mobile view */}
        <Route
          path="/driver"
          element={
            <PrivateRoute role="driver">
              <DriverPage />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
