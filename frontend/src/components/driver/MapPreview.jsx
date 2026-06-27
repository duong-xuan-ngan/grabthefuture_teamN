// A purely illustrative inline-SVG map preview used at the top of a task
// detail screen. The real driver app can swap this for a Leaflet pane.

export default function MapPreview({ score, distanceKm = 1.2, etaMin = 4 }) {
  return (
    <div className="relative h-[160px] bg-surface overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 340 160" preserveAspectRatio="xMidYMid slice">
        <rect width="340" height="160" fill="#EFEFE8" />
        <path d="M-10 60 Q 60 50 130 70 T 280 80 L 360 75" stroke="#FFFFFF" strokeWidth="14" fill="none" />
        <path d="M80 -10 Q 90 50 100 90 T 130 200" stroke="#FFFFFF" strokeWidth="10" fill="none" />
        <path d="M200 -10 Q 210 60 220 110 T 250 200" stroke="#FFFFFF" strokeWidth="10" fill="none" />
        <path d="M-10 120 L 360 125" stroke="#FFFFFF" strokeWidth="8" fill="none" />

        <rect x="20" y="10" width="40" height="30" fill="#E5E5DE" rx="2" />
        <rect x="70" y="20" width="30" height="20" fill="#E5E5DE" rx="2" />
        <rect x="240" y="20" width="50" height="35" fill="#E5E5DE" rx="2" />
        <rect x="20" y="135" width="60" height="20" fill="#E5E5DE" rx="2" />
        <rect x="160" y="135" width="80" height="20" fill="#E5E5DE" rx="2" />

        {/* Truck */}
        <g transform="translate(60, 70)">
          <circle r="14" fill="#FFFFFF" stroke="#0B0B0A" strokeWidth="1.5" />
          <text textAnchor="middle" dy="3" fontSize="10" fontWeight="600" fontFamily="Inter">
            B
          </text>
        </g>
        {/* Route */}
        <path d="M60 70 Q 130 75 220 80" stroke="#0B0B0A" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
        {/* Hotspot */}
        <g transform="translate(220, 80)">
          <circle r="22" fill="#B91C1C" opacity="0.18" />
          <circle r="16" fill="#B91C1C" stroke="#FFFFFF" strokeWidth="2" />
          <text textAnchor="middle" dy="4" fontSize="11" fontWeight="700" fontFamily="Inter" fill="#FFFFFF">
            {score}
          </text>
        </g>
      </svg>
      <div className="absolute top-3 left-3 bg-white/95 border border-line px-2 py-1 rounded-md text-[11px] text-ink font-medium num">
        {distanceKm} km · {etaMin} min
      </div>
    </div>
  );
}
