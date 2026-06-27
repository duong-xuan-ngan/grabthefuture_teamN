// CapacityBar — reusable green/amber/red capacity indicator
// Member B owns this component.

import React from 'react';

/**
 * @param {number} pct  0–100
 * @param {string} label  optional override label
 */
export default function CapacityBar({ pct = 0, label }) {
  const colour =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-400' :
                'bg-green-500';

  const status =
    pct >= 90 ? 'Full' :
    pct >= 70 ? 'Near Full' :
                'Available';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label ?? status}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colour}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
