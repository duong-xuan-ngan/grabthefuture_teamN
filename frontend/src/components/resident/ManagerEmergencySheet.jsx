import { useState } from 'react';
import { ISSUE_TYPES } from '../../lib/constants.js';
import IssueButton from './IssueButton.jsx';

export default function ManagerEmergencySheet({ bin, onDeclare, onBack }) {
  const [issue,  setIssue]  = useState('overflow');
  const [reason, setReason] = useState('');
  const [busy,   setBusy]   = useState(false);
  const [done,   setDone]   = useState(false);

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
      <div className="flex flex-col items-center text-center px-5 pt-10 pb-8 animate-fade-up">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: '#FEE2E2' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 4L25 10V18L14 24L3 18V10L14 4Z" fill="#DC2626" />
            <path d="M14 9V15" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="14" cy="19" r="1.3" fill="white" />
          </svg>
        </div>
        <div className="text-[22px] font-bold tracking-tightish text-ink mb-1">Emergency Declared</div>
        <p className="text-[13px] text-ink-2 leading-snug max-w-[260px] mb-6">
          Priority-100 hotspot created for <strong>{bin?.name || 'this point'}</strong>.
          The nearest truck will be dispatched automatically.
        </p>

        <div className="w-full px-4 py-3.5 bg-danger-soft border border-hairline rounded-card text-left mb-6"
          style={{ borderLeftWidth: 3, borderLeftColor: '#DC2626' }}>
          <div className="text-[11px] font-bold uppercase tracking-widest text-danger mb-1">Declared issue</div>
          <div className="text-[14px] font-semibold text-ink">
            {ISSUE_TYPES.find(t => t.key === issue)?.label}
          </div>
          {reason && (
            <div className="text-[12px] text-ink-2 mt-1">"{reason}"</div>
          )}
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#DC2626' }} />
            <span className="text-[11px] font-bold text-danger">Priority 100 · Active</span>
          </div>
        </div>

        <button onClick={onBack}
          className="w-full py-3.5 text-[15px] font-bold text-white rounded-pill transition-colors duration-200"
          style={{ background: '#00B14F' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#00873A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}>
          Back to status
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="animate-fade-up">

      {/* Title block — same layout as ReportForm */}
      <div className="px-5 pt-6">
        <button type="button" onClick={onBack}
          className="text-[13px] text-ink-2 mb-4 flex items-center gap-1 hover:text-ink transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.5 3.5L5 7L8.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to status
        </button>

        <div className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#DC2626' }}>
          Declare emergency
        </div>
        <h1 className="text-[22px] font-bold tracking-tightish leading-tight text-ink">
          What's the issue here?
        </h1>

        {/* Bin context card — identical to ReportForm */}
        <div className="mt-4 px-3.5 py-3 bg-surface border border-hairline rounded-card flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-hairline flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="4" width="10" height="10" rx="1.5" stroke="#333" strokeWidth="1.3" />
              <path d="M5 4V2.5H11V4" stroke="#333" strokeWidth="1.3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-ink">
              {bin?.name || 'Loading…'}
            </div>
            <div className="text-[11px] text-ink-2 truncate">{bin?.address || ' '}</div>
          </div>
          <div className="flex-shrink-0 px-2 py-0.5 rounded-pill text-[10px] font-bold text-white"
            style={{ background: '#DC2626' }}>
            EMG
          </div>
        </div>
      </div>

      {/* Issue choice — same grid as ReportForm using IssueButton */}
      <div className="px-5 pt-5">
        <div className="text-[11px] font-semibold tracking-widest uppercase text-ink-2 mb-2.5">
          Issue
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ISSUE_TYPES.map((t) => (
            <IssueButton
              key={t.key}
              label={t.label}
              hint={t.hint}
              selected={issue === t.key}
              onClick={() => setIssue(t.key)}
            />
          ))}
        </div>
      </div>

      {/* Reason — same as ReportForm "Note" field */}
      <div className="px-5 pt-5">
        <div className="text-[11px] font-semibold tracking-widest uppercase text-ink-2 mb-2.5">
          Reason <span className="font-normal text-ink-3 tracking-normal">· optional</span>
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="e.g. Concert just ended — expect major overflow in 20 min"
          className="w-full px-3 py-2.5 text-sm border border-hairline rounded-card bg-surface resize-none outline-none focus:border-danger transition-colors"
        />
      </div>

      {/* Submit — same padding/structure as ReportForm */}
      <div className="px-5 pt-6 pb-8">
        <button type="submit" disabled={busy || !bin}
          className="w-full py-4 text-[17px] font-bold text-white rounded-pill transition-colors duration-200 disabled:opacity-50"
          style={{ background: '#DC2626' }}
          onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#B91C1C'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#DC2626'; }}>
          {busy ? 'Declaring…' : '🚨 Confirm Emergency'}
        </button>
        <div className="text-[12px] text-ink-2 mt-3 text-center leading-snug">
          Creates a priority-100 hotspot · dispatcher notified immediately
        </div>
      </div>
    </form>
  );
}
