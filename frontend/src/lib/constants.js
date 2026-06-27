// Centralised numeric thresholds and labels. These mirror the constants
// described in the Technical Requirements doc; tweak after pilot feedback
// per NFR-09.

export const CAPACITY = {
  // capacity_pct thresholds (0-100)
  warningPct: 70, // amber
  fullPct: 90, // red — truck removed from candidate pool
};

export const PRIORITY = {
  // priority_score thresholds (0-100)
  lowMax: 39, // green:  0-39
  midMax: 69, // amber: 40-69
  // red: 70-100
  highMin: 70,
  criticalMin: 90,
};

export const SEVERITY_COLOR = {
  high: '#DC2626',
  mid: '#D97706',
  low: '#00B14F',
};

export const ISSUE_TYPES = [
  { key: 'overflow', label: 'Overflow', severityBase: 60, hint: 'Bin is spilling over' },
  { key: 'near_full', label: 'Near full', severityBase: 20, hint: 'Will overflow soon' },
  { key: 'bulky', label: 'Bulky waste', severityBase: 40, hint: 'Furniture, large items' },
  { key: 'smell', label: 'Bad smell', severityBase: 40, hint: 'Needs cleaning' },
];

export const BIN_CATEGORIES = {
  small_residential: { label: 'Small residential', defaultKg: 30 },
  medium_residential: { label: 'Medium residential', defaultKg: 75 },
  market_commercial: { label: 'Market / commercial', defaultKg: 150 },
  large_public: { label: 'Large public area', defaultKg: 115 },
};

export function severityFromScore(score) {
  if (score >= PRIORITY.highMin) return 'high';
  if (score > PRIORITY.lowMax) return 'mid';
  return 'low';
}

export function capacityStatus(loadKg, maxKg) {
  const pct = Math.round((loadKg / maxKg) * 100);
  let level = 'available';
  if (pct >= CAPACITY.fullPct) level = 'full';
  else if (pct >= CAPACITY.warningPct) level = 'near_full';
  return { pct, level };
}
