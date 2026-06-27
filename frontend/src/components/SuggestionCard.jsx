// SuggestionCard — dispatcher routing suggestion with Approve / Reject
// Member B owns this component.

import React from 'react';
import CapacityBar from './CapacityBar';
import { approveSuggestion, rejectSuggestion } from '../api/client';

const SCENARIO_LABELS = {
  'SC-01': 'Keep route — truck arriving soon',
  'SC-02': 'Reorder stops — cheap detour available',
  'SC-03': 'Reassign — closer or lighter truck found',
  'SC-04': '⚠️ Manual decision required — no feasible truck in range',
  'SC-05': 'Multiple hotspots — greedy assignment',
  'SC-06': '⚠️ Truck near capacity — consider swapping heavy stops',
  'SC-07': 'Watching — single unverified report',
};

/**
 * @param {object} suggestion  from routing engine
 * @param {function} onDone    called after approve or reject
 */
export default function SuggestionCard({ suggestion, onDone }) {
  if (!suggestion) return null;

  async function handleApprove() {
    await approveSuggestion(suggestion.id);
    onDone?.();
  }

  async function handleReject() {
    await rejectSuggestion(suggestion.id);
    onDone?.();
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-3">
      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
        {suggestion.scenario}
      </div>
      <p className="text-sm text-gray-800">{SCENARIO_LABELS[suggestion.scenario]}</p>

      {suggestion.truck_id && (
        <div className="text-sm text-gray-600 space-y-1">
          <div>Truck: <span className="font-medium">{suggestion.truck_name ?? suggestion.truck_id}</span></div>
          <div>Detour: <span className="font-medium">+{suggestion.detour_min} min</span></div>
          <CapacityBar pct={suggestion.capacity_pct} />
        </div>
      )}

      {suggestion.action !== 'watching' && suggestion.action !== 'keep_route' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleApprove}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            ✓ Approve
          </button>
          <button
            onClick={handleReject}
            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium py-2 rounded-lg transition-colors"
          >
            ✗ Reject
          </button>
        </div>
      )}
    </div>
  );
}
