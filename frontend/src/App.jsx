import { Navigate, Route, Routes } from 'react-router-dom';
import DispatcherPage from './pages/DispatcherPage.jsx';
import DriverPage from './pages/DriverPage.jsx';
import ResidentPage from './pages/ResidentPage.jsx';
import ResidentStatusPage from './pages/ResidentStatusPage.jsx';
import AppSwitcher from './components/AppSwitcher.jsx';

export default function App() {
  return (
    <>
      <AppSwitcher />
      <Routes>
        <Route path="/" element={<Navigate to="/dispatcher" replace />} />
        <Route path="/dispatcher" element={<DispatcherPage />} />
        <Route path="/driver" element={<DriverPage />} />
        <Route path="/resident" element={<ResidentPage />} />
        <Route path="/resident/status" element={<ResidentStatusPage />} />
        <Route path="/resident/status/:reportId" element={<ResidentStatusPage />} />
        <Route path="/r" element={<ResidentPage />} />
        <Route path="/r/status" element={<ResidentStatusPage />} />
        <Route path="/r/status/:reportId" element={<ResidentStatusPage />} />
        <Route path="/report" element={<ResidentPage />} />
        <Route path="*" element={<Navigate to="/dispatcher" replace />} />
      </Routes>
    </>
  );
}
