import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import DispatcherPage from './pages/DispatcherPage.jsx';
import DriverPage from './pages/DriverPage.jsx';
import ResidentPage from './pages/ResidentPage.jsx';
import ResidentStatusPage from './pages/ResidentStatusPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ResidentOrderPage from './pages/ResidentOrderPage.jsx';
import { getToken, logout, META } from './api/client.js';

// Auth gate. In mock mode (no backend) we don't force login so the demo runs
// freely. With a real backend, protected routes require a stored token; the
// backend additionally enforces roles when AUTH_REQUIRED=true.
function RequireAuth({ children }) {
  const location = useLocation();
  const needsAuth = !META.USE_MOCK;
  if (needsAuth && !getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default function App() {
  const navigate = useNavigate();
  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dispatcher" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={
        <RequireAuth>
          <AdminPage onLogout={handleLogout} />
        </RequireAuth>
      } />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dispatcher"
        element={
          <RequireAuth>
            <DispatcherPage onLogout={handleLogout} />
          </RequireAuth>
        }
      />
      <Route
        path="/driver"
        element={
          <RequireAuth>
            <DriverPage onLogout={handleLogout} />
          </RequireAuth>
        }
      />

      {/* Resident routes — all public by design (NFR-08). */}
      <Route path="/r" element={<ResidentPage />} />
      <Route path="/r/order" element={<ResidentOrderPage />} />
      <Route path="/r/status" element={<ResidentStatusPage />} />
      <Route path="/r/status/:reportId" element={<ResidentStatusPage />} />

      <Route path="*" element={<Navigate to="/dispatcher" replace />} />
    </Routes>
  );
}
