// ResidentPage — unauthenticated QR report form
// Member A owns this page. Opened via QR scan: /report?bin=42&lat=10.77&lng=106.70

import React, { useState } from 'react';
import { submitReport } from '../api/client';

const ISSUE_TYPES = [
  { value: 'overflow',    label: '🚯 Overflow' },
  { value: 'near_full',   label: '📦 Near Full' },
  { value: 'bulky_waste', label: '🛋️ Bulky Waste' },
  { value: 'bad_smell',   label: '💨 Bad Smell' },
];

export default function ResidentPage() {
  const params      = new URLSearchParams(window.location.search);
  const binId       = params.get('bin');
  const lat         = params.get('lat');
  const lng         = params.get('lng');

  const [issueType,    setIssueType]    = useState('overflow');
  const [description,  setDescription]  = useState('');
  const [photo,        setPhoto]        = useState(null);
  const [submitted,    setSubmitted]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('waste_point_id', binId);
      fd.append('issue_type', issueType);
      fd.append('description', description);
      fd.append('lat', lat);
      fd.append('lng', lng);
      if (photo) fd.append('image', photo);
      await submitReport(fd);
      setSubmitted(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 p-6">
        <div className="text-center space-y-3">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-bold text-green-800">Thank you!</h1>
          <p className="text-green-700 text-sm">Your report has been received. Our team will respond shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col p-6 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Report a Bin Issue</h1>
      <p className="text-sm text-gray-500 mb-6">Bin #{binId}</p>

      {/* Issue type */}
      <label className="text-sm font-medium text-gray-700 mb-2">Issue Type</label>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {ISSUE_TYPES.map(it => (
          <button
            key={it.value}
            onClick={() => setIssueType(it.value)}
            className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
              issueType === it.value
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <label className="text-sm font-medium text-gray-700 mb-2">Note (optional)</label>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={3}
        placeholder="Describe the issue..."
        className="border border-gray-200 rounded-xl px-3 py-2 text-sm mb-5 resize-none"
      />

      {/* Photo */}
      <label className="text-sm font-medium text-gray-700 mb-2">Photo (optional)</label>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={e => setPhoto(e.target.files?.[0] ?? null)}
        className="text-sm mb-6"
      />

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-blue-600 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl text-base min-h-[56px]"
      >
        {loading ? 'Submitting…' : 'Submit Report'}
      </button>
    </div>
  );
}
