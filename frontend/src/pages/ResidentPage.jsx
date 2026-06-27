import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PhoneFrame from '../components/shared/PhoneFrame.jsx';
import ReportForm from '../components/resident/ReportForm.jsx';
import SuccessScreen from '../components/resident/SuccessScreen.jsx';
import ManagerEmergencySheet from '../components/resident/ManagerEmergencySheet.jsx';
import * as api from '../api/client.js';

// /r?b=042           → public resident report
// /r?b=042&role=manager → same form + emergency declaration button
export default function ResidentPage() {
  const [params] = useSearchParams();
  const binId    = params.get('b') || '042';
  const isManager = params.get('role') === 'manager';
  const navigate = useNavigate();

  const [bin,         setBin]         = useState(null);
  const [report,      setReport]      = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [showEmg,     setShowEmg]     = useState(false);

  useEffect(() => { api.getBinByQr(binId).then(setBin); }, [binId]);

  async function submit(payload) {
    setSubmitting(true);
    const res = await api.createReport({
      bin_id: bin.bin_id,
      waste_point_id: bin.waste_point_id,
      bin_name: bin.name,
      address: bin.address,
      ...payload,
    });
    setSubmitting(false);
    setReport(res);
  }

  async function declareEmergency({ issueType, reason }) {
    if (!bin?.waste_point_id) return;
    await api.adminCreateEmergency(bin.waste_point_id, { reason, issueType });
  }

  return (
    <PhoneFrame>
    <div className="flex-1 flex flex-col text-ink min-h-0 overflow-hidden" style={{ background: '#fff' }}>

      {/* Brand header */}
      <header className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-hairline flex items-center justify-between"
        style={{ background: '#00212F' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-btn flex items-center justify-center flex-shrink-0"
            style={{ background: '#00B14F' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-white">GrabWaste</div>
            {isManager && (
              <div className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: '#00B14F' }}>
                Manager
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isManager && (
            <>
              <button onClick={() => navigate('/r/order')}
                className="text-xs font-medium underline underline-offset-2 transition-colors"
                style={{ color: '#B0C4CC' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#B0C4CC'; }}>
                Request pickup
              </button>
              <button onClick={() => navigate('/r/status')}
                className="text-xs font-medium underline underline-offset-2 transition-colors"
                style={{ color: '#B0C4CC' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#B0C4CC'; }}>
                Check status
              </button>
            </>
          )}
          {isManager && (
            <button onClick={() => navigate('/r/status')}
              className="text-xs font-medium underline underline-offset-2 transition-colors"
              style={{ color: '#B0C4CC' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#B0C4CC'; }}>
              Check status
            </button>
          )}
        </div>
      </header>

      {/* Manager emergency banner */}
      {isManager && !showEmg && !report && (
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
          style={{ background: '#FEF2F2', borderBottom: '1px solid #FCA5A5' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">🚨</span>
            <div>
              <div className="text-[12px] font-bold text-danger">Manager access</div>
              <div className="text-[11px] text-ink-2">You can declare this point an emergency</div>
            </div>
          </div>
          <button
            onClick={() => setShowEmg(true)}
            className="px-3 py-1.5 text-[12px] font-bold text-white rounded-btn flex-shrink-0"
            style={{ background: '#DC2626' }}>
            Declare Emergency
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto scrollbar-thin relative">
        {!report && !showEmg && (
          <ReportForm bin={bin} submitting={submitting} onSubmit={submit} />
        )}
        {report && (
          <SuccessScreen
            report={report}
            onAnother={() => setReport(null)}
            onTrack={() => navigate(`/r/status/${report.id}`)}
          />
        )}
        {showEmg && (
          <ManagerEmergencySheet
            bin={bin}
            onDeclare={declareEmergency}
            onBack={() => setShowEmg(false)}
          />
        )}
      </main>
    </div>
    </PhoneFrame>
  );
}
