import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReportForm from '../components/resident/ReportForm.jsx';
import SuccessScreen from '../components/resident/SuccessScreen.jsx';
import * as api from '../api/client.js';

// Mounted at /r?b=042 — entered via QR scan.
export default function ResidentPage() {
  const [params] = useSearchParams();
  const binId = params.get('b') || '042';
  const navigate = useNavigate();

  const [bin, setBin] = useState(null);
  const [report, setReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getBinByQr(binId).then(setBin);
  }, [binId]);

  async function submit(payload) {
    setSubmitting(true);
    const res = await api.createReport({
      bin_id: bin.bin_id,
      waste_point_id: bin.waste_point_id,
      bin_name: bin.name,
      address: bin.address,
      ...payload,
    });
    setSubmitting(false);
    setReport(res);
  }

  return (
    <div className="min-h-full flex flex-col bg-white text-ink">
      {/* Browser-bar-style brand strip */}
      <header className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[18px] h-[18px] rounded-md bg-primary flex items-center justify-center">
            <div className="w-[5px] h-[5px] rounded-full bg-white" />
          </div>
          <div className="text-xs font-semibold">WasteHotspot</div>
        </div>
        <button
          onClick={() => navigate('/r/status')}
          className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink"
        >
          Check status
        </button>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {!report && (
          <ReportForm bin={bin} submitting={submitting} onSubmit={submit} />
        )}
        {report && (
          <SuccessScreen
            report={report}
            onAnother={() => setReport(null)}
            onTrack={() => navigate(`/r/status/${report.id}`)}
          />
        )}
      </main>
    </div>
  );
}
