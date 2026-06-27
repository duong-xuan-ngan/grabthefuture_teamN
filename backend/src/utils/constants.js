// ── Configurable constants ─────────────────────────────────────────────────
// Change values here (or via .env) without touching business logic.

module.exports = {
  // H3 geospatial
  H3_RESOLUTION:         parseInt(process.env.H3_RESOLUTION || '9'),
  H3_INITIAL_RING:       2,   // kRing radius for first truck lookup
  H3_FALLBACK_RING:      3,   // expand to if ring-2 returns nothing

  // Truck capacity thresholds (%)
  CAPACITY_WARN_PCT:     parseInt(process.env.CAPACITY_WARN_PCT || '70'),
  CAPACITY_FULL_PCT:     parseInt(process.env.CAPACITY_FULL_PCT || '90'),

  // Routing detour limits (minutes)
  DETOUR_CHEAP_MIN:      parseInt(process.env.DETOUR_CHEAP_MIN || '15'),
  DETOUR_MAX_MIN:        parseInt(process.env.DETOUR_MAX_MIN   || '30'),

  // Hotspot clustering
  CLUSTER_RADIUS_M:      parseInt(process.env.CLUSTER_RADIUS_M    || '50'),
  CLUSTER_WINDOW_MIN:    parseInt(process.env.CLUSTER_WINDOW_MIN  || '30'),

  // Routing re-run trigger
  SCORE_RERUN_THRESHOLD: parseInt(process.env.SCORE_RERUN_THRESHOLD || '70'),

  // Polling intervals (ms)
  TRUCK_POLL_MS:         parseInt(process.env.TRUCK_POLL_INTERVAL_MS     || '60000'),
  DASHBOARD_POLL_MS:     parseInt(process.env.DASHBOARD_POLL_INTERVAL_MS || '10000'),

  // Priority score weights
  SCORE: {
    OVERFLOW_BASE:       60,
    FULL_BASE:           40,
    NEAR_FULL_BASE:      20,
    PER_EXTRA_REPORT:    5,
    MAX_REPORT_BONUS:    20,
    SENSITIVE_AREA:      15,   // within 100 m of market/school/apartment
    TRUCK_FAR_BONUS:     20,   // scheduled truck > 3 h away
    REPEAT_OFFENDER:     10,   // ≥ 3 hotspots in 30 days
  },

  // Bin weight defaults (kg, midpoint of category range)
  BIN_WEIGHT_DEFAULTS: {
    small_residential:  30,   // 20–40 kg
    medium_residential: 75,   // 50–100 kg
    market_commercial:  150,  // 100–200 kg
    large_public:       115,  // 80–150 kg
  },

  // SC-07: unverified report watching window
  SC07_WATCH_MIN: 15,
  SC07_WEIGHT_THRESHOLD_KG: 40,
};
