export default function Topbar() {
  const date = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return (
    <div className="h-[52px] flex-shrink-0 border-b border-hairline px-6 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="text-sm font-semibold tracking-tightish">Operations</div>
        <div className="text-xs text-ink-3">·</div>
        <div className="text-xs text-ink-2 num">{date}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 border border-hairline rounded-md text-xs text-ink-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary text-primary wh-pulse" />
          <span>Live · polling 10s</span>
        </div>
      </div>
    </div>
  );
}
