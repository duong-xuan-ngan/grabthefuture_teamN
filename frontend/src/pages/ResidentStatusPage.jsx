import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    <div className="min-h-full flex flex-col bg-white text-ink">
      <header className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[18px] h-[18px] rounded-md bg-primary flex items-center justify-center">
            <div className="w-[5px] h-[5px] rounded-full bg-white" />
          </div>
          <div className="text-xs font-semibold">WasteHotspot</div>
        </div>
        <button
          onClick={() => navigate('/r')}
          className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink"
        >
          New report
        </button>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-thin px-5 pt-6 pb-10">
        <div className="text-[10.5px] uppercase tracking-wider text-primary font-semibold">
          Status
        </div>
        <h1 className="text-[22px] font-semibold tracking-tightish leading-tight mt-1">
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
            className="flex-1 px-3 py-3 text-sm border border-hairline rounded-xl bg-surface font-mono num focus:outline-none focus:border-ink"
          />
          <button
            type="submit"
            className="px-4 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
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
  );
}
