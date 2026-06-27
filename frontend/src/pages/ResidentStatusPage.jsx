import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PhoneFrame from '../components/shared/PhoneFrame.jsx';
import StatusScreen from '../components/resident/StatusScreen.jsx';
import * as api from '../api/client.js';

export default function ResidentStatusPage() {
  const { reportId: idFromUrl } = useParams();
  const navigate = useNavigate();
  const [reportId, setReportId] = useState(idFromUrl || '');
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (idFromUrl) lookup(idFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFromUrl]);

  async function lookup(id) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getReportStatus(id);
      if (!res) setError(`No report found for ${id}`);
      setReport(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PhoneFrame>
    <div className="flex-1 flex flex-col bg-white text-ink min-h-0 overflow-hidden">
      <header className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-hairline flex items-center justify-between" style={{ background: '#00212F' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-btn flex items-center justify-center flex-shrink-0" style={{ background: '#00B14F' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" />
            </svg>
          </div>
          <div className="text-xs font-bold text-white">GrabWaste</div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/r')}
            className="text-xs font-medium underline underline-offset-2 transition-colors"
            style={{ color: '#B0C4CC' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#B0C4CC'; }}
          >
            Scan QR
          </button>
          <button
            onClick={() => navigate('/r/order')}
            className="text-xs font-medium underline underline-offset-2 transition-colors"
            style={{ color: '#B0C4CC' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#B0C4CC'; }}
          >
            Request pickup
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-thin px-5 pt-6 pb-10">
        <div className="text-[10.5px] uppercase tracking-widest font-bold mt-1" style={{ color: '#00B14F' }}>
          Status
        </div>
        <h1 className="text-[22px] font-bold tracking-tightish leading-tight mt-1">
          Check your report
        </h1>
        <p className="text-sm text-ink-2 mt-2">
          Enter the report ID you received after submitting.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (reportId.trim()) {
              navigate(`/r/status/${reportId.trim()}`);
              lookup(reportId.trim());
            }
          }}
          className="mt-5 flex gap-2"
        >
          <input
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
            placeholder="RPT-8142"
            className="flex-1 px-3 py-3 text-sm border border-hairline rounded-btn bg-surface font-mono num focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
          <button
            type="submit"
            className="px-5 py-3 text-white text-sm font-bold rounded-pill transition-colors duration-200"
            style={{ background: '#00B14F' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#00873A'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}
          >
            Look up
          </button>
        </form>

        {loading && <div className="mt-6 text-sm text-ink-2">Looking up…</div>}
        {error && (
          <div className="mt-6 p-3 bg-danger-soft text-danger text-sm rounded-xl">{error}</div>
        )}
        {report && <StatusScreen report={report} />}
      </main>
    </div>
    </PhoneFrame>
  );
}
