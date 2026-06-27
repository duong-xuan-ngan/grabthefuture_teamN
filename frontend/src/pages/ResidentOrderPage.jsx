import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneFrame from '../components/shared/PhoneFrame.jsx';
import * as api from '../api/client.js';
import { ISSUE_TYPES, BIN_CATEGORIES } from '../lib/constants.js';

// Resident order page — submit a waste collection request directly without
// needing to scan a QR code. The user picks a waste point from a list,
// selects the issue type, adds an optional note, and submits.
export default function ResidentOrderPage() {
  const navigate = useNavigate();
  const [wastePoints, setWastePoints] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedWp, setSelectedWp] = useState(null);
  const [issue, setIssue] = useState('overflow');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.listWastePoints().then((pts) => setWastePoints(pts || []));
  }, []);

  const filtered = wastePoints.filter((wp) =>
    wp.name?.toLowerCase().includes(search.toLowerCase()) ||
    wp.area_type?.toLowerCase().includes(search.toLowerCase()),
  );

  async function submit(e) {
    e.preventDefault();
    if (!selectedWp) return;
    setSubmitting(true);
    try {
      const res = await api.createReport({
        bin_id: String(selectedWp.id),
        waste_point_id: selectedWp.id,
        bin_name: selectedWp.name,
        address: selectedWp.area_type,
        issue_type: issue,
        description: note,
      });
      setReport(res);
    } finally {
      setSubmitting(false);
    }
  }

  // Success screen
  if (report) {
    return (
      <div className="min-h-full flex flex-col items-center justify-start px-5 pt-12 pb-8 text-center animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center mb-4">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <path d="M7 15L12 20L23 9" stroke="#00B14F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="text-[22px] font-semibold tracking-tightish">Request submitted</div>
        <p className="text-sm text-ink-2 mt-2 max-w-[260px] leading-snug">
          Your collection request has been received. A truck will be dispatched if needed.
        </p>
        <div className="mt-6 w-full max-w-[320px] p-4 bg-surface border border-hairline rounded-2xl text-left">
          <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3 mb-0.5">Report ID</div>
          <div className="text-sm font-medium font-mono num">{report.id}</div>
          <div className="text-[11px] text-ink-2 mt-2 capitalize">
            Status: {report.status?.replace(/_/g, ' ') || 'Received'}
          </div>
        </div>
        <button
          onClick={() => navigate(`/r/status/${report.id}`)}
          className="mt-4 w-full max-w-[320px] py-3 text-sm font-medium bg-white text-ink border border-line rounded-xl hover:bg-surface"
        >
          Track this request
        </button>
        <button
          onClick={() => { setReport(null); setSelectedWp(null); setNote(''); }}
          className="mt-2 text-[13px] text-ink-2 underline underline-offset-2 hover:text-ink"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <PhoneFrame>
    <div className="flex-1 flex flex-col bg-white text-ink min-h-0 overflow-hidden">
      {/* Brand header */}
      <header className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-hairline flex items-center justify-between" style={{ background: '#00212F' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-btn flex items-center justify-center flex-shrink-0" style={{ background: '#00B14F' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" />
            </svg>
          </div>
          <div className="text-xs font-bold text-white">GrabWaste</div>
        </div>
        <button
          onClick={() => navigate('/r')}
          className="text-xs font-medium underline underline-offset-2 transition-colors"
          style={{ color: '#B0C4CC' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#B0C4CC'; }}
        >
          Scan QR instead
        </button>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <form onSubmit={submit}>
          <div className="px-5 pt-6">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">
              Collection request
            </div>
            <h1 className="text-[22px] font-semibold tracking-tightish leading-tight">
              Select a waste point
            </h1>
            <p className="text-sm text-ink-2 mt-1.5">
              Pick the bin location and describe the issue.
            </p>
          </div>

          {/* Bin search + list */}
          <div className="px-5 pt-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or area…"
              className="w-full px-3 py-2.5 text-sm border border-hairline rounded-xl bg-surface focus:outline-none focus:border-ink mb-2"
            />

            {!selectedWp ? (
              <div className="border border-hairline rounded-xl overflow-hidden max-h-[240px] overflow-y-auto">
                {filtered.length === 0 && (
                  <div className="px-3 py-4 text-sm text-ink-2 text-center">No matches</div>
                )}
                {filtered.map((wp) => (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => { setSelectedWp(wp); setSearch(''); }}
                    className="w-full text-left px-3 py-2.5 border-b border-hairline last:border-0 hover:bg-surface text-[13px]"
                  >
                    <div className="font-medium">{wp.name}</div>
                    <div className="text-[11px] text-ink-2 mt-0.5">
                      {wp.area_type} · {BIN_CATEGORIES[wp.category]?.label || wp.category}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3.5 py-3 bg-primary-soft border border-primary/30 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium">{selectedWp.name}</div>
                  <div className="text-[11px] text-ink-2 mt-0.5">
                    {selectedWp.area_type} · {BIN_CATEGORIES[selectedWp.category]?.label || selectedWp.category}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedWp(null)}
                  className="text-[11px] text-ink-2 underline underline-offset-2 hover:text-ink flex-shrink-0 ml-3"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Issue type */}
          <div className="px-5 pt-5">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2 mb-2.5">
              Issue
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ISSUE_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setIssue(t.key)}
                  className={`px-3.5 py-3 rounded-xl text-left flex flex-col min-h-[64px] border transition-colors ${
                    issue === t.key
                      ? 'bg-primary-soft border-primary'
                      : 'bg-white border-hairline hover:border-ink-3'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="text-[13px] font-medium">{t.label}</div>
                    {issue === t.key && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="7" fill="#00B14F" />
                        <path d="M4 7L6 9L10 5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="text-[11px] text-ink-2 mt-1">{t.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="px-5 pt-5">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2 mb-2">
              Note <span className="font-normal text-ink-3 tracking-normal">· optional</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. overflowing since this morning"
              className="w-full px-3 py-2.5 text-sm border border-hairline rounded-xl bg-surface resize-none outline-none focus:border-ink"
            />
          </div>

          {/* Submit */}
          <div className="px-5 pt-6 pb-8">
            <button
              type="submit"
              disabled={submitting || !selectedWp}
              className="w-full py-4 text-[17px] font-bold text-white rounded-pill tracking-tightish transition-colors duration-200 disabled:opacity-50"
              style={{ background: '#00B14F' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#00873A'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}
            >
              {submitting ? 'Sending…' : 'Submit request'}
            </button>
            <div className="text-[12px] text-ink-3 mt-3 text-center">
              No account needed · no app to install
            </div>
          </div>
        </form>
      </main>
    </div>
    </PhoneFrame>
  );
}
