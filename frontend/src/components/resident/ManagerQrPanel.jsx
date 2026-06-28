import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Manager QR tab — preview the resident-facing QR for this waste point and
// save it (download SVG / copy the scan URL). The URL residents scan is the
// plain /r?b=<id> link (no role), so it opens the report form, not this view.

export default function ManagerQrPanel({ wastePointId, name, address }) {
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);

  if (wastePointId == null) {
    return (
      <div className="px-5 pt-6 pb-10 text-sm text-ink-2">
        No waste point linked to this view.
      </div>
    );
  }

  const origin  = typeof window !== 'undefined' ? window.location.origin : '';
  const scanUrl = `${origin}/r?b=${wastePointId}`;

  function downloadSvg() {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr_${wastePointId}_${(name || 'waste_point').replace(/\s+/g, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyUrl() {
    navigator.clipboard?.writeText(scanUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="px-5 pt-6 pb-10 animate-fade-up">
      <div className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#00B14F' }}>
        QR code
      </div>
      <h1 className="text-[22px] font-bold tracking-tightish leading-tight mb-1">
        Scan to report
      </h1>
      <p className="text-sm text-ink-2 mb-5">
        {name || 'This waste point'}
        {address ? ` · ${address}` : ''}
      </p>

      {/* QR preview */}
      <div className="flex flex-col items-center">
        <div ref={qrRef} className="p-3 bg-white border border-hairline rounded-card">
          <QRCodeSVG value={scanUrl} size={200} level="H" includeMargin={false} />
        </div>
        <div className="mt-3 px-3 py-2 bg-surface rounded-btn font-mono text-[11px] text-ink-2 break-all select-all w-full text-center">
          {scanUrl}
        </div>
      </div>

      {/* Save actions */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          onClick={downloadSvg}
          className="py-3 text-[14px] font-bold text-white rounded-pill transition-colors duration-200"
          style={{ background: '#00B14F' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#00873A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}
        >
          Save QR
        </button>
        <button
          onClick={copyUrl}
          className="py-3 text-[14px] font-semibold border border-hairline rounded-pill bg-white hover:bg-surface transition-colors"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
      <div className="text-[12px] text-ink-2 mt-3 text-center leading-snug">
        Print and post this at the bin · residents scan to report
      </div>
    </div>
  );
}
