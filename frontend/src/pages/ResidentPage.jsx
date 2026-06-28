import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import PhoneFrame from '../components/shared/PhoneFrame.jsx';
import ReportForm from '../components/resident/ReportForm.jsx';
import SuccessScreen from '../components/resident/SuccessScreen.jsx';
import ManagerEmergencySheet from '../components/resident/ManagerEmergencySheet.jsx';
import ManagerReportStats from '../components/resident/ManagerReportStats.jsx';
import ManagerQrPanel from '../components/resident/ManagerQrPanel.jsx';
import StatusScreen from '../components/resident/StatusScreen.jsx';
import LocationPicker from '../components/resident/LocationPicker.jsx';
import * as api from '../api/client.js';

// Unified resident shell — all tabs in one page, no navigate() jumps.
// Routes:
//   /r?b=42             → QR scan (report tab pre-loaded with bin)
//   /r?b=42&role=manager → QR scan + Emergency tab
//   /r/status/:id       → direct status lookup
export default function ResidentPage() {
  const [params]     = useSearchParams();
  const { reportId: urlReportId } = useParams();  // from /r/status/:id
  const binId        = params.get('b');
  const isManager    = params.get('role') === 'manager';

  // tab: 'report' | 'request' | 'status' | 'emergency'
  const [tab, setTab] = useState(() => {
    if (urlReportId) return 'status';
    if (isManager)   return 'status';   // managers have no Report/Request tabs
    if (binId)       return 'report';
    return 'request';
  });

  // ── Bin / QR report state ──
  const [bin,        setBin]        = useState(null);
  const [report,     setReport]     = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Request (no-QR) state — pick a location on the map or type lat/lng ──
  // It's an ad-hoc pickup point, not a registered bin, so there's no issue
  // type to choose — it just gets collected then disappears.
  const [reqLat,       setReqLat]       = useState('');
  const [reqLng,       setReqLng]       = useState('');
  const [reqNote,      setReqNote]      = useState('');
  const [reqReport,    setReqReport]    = useState(null);
  const [reqBusy,      setReqBusy]      = useState(false);

  // ── Status state ──
  const [statusId,    setStatusId]   = useState(urlReportId || '');
  const [statusData,  setStatusData] = useState(null);
  const [statusErr,   setStatusErr]  = useState(null);
  const [statusBusy,  setStatusBusy] = useState(false);

  useEffect(() => {
    if (binId) api.getBinByQr(binId).then(setBin);
    if (urlReportId) lookupStatus(urlReportId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function submitReport(payload) {
    setSubmitting(true);
    const res = await api.createReport({
      bin_id:         bin.bin_id,
      waste_point_id: bin.waste_point_id,
      bin_name:       bin.name,
      address:        bin.address,
      ...payload,
    });
    setSubmitting(false);
    setReport(res);
  }

  async function submitRequest(e) {
    e.preventDefault();
    const lat = Number(reqLat);
    const lng = Number(reqLng);
    if (Number.isNaN(lat) || Number.isNaN(lng) || reqLat === '' || reqLng === '') return;
    setReqBusy(true);
    try {
      // Pickup happens immediately (no scheduled time): the location comes
      // from the map tap / typed coordinates. deadline=null → ASAP priority.
      const res = await api.createScheduledPickup({
        bin_name:    'Reported location',
        address:     `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        issue_type:  'overflow',  // ad-hoc pickup — fixed type for the backend
        description: reqNote,
        lat,
        lng,
        deadline:    null,
      });
      setReqReport(res);
    } finally { setReqBusy(false); }
  }

  async function lookupStatus(id) {
    const clean = String(id ?? '').trim();
    // Guard against undefined/empty/non-numeric ids reaching the backend
    // (e.g. an onTrack with a missing report.id → "undefined").
    if (!clean || clean === 'undefined' || clean === 'null') return;
    setStatusBusy(true);
    setStatusErr(null);
    try {
      const res = await api.getReportStatus(clean);
      if (!res) setStatusErr(`No report found for "${clean}"`);
      else setStatusData(res);
    } catch (e) { setStatusErr(e.message); }
    finally { setStatusBusy(false); }
  }

  async function declareEmergency({ issueType, reason }) {
    if (!bin?.waste_point_id) return;
    await api.adminCreateEmergency(bin.waste_point_id, { reason, issueType });
  }

  // ── Tabs config ───────────────────────────────────────────────────────────
  // Managers don't report/request — they monitor (Status) and declare
  // emergencies. So Report + Request are hidden for the manager role.
  const tabs = [
    ...(binId && !isManager ? [{ key: 'report', label: 'Report', icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="5" width="12" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M7 5V3.5H13V5" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>) }] : []),
    ...(!isManager ? [{ key: 'request', label: 'Request', icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>) }] : []),
    // Status is a manager tool. Residents only see it when they arrived via a
    // tracking deep-link (/r/status/:id) — never on a plain QR scan (?b=…).
    ...((isManager || urlReportId) ? [{ key: 'status', label: 'Status', icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>) }] : []),
    ...(isManager ? [{ key: 'qr', label: 'QR', icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6"/>
        <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6"/>
        <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M11 11h2v2M15 11v.01M17 15v2M11 17h2M15 15v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>) }] : []),
    ...(isManager ? [{ key: 'emergency', label: '🚨 EMG', icon: null }] : []),
  ];

  return (
    <PhoneFrame>
    <div className="flex-1 flex flex-col text-ink min-h-0 overflow-hidden bg-white">

      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-4 pb-3 flex items-center justify-between"
        style={{ background: '#00212F' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-btn flex items-center justify-center flex-shrink-0"
            style={{ background: '#00B14F' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" />
            </svg>
          </div>
          <div className="text-xs font-bold text-white">
            Erac
            {isManager && (
              <span className="ml-1.5 text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-pill"
                style={{ background: '#00B14F' }}>
                Manager
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex-shrink-0 flex border-b border-hairline bg-white">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-semibold transition-colors border-b-2 ${
              tab === t.key
                ? 'text-ink'
                : 'border-transparent text-ink-2 hover:text-ink'
            }`}
            style={tab === t.key ? { borderColor: t.key === 'emergency' ? '#DC2626' : '#00B14F' } : {}}>
            {t.icon && (
              <span style={tab === t.key ? { color: t.key === 'emergency' ? '#DC2626' : '#00B14F' } : {}}>
                {t.icon}
              </span>
            )}
            <span style={tab === t.key && t.key === 'emergency' ? { color: '#DC2626' } : {}}>
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* Body */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">

        {/* ── Report tab (QR bin) ── */}
        {tab === 'report' && !report && (
          <ReportForm bin={bin} submitting={submitting} onSubmit={submitReport} />
        )}
        {tab === 'report' && report && (
          <SuccessScreen
            report={report}
            onAnother={() => setReport(null)}
            onTrack={() => { setStatusId(String(report.id)); lookupStatus(String(report.id)); setTab('status'); }}
          />
        )}

        {/* ── Request tab (no QR) ── */}
        {tab === 'request' && !reqReport && (
          <RequestForm
            lat={reqLat} setLat={setReqLat}
            lng={reqLng} setLng={setReqLng}
            note={reqNote} setNote={setReqNote}
            busy={reqBusy} onSubmit={submitRequest}
          />
        )}
        {tab === 'request' && reqReport && (
          <SuccessScreen
            report={reqReport}
            onAnother={() => { setReqReport(null); setReqLat(''); setReqLng(''); setReqNote(''); }}
            onTrack={() => { setStatusId(String(reqReport.id)); lookupStatus(String(reqReport.id)); setTab('status'); }}
          />
        )}

        {/* ── Status tab ── */}
        {/* Managers see report volume by hour for their waste point; residents
            look up an individual report by ID. */}
        {tab === 'status' && isManager && (
          <ManagerReportStats
            wastePointId={bin?.waste_point_id ?? (binId ? Number(binId) : null)}
            name={bin?.name}
          />
        )}
        {tab === 'status' && !isManager && (
          <div className="px-5 pt-6 pb-10">
            <div className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#00B14F' }}>
              Status
            </div>
            <h1 className="text-[22px] font-bold tracking-tightish leading-tight mb-1">Check your report</h1>
            <p className="text-sm text-ink-2 mb-5">Enter the report ID you received after submitting.</p>
            <form onSubmit={(e) => { e.preventDefault(); lookupStatus(statusId); }}
              className="flex gap-2 mb-4">
              <input
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                placeholder="e.g. 8142"
                className="flex-1 px-3 py-3 text-sm border border-hairline rounded-btn bg-surface font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
              <button type="submit"
                className="px-5 py-3 text-white text-sm font-bold rounded-pill transition-colors duration-200"
                style={{ background: '#00B14F' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#00873A'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}>
                Look up
              </button>
            </form>
            {statusBusy && <div className="text-sm text-ink-2">Looking up…</div>}
            {statusErr  && <div className="p-3 bg-danger-soft text-danger text-sm rounded-card">{statusErr}</div>}
            {statusData && <StatusScreen report={statusData} />}
          </div>
        )}

        {/* ── QR tab (manager only) — preview + save the bin's scan QR ── */}
        {tab === 'qr' && (
          <ManagerQrPanel
            wastePointId={bin?.waste_point_id ?? (binId ? Number(binId) : null)}
            name={bin?.name}
            address={bin?.address}
          />
        )}

        {/* ── Emergency tab (manager only) ── */}
        {tab === 'emergency' && (
          <ManagerEmergencySheet
            bin={bin}
            onDeclare={declareEmergency}
            onBack={() => setTab(isManager ? 'status' : 'report')}
          />
        )}
      </main>
    </div>
    </PhoneFrame>
  );
}

// ── Request form (inline — no separate page needed) ────────────────────────
function RequestForm({ lat, setLat, lng, setLng, note, setNote, busy, onSubmit }) {
  const hasLoc = lat !== '' && lng !== '' && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(Number(pos.coords.latitude.toFixed(6)));
      setLng(Number(pos.coords.longitude.toFixed(6)));
    });
  }

  return (
    <form onSubmit={onSubmit} className="animate-fade-up">
      <div className="px-5 pt-6">
        <div className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#00B14F' }}>
          Request pickup
        </div>
        <h1 className="text-[22px] font-bold tracking-tightish leading-tight">
          Where is the issue?
        </h1>
        <p className="text-sm text-ink-2 mt-1.5 mb-4">
          Tap on the map or enter coordinates. A truck is dispatched right away.
        </p>

        {/* Map location picker */}
        <LocationPicker
          lat={hasLoc ? Number(lat) : null}
          lng={hasLoc ? Number(lng) : null}
          onChange={({ lat: la, lng: ln }) => { setLat(la); setLng(ln); }}
        />

        <button type="button" onClick={useMyLocation}
          className="mt-2 w-full py-2 text-[12px] font-semibold text-ink-2 border border-hairline rounded-btn bg-surface hover:text-ink hover:border-line transition-colors">
          📍 Use my current location
        </button>

        {/* Lat / Lng inputs — editable, kept in sync with the map */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-[10px] font-semibold tracking-widest uppercase text-ink-2 mb-1">Latitude</label>
            <input
              type="number" step="any" inputMode="decimal"
              value={lat} onChange={(e) => setLat(e.target.value)}
              placeholder="10.7765"
              className="w-full px-3 py-2.5 text-sm border border-hairline rounded-btn bg-surface font-mono focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold tracking-widest uppercase text-ink-2 mb-1">Longitude</label>
            <input
              type="number" step="any" inputMode="decimal"
              value={lng} onChange={(e) => setLng(e.target.value)}
              placeholder="106.7019"
              className="w-full px-3 py-2.5 text-sm border border-hairline rounded-btn bg-surface font-mono focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="px-5 pt-5">
        <div className="text-[11px] font-semibold tracking-widest uppercase text-ink-2 mb-2.5">
          Note <span className="font-normal text-ink-3 tracking-normal">· optional</span>
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          rows={2} placeholder="e.g. overflowing since this morning"
          className="w-full px-3 py-2.5 text-sm border border-hairline rounded-card bg-surface resize-none outline-none focus:border-primary transition-colors" />
      </div>

      {/* Submit */}
      <div className="px-5 pt-6 pb-8">
        <button type="submit" disabled={busy || !hasLoc}
          className="w-full py-4 text-[17px] font-bold text-white rounded-pill transition-colors duration-200 disabled:opacity-50"
          style={{ background: '#00B14F' }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#00873A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}>
          {busy ? 'Sending…' : 'Request pickup now'}
        </button>
        <div className="text-[12px] text-ink-2 mt-3 text-center leading-snug">
          Immediate pickup · no account needed
        </div>
      </div>
    </form>
  );
}
