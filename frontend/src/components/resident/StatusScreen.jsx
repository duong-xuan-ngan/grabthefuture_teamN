import { timeAgo } from '../../lib/format.js';

const STATUS_LABEL = {
  received: 'Received',
  clustered: 'Clustered',
  scored: 'Scored',
  assigned: 'Assigned',
  in_transit: 'In transit',
  resolved: 'Resolved',
};

export default function StatusScreen({ report }) {
  if (!report) return null;
  return (
    <div className="mt-7 animate-fade-up">
      <div className="p-4 bg-surface border border-hairline rounded-xl">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3 mb-0.5">
              Report
            </div>
            <div className="text-base font-semibold tracking-tightish truncate">
              {report.bin_name}
            </div>
            <div className="text-xs text-ink-2 truncate">{report.address}</div>
          </div>
          <div className="ml-3 flex-shrink-0">
            <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3 text-right">
              Status
            </div>
            <div className="text-xs font-semibold text-primary mt-0.5">
              {STATUS_LABEL[report.status] || report.status}
            </div>
          </div>
        </div>
        {report.assigned_truck && (
          <div className="mt-3 pt-3 border-t border-hairline text-xs text-ink-2">
            Assigned to <span className="text-ink font-medium">{report.assigned_truck}</span>
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2 mb-3">
          Timeline
        </div>
        <ol className="relative ml-1">
          {(report.timeline || []).map((step, i) => {
            const isLast = i === report.timeline.length - 1;
            return (
              <li key={i} className="relative pl-5 pb-4 last:pb-0">
                {!isLast && (
                  <div className="absolute left-[5px] top-3 bottom-0 w-px bg-hairline" />
                )}
                <div
                  className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                    i === report.timeline.length - 1
                      ? 'bg-primary border-primary'
                      : 'bg-white border-line'
                  }`}
                />
                <div className="text-[13px] font-medium leading-tight">
                  {step.label}
                </div>
                <div className="text-[11px] text-ink-2 num mt-0.5">{timeAgo(step.at)} ago</div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
