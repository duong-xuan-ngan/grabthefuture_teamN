import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as api from '../api/client.js';
import { BIN_CATEGORIES, ISSUE_TYPES } from '../lib/constants.js';
import { timeAgo } from '../lib/format.js';

const ISSUE_LABEL = {
  overflow: 'Overflow',
  near_full: 'Near full',
  bulky_waste: 'Bulky waste',
  bulky: 'Bulky waste',
  bad_smell: 'Bad smell',
  smell: 'Bad smell',
};
const STATUS_COLOR   = { overflow: '#DC2626', full: '#EA580C', near_full: '#D97706', normal: '#9A9A93' };
const SEV_COLOR      = { high: '#DC2626', mid: '#D97706', low: '#00B14F' };
const ISSUE_ICON     = { overflow: '🗑️', near_full: '📦', bulky: '🪑', smell: '💨' };
const WASTE_COLORS   = { overflow: '#DC2626', near_full: '#D97706', bulky: '#7C3AED', smell: '#0891B2' };

export default function AdminPage({ onLogout }) {
  const [tab, setTab]                   = useState('qr');
  const [wastePoints, setWastePoints]   = useState([]);
  const [hotspots, setHotspots]         = useState([]);
  const [managers, setManagers]         = useState([]);
  const [search, setSearch]             = useState('');
  const [selectedQR, setSelectedQR]     = useState(null);
  const [toast, setToast]               = useState(null);
  // Emergency creation state (in QR panel)
  const [showEmgForm, setShowEmgForm]   = useState(false);
  const [emgIssue, setEmgIssue]         = useState('overflow');
  const [emgReason, setEmgReason]       = useState('');
  const [emgBusy, setEmgBusy]           = useState(false);
  // Emergency Board escalation
  const [escalating, setEscalating]     = useState(null);
  const qrRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [wpData, hs, mgData] = await Promise.all([
      api.adminListWastePoints(),
      api.listHotspots(),
      api.adminListManagers(),
    ]);
    setWastePoints(wpData?.waste_points || []);
    setHotspots(hs || []);
    setManagers(mgData?.managers || []);
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function selectWP(wp) {
    if (selectedQR?.id === wp.id) { setSelectedQR(null); setShowEmgForm(false); return; }
    setSelectedQR(wp);
    setShowEmgForm(false);
    setEmgIssue('overflow');
    setEmgReason('');
  }

  async function doEscalate(hotspot) {
    setEscalating(hotspot.id);
    try {
      await api.adminEscalate(hotspot.id, emgReason);
      showToast(`Hotspot #${hotspot.id} escalated → priority 100`);
      await load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setEscalating(null); }
  }

  async function doCreateEmergency() {
    if (!selectedQR) return;
    setEmgBusy(true);
    try {
      await api.adminCreateEmergency(selectedQR.id, { reason: emgReason, issueType: emgIssue });
      showToast(`Emergency created: ${selectedQR.name} · ${ISSUE_LABEL[emgIssue]}`);
      setShowEmgForm(false);
      setEmgReason('');
      await load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setEmgBusy(false); }
  }

  function downloadQR(wp) {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr_${wp.id}_${wp.name.replace(/\s+/g, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredWP     = wastePoints.filter((w) =>
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.area_type?.toLowerCase().includes(search.toLowerCase())
  );
  const activeHotspots = hotspots.filter((h) => h.status === 'active');

  return (
    <div className="min-h-full flex flex-col bg-surface text-ink">
      {/* Header */}
      <header className="flex-shrink-0 px-6 pt-4 pb-3 border-b border-hairline flex items-center justify-between"
        style={{ background: '#00212F' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-btn flex items-center justify-center flex-shrink-0"
            style={{ background: '#00B14F' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" />
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-bold text-white">GrabWaste Admin</div>
            <div className="text-[11px]" style={{ color: '#B0C4CC' }}>Management console</div>
          </div>
        </div>
        {onLogout && (
          <button onClick={onLogout}
            className="text-xs underline underline-offset-2 transition-colors"
            style={{ color: '#B0C4CC' }}
            onMouseEnter={e => e.currentTarget.style.color = 'white'}
            onMouseLeave={e => e.currentTarget.style.color = '#B0C4CC'}>
            Sign out
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-hairline bg-white px-6 flex gap-1">
        {[
          { key: 'qr',        label: 'QR Management' },
          { key: 'managers',  label: 'Manager Accounts' },
          { key: 'emergency', label: 'Emergency Board' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-[13px] font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-ink'
                : 'border-transparent text-ink-2 hover:text-ink'
            }`}>
            {t.label}
            {t.key === 'emergency' && activeHotspots.length > 0 && (
              <span className="ml-1.5 text-[11px] px-1.5 py-px rounded-pill text-white font-bold"
                style={{ background: '#DC2626' }}>
                {activeHotspots.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto scrollbar-thin">

        {/* ── QR Tab ── */}
        {tab === 'qr' && (
          <div className="p-6 max-w-5xl">
            <div className="flex items-start justify-between mb-5 gap-4">
              <div>
                <h2 className="text-[20px] font-bold tracking-tightish">QR Code Generator</h2>
                <p className="text-sm text-ink-2 mt-0.5">
                  {wastePoints.length} waste points · click a row to generate QR & create emergencies
                </p>
              </div>
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or area…"
                className="px-3 py-2 text-sm border border-hairline rounded-btn bg-white focus:outline-none w-64"
                style={{ '--tw-ring-color': '#00B14F' }}
              />
            </div>

            {/* Waste point list */}
            <div className="bg-white border border-hairline rounded-card overflow-hidden mb-4">
              {filteredWP.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-ink-2">No waste points found.</div>
              )}
              {filteredWP.map((wp, i) => {
                const hasActiveHS = hotspots.some((h) => h.waste_point_id === wp.id && h.status === 'active');
                const isSelected  = selectedQR?.id === wp.id;
                return (
                  <div key={wp.id} onClick={() => selectWP(wp)}
                    className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${i > 0 ? 'border-t border-hairline' : ''} ${isSelected ? 'bg-primary-soft' : 'hover:bg-surface'}`}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: STATUS_COLOR[wp.status] || '#9A9A93' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{wp.name}</div>
                      <div className="text-[11px] text-ink-2 mt-0.5 num">
                        {wp.area_type} · {BIN_CATEGORIES[wp.category]?.label || wp.category} · ID {wp.id}
                      </div>
                    </div>
                    {hasActiveHS && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill text-white flex-shrink-0"
                        style={{ background: '#DC2626' }}>
                        Active hotspot
                      </span>
                    )}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                      className={`flex-shrink-0 transition-transform text-ink-3 ${isSelected ? 'rotate-90' : ''}`}>
                      <path d="M4 2.5L9.5 7L4 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                );
              })}
            </div>

            {/* QR + Emergency panel */}
            {selectedQR && (
              <div className="bg-white border border-hairline rounded-card animate-fade-up overflow-hidden">
                {/* QR section */}
                <div className="p-6 flex gap-8 items-start border-b border-hairline">
                  <div ref={qrRef} className="flex-shrink-0 p-2 border border-hairline rounded-card">
                    <QRCodeSVG
                      value={selectedQR.qr_url}
                      size={160}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-ink-2 mb-1">Waste point</div>
                    <div className="text-[20px] font-bold tracking-tightish leading-tight">{selectedQR.name}</div>
                    <div className="text-[13px] text-ink-2 mt-1">
                      {selectedQR.area_type} · {BIN_CATEGORIES[selectedQR.category]?.label} · {selectedQR.estimated_weight_kg} kg
                    </div>
                    <div className="mt-3 px-3 py-2 bg-surface rounded-btn font-mono text-[11px] text-ink-2 break-all select-all">
                      {selectedQR.qr_url}
                    </div>
                    <div className="mt-4 flex gap-2 flex-wrap">
                      <button onClick={() => downloadQR(selectedQR)}
                        className="px-4 py-2 text-[13px] font-bold text-white rounded-btn transition-colors"
                        style={{ background: '#00B14F' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#00873A'}
                        onMouseLeave={e => e.currentTarget.style.background = '#00B14F'}>
                        Download SVG
                      </button>
                      <button onClick={() => navigator.clipboard.writeText(selectedQR.qr_url).then(() => showToast('URL copied!'))}
                        className="px-4 py-2 text-[13px] font-semibold border border-hairline rounded-btn bg-white hover:bg-surface transition-colors">
                        Copy URL
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(selectedQR.qr_url + '&role=manager').then(() => showToast('Manager URL copied!'))}
                        className="px-4 py-2 text-[13px] font-semibold border-2 rounded-btn bg-white transition-colors"
                        style={{ borderColor: '#D97706', color: '#D97706' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FEF3C7'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}>
                        Copy Manager URL
                      </button>
                      <button
                        onClick={() => setShowEmgForm((v) => !v)}
                        className={`px-4 py-2 text-[13px] font-bold rounded-btn transition-colors ${
                          showEmgForm
                            ? 'bg-danger text-white'
                            : 'border-2 border-danger text-danger hover:bg-danger-soft'
                        }`}>
                        {showEmgForm ? '▲ Hide' : '🚨 Declare Emergency'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Emergency declaration form */}
                {showEmgForm && (
                  <div className="p-6 bg-danger-soft/40 animate-fade-up">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                        style={{ background: '#DC2626', color: 'white' }}>!</div>
                      <div>
                        <div className="text-[14px] font-bold text-ink">Emergency Declaration</div>
                        <div className="text-[12px] text-ink-2">Creates a priority-100 hotspot · dispatches the nearest available truck</div>
                      </div>
                    </div>

                    {/* Waste type selector */}
                    <div className="mb-4">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-ink-2 mb-2">
                        Type of waste issue
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {ISSUE_TYPES.map((t) => (
                          <button key={t.key} type="button"
                            onClick={() => setEmgIssue(t.key)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-card border-2 text-left transition-all ${
                              emgIssue === t.key
                                ? 'bg-white shadow-card'
                                : 'border-transparent bg-white/60 hover:bg-white'
                            }`}
                            style={emgIssue === t.key ? { borderColor: WASTE_COLORS[t.key] } : {}}>
                            <span className="text-xl flex-shrink-0">{ISSUE_ICON[t.key]}</span>
                            <div>
                              <div className="text-[13px] font-bold" style={emgIssue === t.key ? { color: WASTE_COLORS[t.key] } : {}}>
                                {t.label}
                              </div>
                              <div className="text-[11px] text-ink-2">{t.hint}</div>
                            </div>
                            {emgIssue === t.key && (
                              <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: WASTE_COLORS[t.key] }}>
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                  <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="mb-4">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-ink-2 mb-2">
                        Reason <span className="font-normal tracking-normal normal-case text-ink-3">· optional</span>
                      </div>
                      <textarea
                        value={emgReason}
                        onChange={(e) => setEmgReason(e.target.value)}
                        rows={2}
                        placeholder="e.g. Concert ending, 500+ people — expect large overflow in next 30 min"
                        className="w-full px-3 py-2.5 text-sm border border-hairline rounded-btn bg-white resize-none outline-none focus:border-danger"
                      />
                    </div>

                    {/* Summary card */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-white border-2 rounded-card mb-4"
                      style={{ borderColor: WASTE_COLORS[emgIssue] }}>
                      <span className="text-2xl">{ISSUE_ICON[emgIssue]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold truncate">{selectedQR.name}</div>
                        <div className="text-[12px] text-ink-2">{ISSUE_LABEL[emgIssue]} · Priority <span className="font-bold text-danger">100</span></div>
                      </div>
                      <div className="flex-shrink-0 px-2 py-0.5 rounded-pill text-[11px] font-bold text-white"
                        style={{ background: '#DC2626' }}>EMERGENCY</div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setShowEmgForm(false)}
                        className="flex-1 py-3 text-[14px] font-semibold border-2 border-hairline rounded-pill bg-white hover:bg-surface transition-colors">
                        Cancel
                      </button>
                      <button onClick={doCreateEmergency} disabled={emgBusy}
                        className="flex-[2] py-3 text-[14px] font-bold text-white rounded-pill transition-colors disabled:opacity-60"
                        style={{ background: '#DC2626' }}
                        onMouseEnter={e => { if (!emgBusy) e.currentTarget.style.background = '#B91C1C'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#DC2626'; }}>
                        {emgBusy ? 'Dispatching…' : '🚨 Confirm Emergency'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Manager Accounts ── */}
        {tab === 'managers' && (
          <div className="p-6 max-w-4xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold tracking-tightish">Manager Accounts</h2>
                <p className="text-sm text-ink-2 mt-0.5">
                  Each manager logs in with their account and sees only their assigned bin's form.
                </p>
              </div>
              <span className="text-[12px] px-3 py-1.5 rounded-pill font-semibold text-white flex-shrink-0"
                style={{ background: '#00B14F' }}>
                {managers.length} accounts
              </span>
            </div>

            {/* Existing managers */}
            {managers.length > 0 && (
              <div className="bg-white border border-hairline rounded-card overflow-hidden mb-6">
                <div className="px-5 py-2.5 bg-surface border-b border-hairline">
                  <div className="grid grid-cols-4 text-[10px] font-bold uppercase tracking-widest text-ink-2">
                    <span>Username</span>
                    <span>Assigned Bin</span>
                    <span>Login URL</span>
                    <span></span>
                  </div>
                </div>
                {managers.map((m, i) => (
                  <div key={m.id}
                    className={`px-5 py-3.5 grid grid-cols-4 items-center gap-3 ${i > 0 ? 'border-t border-hairline' : ''}`}>
                    <div>
                      <div className="text-[13px] font-semibold font-mono">{m.username}</div>
                      <div className="text-[11px] text-ink-2">role: manager</div>
                    </div>
                    <div>
                      <div className="text-[13px] font-medium truncate">{m.waste_point_name || `Bin #${m.waste_point_id}`}</div>
                      <div className="text-[11px] text-ink-2">ID {m.waste_point_id}</div>
                    </div>
                    <div>
                      <button
                        onClick={() => {
                          const base = window.location.origin;
                          navigator.clipboard.writeText(`${base}/login?next=/r?b=${m.waste_point_id}%26role=manager`);
                          showToast('Login URL copied!');
                        }}
                        className="text-[11px] font-medium underline underline-offset-2 transition-colors"
                        style={{ color: '#00B14F' }}>
                        Copy login URL
                      </button>
                    </div>
                    <div className="text-right">
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete account "${m.username}"?`)) return;
                          await api.adminDeleteManager(m.id);
                          showToast(`Deleted ${m.username}`);
                          await load();
                        }}
                        className="text-[12px] font-semibold text-danger hover:underline">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create new manager */}
            <div className="bg-white border border-hairline rounded-card p-6">
              <div className="text-[15px] font-bold mb-1">Create manager account</div>
              <p className="text-[13px] text-ink-2 mb-5">
                Assign a username + password to a specific waste point. The manager logs in and lands directly on their bin's form with emergency access.
              </p>
              <CreateManagerForm
                wastePoints={wastePoints}
                onCreate={async (body) => {
                  await api.adminCreateManager(body);
                  showToast(`Manager account created: ${body.username}`);
                  await load();
                }}
              />
            </div>
          </div>
        )}

        {/* ── Emergency Board ── */}
        {tab === 'emergency' && (
          <div className="p-6 max-w-4xl">
            <div className="mb-6">
              <h2 className="text-[20px] font-bold tracking-tightish">Emergency Board</h2>
              <p className="text-sm text-ink-2 mt-0.5">
                {activeHotspots.length} active hotspot{activeHotspots.length !== 1 ? 's' : ''} · escalate any to force priority 100
              </p>
            </div>

            {activeHotspots.length === 0 ? (
              <div className="text-center py-16 text-ink-2 text-[15px] bg-white rounded-card border border-hairline">
                No active hotspots right now.
              </div>
            ) : (
              <div className="space-y-3 mb-8">
                {[...activeHotspots].sort((a, b) => b.priority_score - a.priority_score).map((h) => {
                  const sev   = h.severity === 'high' ? 'high' : h.severity === 'mid' ? 'mid' : 'low';
                  const isMax = h.priority_score >= 100;
                  return (
                    <div key={h.id}
                      className={`bg-white border-2 rounded-card px-5 py-4 transition-all ${isMax ? 'shadow-card' : 'border-hairline'}`}
                      style={isMax ? { borderColor: '#DC2626' } : {}}>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full text-white text-[15px] font-bold flex items-center justify-center flex-shrink-0 num"
                          style={{ background: SEV_COLOR[sev] }}>
                          {h.priority_score}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <div className="text-[15px] font-bold truncate">{h.name}</div>
                            {isMax && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill text-white"
                                style={{ background: '#DC2626' }}>
                                EMERGENCY
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[12px] text-ink-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              {ISSUE_ICON[h.issue_type] || '🗑️'}
                              {ISSUE_LABEL[h.issue_type] || h.issue_type}
                            </span>
                            <span className="text-ink-3">·</span>
                            <span className="num">{h.report_count} report{h.report_count !== 1 ? 's' : ''}</span>
                            <span className="text-ink-3">·</span>
                            <span className="num">{timeAgo(h.created_at)} ago</span>
                          </div>
                        </div>
                        {!isMax && (
                          <button
                            onClick={() => doEscalate(h)}
                            disabled={escalating === h.id}
                            className="flex-shrink-0 px-4 py-2.5 text-[13px] font-bold text-white rounded-btn transition-colors disabled:opacity-50"
                            style={{ background: '#DC2626' }}
                            onMouseEnter={e => { if (escalating !== h.id) e.currentTarget.style.background = '#B91C1C'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#DC2626'; }}>
                            {escalating === h.id ? 'Escalating…' : '🚨 Escalate'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Manual emergency — from any waste point */}
            <div className="bg-white border border-hairline rounded-card p-6">
              <div className="text-[15px] font-bold mb-1">Create emergency on any waste point</div>
              <p className="text-[13px] text-ink-2 mb-5">
                No resident reports yet? Pick a waste point, choose the waste type, and force an emergency hotspot directly.
              </p>
              <ManualEmergencyForm
                wastePoints={wastePoints}
                hotspots={hotspots}
                onCreate={async (wpId, issueType, reason) => {
                  await api.adminCreateEmergency(wpId, { reason, issueType });
                  showToast('Emergency hotspot created');
                  await load();
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-pill text-white text-[13px] font-semibold shadow-lg z-[9999] transition-all animate-fade-up ${
          toast.type === 'error' ? 'bg-danger' : 'bg-ink'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Manual Emergency Form (Emergency Board tab) ─────────────────────────────
function ManualEmergencyForm({ wastePoints, hotspots, onCreate }) {
  const [selectedId, setSelectedId] = useState('');
  const [issueType,  setIssueType]  = useState('overflow');
  const [reason,     setReason]     = useState('');
  const [busy,       setBusy]       = useState(false);
  const [search,     setSearch]     = useState('');

  const filtered    = wastePoints.filter((w) =>
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.area_type?.toLowerCase().includes(search.toLowerCase())
  );
  const selectedWP  = wastePoints.find((w) => String(w.id) === selectedId);
  const hasActive   = selectedWP && hotspots.some((h) => h.waste_point_id === selectedWP.id && h.status === 'active');

  async function submit(e) {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    try {
      await onCreate(Number(selectedId), issueType, reason);
      setSelectedId(''); setIssueType('overflow'); setReason(''); setSearch('');
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Search + select */}
      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search waste point…"
          className="flex-1 px-3 py-2.5 text-sm border border-hairline rounded-btn bg-surface focus:outline-none focus:border-primary" />
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
          className="flex-[2] px-3 py-2.5 text-sm border border-hairline rounded-btn bg-white focus:outline-none focus:border-primary">
          <option value="">Choose a waste point…</option>
          {filtered.map((w) => (
            <option key={w.id} value={w.id}>{w.name} · {w.area_type}</option>
          ))}
        </select>
      </div>

      {hasActive && (
        <div className="text-[12px] font-semibold px-3 py-2 bg-warning-soft rounded-btn"
          style={{ color: '#D97706' }}>
          ⚠ Already has an active hotspot — this will escalate it to priority 100.
        </div>
      )}

      {/* Waste type buttons */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-ink-2 mb-2">Waste type</div>
        <div className="grid grid-cols-4 gap-2">
          {ISSUE_TYPES.map((t) => (
            <button key={t.key} type="button" onClick={() => setIssueType(t.key)}
              className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-card border-2 text-center transition-all ${
                issueType === t.key ? 'bg-white shadow-card' : 'border-transparent bg-surface hover:bg-white'
              }`}
              style={issueType === t.key ? { borderColor: WASTE_COLORS[t.key] } : {}}>
              <span className="text-xl">{ISSUE_ICON[t.key]}</span>
              <span className="text-[11px] font-semibold" style={issueType === t.key ? { color: WASTE_COLORS[t.key] } : {}}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-ink-2 mb-2">
          Reason <span className="font-normal tracking-normal normal-case text-ink-3">· optional</span>
        </div>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)}
          rows={2} placeholder="e.g. Large event ending, expect massive overflow in 30 min"
          className="w-full px-3 py-2.5 text-sm border border-hairline rounded-btn bg-surface resize-none focus:outline-none focus:border-danger" />
      </div>

      <button type="submit" disabled={busy || !selectedId}
        className="w-full py-3 text-[14px] font-bold text-white rounded-pill transition-colors disabled:opacity-50"
        style={{ background: '#DC2626' }}
        onMouseEnter={e => { if (!busy && selectedId) e.currentTarget.style.background = '#B91C1C'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#DC2626'; }}>
        {busy ? 'Creating…' : '🚨 Create Emergency Hotspot'}
      </button>
    </form>
  );
}

// ── Create Manager Form ──────────────────────────────────────────────────────
function CreateManagerForm({ wastePoints, onCreate }) {
  const [wpId,     setWpId]     = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [search,   setSearch]   = useState('');
  const [busy,     setBusy]     = useState(false);
  const [showPass, setShowPass] = useState(false);

  const filtered = wastePoints.filter((w) =>
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.area_type?.toLowerCase().includes(search.toLowerCase())
  );
  const selectedWP = wastePoints.find((w) => String(w.id) === wpId);

  async function submit(e) {
    e.preventDefault();
    if (!wpId || !username || !password) return;
    setBusy(true);
    try {
      await onCreate({ username, password, waste_point_id: Number(wpId) });
      setWpId(''); setUsername(''); setPassword(''); setSearch('');
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Bin selector */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-2 mb-1.5">
            Waste point
          </label>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full px-3 py-2 text-sm border border-hairline rounded-btn bg-surface focus:outline-none focus:border-primary mb-1.5" />
          <select value={wpId} onChange={(e) => setWpId(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-hairline rounded-btn bg-white focus:outline-none focus:border-primary">
            <option value="">Choose a bin…</option>
            {filtered.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-2 mb-1.5">
              Username
            </label>
            <input value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. manager.benthanh"
              className="w-full px-3 py-2.5 text-sm border border-hairline rounded-btn bg-surface focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-2 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 chars"
                className="w-full px-3 py-2.5 text-sm border border-hairline rounded-btn bg-surface focus:outline-none focus:border-primary pr-12"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-2 hover:text-ink">
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview card */}
      {selectedWP && username && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary-soft border border-primary/20 rounded-card animate-fade-up">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
            style={{ background: '#00B14F' }}>
            {username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold font-mono">{username}</div>
            <div className="text-[11px] text-ink-2 truncate">
              Manager of <strong>{selectedWP.name}</strong>
            </div>
          </div>
          <div className="text-[10px] font-bold px-2 py-0.5 rounded-pill text-white"
            style={{ background: '#00B14F' }}>
            MANAGER
          </div>
        </div>
      )}

      <button type="submit" disabled={busy || !wpId || !username || !password}
        className="w-full py-3 text-[14px] font-bold text-white rounded-pill transition-colors disabled:opacity-50"
        style={{ background: '#00B14F' }}
        onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#00873A'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}>
        {busy ? 'Creating…' : 'Create Manager Account'}
      </button>
    </form>
  );
}
