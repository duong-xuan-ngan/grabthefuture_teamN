import { useState } from 'react';
import * as api from '../../api/client.js';

export default function Topbar({ onLogout }) {
  const [exporting, setExporting] = useState(false);
  const date = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  async function handleExport() {
    setExporting(true);
    try {
      await api.exportCsv();
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="h-[52px] flex-shrink-0 border-b border-hairline bg-white px-6 flex items-center justify-between shadow-header">
      <div className="flex items-center gap-2.5">
        <div className="text-sm font-bold tracking-tightish text-ink">Operations</div>
        <div className="text-xs text-ink-2">·</div>
        <div className="text-xs text-ink-2 num">{date}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-hairline rounded-btn text-xs text-ink-2 bg-surface">
          <div className="w-1.5 h-1.5 rounded-full wh-pulse" style={{ color: '#00B14F', background: '#00B14F' }} />
          <span>Live · 10s</span>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-hairline rounded-btn text-xs text-ink-2 bg-white hover:bg-surface hover:text-ink transition-colors duration-200 disabled:opacity-50"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1.5V8M6 8L3.5 5.5M6 8L8.5 5.5M2 9.5V10.5H10V9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
        {onLogout && (
          <button
            onClick={onLogout}
            className="px-3 py-1.5 border border-hairline rounded-btn text-xs text-ink-2 bg-white hover:bg-surface hover:text-ink transition-colors duration-200"
          >
            Log out
          </button>
        )}
      </div>
    </div>
  );
}
