// Small formatting helpers. Kept pure & dependency-free.

export function formatKg(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString();
}

export function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

export function formatMinutes(value) {
  if (value == null) return '—';
  if (value < 60) return `${value} min`;
  const h = Math.floor(value / 60);
  const m = value % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  const diffMs = Date.now() - t;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export function clsx(...parts) {
  return parts.filter(Boolean).join(' ');
}
