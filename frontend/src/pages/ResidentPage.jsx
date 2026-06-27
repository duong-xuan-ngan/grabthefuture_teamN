import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ReportForm from '../components/resident/ReportForm.jsx';
import SuccessScreen from '../components/resident/SuccessScreen.jsx';
import * as api from '../api/client.js';

// Mounted at /r?b=042 or /report?bin=1 for QR scans, and /resident for demos.
export default function ResidentPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const binId = params.get('b') || params.get('bin') || '042';
  const navigate = useNavigate();
  const isShowcase = location.pathname.startsWith('/resident');

  const [bin, setBin] = useState(null);
  const [report, setReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setBin(null);
    api.getBinByQr(binId)
      .then((nextBin) => {
        if (!cancelled) setBin(nextBin);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [binId]);

  async function submit(payload) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createReport({
        bin_id: bin.bin_id,
        waste_point_id: bin.waste_point_id,
        bin_name: bin.name,
        address: bin.address,
        ...payload,
      });
      setReport(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const statusPath = isShowcase ? '/resident/status' : '/r/status';

  const app = (
    <ResidentApp
      bin={bin}
      report={report}
      error={error}
      submitting={submitting}
      onSubmit={submit}
      onStatus={() => navigate(statusPath)}
      onAnother={() => setReport(null)}
      onTrack={(reportId) => navigate(`${statusPath}/${reportId}`)}
    />
  );

  if (!isShowcase) return app;

  return (
    <div className="min-h-full bg-[#f8f8f4] px-6 pb-10 pt-20 text-ink">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(380px,520px)_minmax(320px,420px)]">
        <PhoneFrame binId={binId}>{app}</PhoneFrame>

        <section className="max-w-md">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Resident report
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight">
            Scan, tap, done under 60 seconds.
          </h1>
          <p className="mt-5 text-lg leading-8 text-ink-2">
            No app install. The QR encodes the bin ID and GPS; the form is
            pre-filled with location. Reports cluster server-side within 50 m
            / 30 min.
          </p>

          <div className="mt-8 inline-flex items-center gap-4 rounded-lg border border-line bg-white p-4 shadow-sm">
            <QrGlyph />
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
                Sticker on bin
              </div>
              <div className="mt-1 text-base font-semibold num">Bin {displayBinId(binId)}</div>
              <div className="text-sm text-ink-2 num">/r?b={binId}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ResidentApp({
  bin,
  report,
  error,
  submitting,
  onSubmit,
  onStatus,
  onAnother,
  onTrack,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-ink">
      <header className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[18px] h-[18px] rounded-md bg-primary flex items-center justify-center">
            <div className="w-[5px] h-[5px] rounded-full bg-white" />
          </div>
          <div className="text-xs font-semibold">WasteHotspot</div>
        </div>
        <button
          onClick={onStatus}
          className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink"
        >
          Check status
        </button>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {error && (
          <div className="mx-5 mt-5 rounded-xl bg-danger-soft p-3 text-sm text-danger">
            {error}
          </div>
        )}
        {!report && (
          <ReportForm bin={bin} submitting={submitting} onSubmit={onSubmit} />
        )}
        {report && (
          <SuccessScreen
            report={report}
            onAnother={onAnother}
            onTrack={() => onTrack(report.id)}
          />
        )}
      </main>
    </div>
  );
}

function PhoneFrame({ binId, children }) {
  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="relative rounded-[46px] bg-black p-[12px] shadow-2xl shadow-black/15">
        <div className="absolute left-1/2 top-[12px] z-20 h-[34px] w-[132px] -translate-x-1/2 rounded-b-[20px] bg-black" />
        <div className="h-[760px] overflow-hidden rounded-[34px] bg-white">
          <div className="relative flex h-14 items-center justify-between px-8 text-sm font-semibold">
            <span className="num">9:41</span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="h-3 w-4 rounded-sm border border-ink" />
              <span className="h-2 w-5 rounded-sm border border-ink" />
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-hairline px-5 pb-3">
            <div className="text-ink-2" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <rect x="5" y="8" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 8V6.5C7 4.6 8.3 3.5 10 3.5C11.7 3.5 13 4.6 13 6.5V8" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="flex-1 rounded-md bg-surface px-3 py-1.5 text-sm text-ink-2 num">
              app.wastehotspot.vn/r?b={binId}
            </div>
          </div>
          <div className="h-[654px] min-h-0">{children}</div>
        </div>
        <div className="absolute bottom-[22px] left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  );
}

function QrGlyph() {
  const cells = [
    0, 1, 2, 5, 7, 10, 11,
    14, 18, 19, 21, 22, 25, 27,
    28, 30, 33, 34, 36, 39, 41,
    42, 43, 45, 47, 49, 51, 54,
    57, 59, 60, 62, 64, 66, 69,
    70, 73, 75, 76, 79, 81, 83,
    84, 86, 88, 91, 93, 95, 96,
  ];

  return (
    <div className="grid h-20 w-20 grid-cols-10 gap-1 rounded-md border border-hairline bg-white p-2">
      {Array.from({ length: 100 }, (_, i) => (
        <span key={i} className={cells.includes(i) ? 'bg-ink' : 'bg-transparent'} />
      ))}
    </div>
  );
}

function displayBinId(binId) {
  const id = String(binId || '042');
  if (/^m-/i.test(id)) return id.toUpperCase();
  return `M-${id.padStart(3, '0')}`;
}
