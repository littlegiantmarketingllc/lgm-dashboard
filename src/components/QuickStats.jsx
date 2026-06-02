const G = '#8CC63F'

export default function QuickStats({ stats }) {
  const { avgScore, totalMins, callsThisWeek, callsDelta } = stats
  const hours = Math.floor(totalMins / 60)
  const mins  = totalMins % 60

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white px-6 py-5"
      style={{
        animationDelay: '240ms',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <p className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em] mb-5">Quick Stats</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5 sm:divide-x divide-brand-border">

        {/* Avg Score */}
        <div className="animate-fade-in-up flex flex-col gap-1" style={{ animationDelay: '260ms' }}>
          <div className="flex items-center gap-1.5 text-brand-muted text-[10px] font-bold uppercase tracking-[0.15em]">
            <span>⭐</span> Avg Score — Week
          </div>
          <div className="flex items-baseline gap-1">
            <span className="num text-2xl font-bold text-brand-text">{avgScore.toFixed(1)}</span>
            <span className="text-brand-muted text-sm">/10</span>
          </div>
          <span className="text-brand-muted text-[11px]">This week's average</span>
        </div>

        {/* Talk Time */}
        <div className="animate-fade-in-up sm:pl-8 flex flex-col gap-1" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-1.5 text-brand-muted text-[10px] font-bold uppercase tracking-[0.15em]">
            <span>🕐</span> Total Talk Time
          </div>
          <div className="flex items-baseline gap-1">
            <span className="num text-2xl font-bold text-brand-text">{hours}h</span>
            <span className="num text-lg font-semibold text-brand-muted">{mins}m</span>
          </div>
          <span className="text-brand-muted text-[11px]">Est. ~32 min / call</span>
        </div>

        {/* Response Rate */}
        <div className="animate-fade-in-up sm:pl-8 flex flex-col gap-1" style={{ animationDelay: '340ms' }}>
          <div className="flex items-center gap-1.5 text-brand-muted text-[10px] font-bold uppercase tracking-[0.15em]">
            <span>📡</span> Response Rate
          </div>
          <div className="flex items-baseline gap-1">
            <span className="num text-2xl font-bold text-brand-text">98</span>
            <span className="num text-lg font-bold" style={{ color: G }}>%</span>
          </div>
          <span className="text-brand-muted text-[11px]">Calls answered / scheduled</span>
        </div>

        {/* Calls vs Last Week */}
        <div className="animate-fade-in-up sm:pl-8 flex flex-col gap-1" style={{ animationDelay: '380ms' }}>
          <div className="flex items-center gap-1.5 text-brand-muted text-[10px] font-bold uppercase tracking-[0.15em]">
            <span>📊</span> Calls vs Last Week
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="num text-2xl font-bold text-brand-text">{callsThisWeek}</span>
            {callsDelta !== null && (
              <span className="text-[11px] font-bold" style={{ color: callsDelta >= 0 ? G : '#EF4444' }}>
                {callsDelta >= 0 ? '+' : ''}{callsDelta}%
              </span>
            )}
          </div>
          <span className="text-brand-muted text-[11px]">Calls placed this week</span>
        </div>

      </div>
    </div>
  )
}
