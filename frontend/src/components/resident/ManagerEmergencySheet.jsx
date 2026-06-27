import { useState } from 'react';
import { ISSUE_TYPES } from '../../lib/constants.js';

const ISSUE_ICON  = { overflow: '🗑️', near_full: '📦', bulky: '🪑', smell: '💨' };
const ISSUE_COLOR = { overflow: '#DC2626', near_full: '#D97706', bulky: '#7C3AED', smell: '#0891B2' };

export default function ManagerEmergencySheet({ bin, onDeclare, onBack }) {
  const [issue,    setIssue]    = useState('overflow');
  const [reason,   setReason]   = useState('');
  const [busy,     setBusy]     = useState(false);
  const [done,     setDone]     = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onDeclare({ issueType: issue, reason });
      setDone(true);
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pt-12 pb-8 text-center animate-fade-up">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl"
          style={{ background: '#FEE2E2' }}>
          🚨
        </div>
        <div className="text-[22px] font-bold tracking-tightish text-ink mb-2">Emergency Declared</div>
        <p className="text-[14px] text-ink-2 leading-snug max-w-[260px]">
          Priority-100 hotspot created for <strong>{bin?.name || 'this point'}</strong>.
          The nearest truck will be dispatched automatically.
        </p>
        <div className="mt-6 w-full px-5 py-4 bg-danger-soft border-2 rounded-card text-left"
          style={{ borderColor: '#DC2626' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{ISSUE_ICON[issue]}</span>
            <div>
              <div className="text-[13px] font-bold text-danger">
                {ISSUE_TYPES.find(t => t.key === issue)?.label}
              </div>
              <div className="text-[12px] text-ink-2">{bin?.name}</div>
            </div>
            <div className="ml-auto flex-shrink-0 px-2 py-0.5 rounded-pill text-[11px] font-bold text-white"
              style={{ background: '#DC2626' }}>
              PRIORITY 100
            </div>
          </div>
          {reason && (
            <div className="mt-2 pt-2 border-t border-danger/20 text-[12px] text-ink-2">
              "{reason}"
            </div>
          )}
        </div>
        <button onClick={onBack}
          className="mt-6 w-full py-3.5 text-[15px] font-bold text-white rounded-pill"
          style={{ background: '#00B14F' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#00873A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}>
          Back to report form
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="animate-fade-up">
      {/* Back + title */}
      <div className="px-5 pt-5 pb-3 border-b border-hairline">
        <button type="button" onClick={onBack}
          className="text-[13px] text-ink-2 mb-3 flex items-center gap-1 hover:text-ink">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.5 3.5L5 7L8.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to report form
        </button>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: '#DC2626', color: 'white' }}>!</div>
          <div className="text-[18px] font-bold tracking-tightish text-ink">Declare Emergency</div>
        </div>
        <div className="text-[13px] text-ink-2 ml-8">
          Creates a priority-100 hotspot · nearest truck dispatched immediately
        </div>
      </div>

      {/* Bin info */}
      <div className="px-5 pt-4">
        <div className="px-3.5 py-3 bg-surface border border-hairline rounded-card flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-hairline flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="4" width="10" height="10" rx="1.5" stroke="#0B0B0A" strokeWidth="1.3" />
              <path d="M5 4V2.5H11V4" stroke="#0B0B0A" strokeWidth="1.3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold">{bin?.name || 'Loading…'}</div>
            <div className="text-[11px] text-ink-2 truncate">{bin?.address || ' '}</div>
          </div>
          <div className="flex-shrink-0 px-2 py-0.5 rounded-pill text-[10px] font-bold text-white"
            style={{ background: '#DC2626' }}>
            EMERGENCY
          </div>
        </div>
      </div>

      {/* Waste type */}
      <div className="px-5 pt-5">
        <div className="text-[11px] font-bold uppercase tracking-widest text-ink-2 mb-3">
          Type of waste issue
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ISSUE_TYPES.map((t) => (
            <button key={t.key} type="button" onClick={() => setIssue(t.key)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-card border-2 text-left transition-all ${
                issue === t.key ? 'bg-white shadow-card' : 'border-transparent bg-surface hover:bg-white hover:border-hairline'
              }`}
              style={issue === t.key ? { borderColor: ISSUE_COLOR[t.key] } : {}}>
              <span className="text-2xl flex-shrink-0">{ISSUE_ICON[t.key]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold leading-tight"
                  style={issue === t.key ? { color: ISSUE_COLOR[t.key] } : {}}>
                  {t.label}
                </div>
                <div className="text-[11px] text-ink-2 mt-0.5 leading-tight">{t.hint}</div>
              </div>
              {issue === t.key && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: ISSUE_COLOR[t.key] }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div className="px-5 pt-5">
        <div className="text-[11px] font-bold uppercase tracking-widest text-ink-2 mb-2">
          Reason <span className="font-normal tracking-normal normal-case text-ink-3">· optional</span>
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Concert just ended, 500+ people — major overflow expected in 20 min…"
          className="w-full px-3.5 py-3 text-sm border-2 border-hairline rounded-card bg-surface resize-none outline-none focus:border-danger transition-colors"
        />
      </div>

      {/* Summary + submit */}
      <div className="px-5 pt-4 pb-8">
        <div className="flex items-center gap-3 px-4 py-3 bg-danger-soft border-2 border-danger/30 rounded-card mb-4">
          <span className="text-xl">{ISSUE_ICON[issue]}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-danger">
              {ISSUE_TYPES.find(t => t.key === issue)?.label} · Priority 100
            </div>
            <div className="text-[11px] text-ink-2 truncate">{bin?.name}</div>
          </div>
        </div>

        <button type="submit" disabled={busy || !bin}
          className="w-full py-4 text-[17px] font-bold text-white rounded-pill transition-colors disabled:opacity-50"
          style={{ background: '#DC2626' }}
          onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#B91C1C'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#DC2626'; }}>
          {busy ? 'Declaring…' : '🚨 Confirm Emergency'}
        </button>
        <div className="text-[11px] text-ink-2 mt-3 text-center">
          This action notifies the dispatcher immediately
        </div>
      </div>
    </form>
  );
}
