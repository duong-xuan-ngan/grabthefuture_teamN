import { useState } from 'react';
import { ISSUE_TYPES } from '../../lib/constants.js';
import IssueButton from './IssueButton.jsx';

export default function ReportForm({ bin, submitting, onSubmit }) {
  const [issue, setIssue] = useState('overflow');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ issue_type: issue, description: note, photo });
  }

  function pickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fade-up">
      {/* Title block + bin context */}
      <div className="px-5 pt-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">
          Report an issue
        </div>
        <h1 className="text-[22px] font-semibold tracking-tightish leading-tight">
          What's wrong with this bin?
        </h1>

        <div className="mt-4 px-3.5 py-3 bg-surface border border-hairline rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-hairline flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="4" width="10" height="10" rx="1.5" stroke="#0B0B0A" strokeWidth="1.3" />
              <path d="M5 4V2.5H11V4" stroke="#0B0B0A" strokeWidth="1.3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium">
              {bin?.bin_id ? `Bin ${bin.bin_id}` : 'Loading bin…'}
            </div>
            <div className="text-[11px] text-ink-2 truncate">
              {bin?.address || ' '}
            </div>
          </div>
        </div>
      </div>

      {/* Issue choice */}
      <div className="px-5 pt-5">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2 mb-2.5">
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

      {/* Photo */}
      <div className="px-5 pt-5">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2 mb-2.5">
          Photo <span className="font-normal text-ink-3 tracking-normal">· optional</span>
        </div>
        {photo ? (
          <div className="relative rounded-xl overflow-hidden">
            <img src={photo} alt="" className="w-full aspect-[16/10] object-cover" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-ink/70 text-white text-base flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="w-full aspect-[16/6] bg-surface border border-dashed border-line rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1 text-ink-2 hover:border-ink-2 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 6L9.5 4H14.5L16 6" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="text-xs font-medium">Add a photo</div>
            <input type="file" accept="image/*" capture="environment" hidden onChange={pickPhoto} />
          </label>
        )}
      </div>

      {/* Note */}
      <div className="px-5 pt-5">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2 mb-2.5">
          Note <span className="font-normal text-ink-3 tracking-normal">· optional</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. spilling onto sidewalk"
          className="w-full px-3 py-2.5 text-sm border border-hairline rounded-xl bg-surface resize-none outline-none focus:border-ink"
        />
      </div>

      {/* Submit */}
      <div className="px-5 pt-5 pb-8">
        <div className="text-[11px] text-ink-3 mb-3 leading-snug">
          No account needed. Your location and bin ID are attached automatically.
        </div>
        <button
          type="submit"
          disabled={submitting || !bin}
          className="w-full py-3.5 text-[15px] font-semibold bg-primary text-white rounded-xl tracking-tightish hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {submitting ? 'Sending…' : 'Submit report'}
          {!submitting && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
