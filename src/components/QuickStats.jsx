const G = '#8CC63F'

function fmtTime(totalMins) {
  if (!totalMins) return '0m'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function QuickStats({ stats }) {
  const { avgScore, totalMins, avgDuration, responseRate, totalCalls, callsDelta } = stats

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white px-6 py-5"
      style={{ animationDelay: '240ms', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

      <p className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em] mb-5">Quick Stats — Selected Period</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5 sm:divide-x divide-brand-border">

        {/* Avg Score */}
        <div className="animate-fade-in-up flex flex-col gap-1" style={{ animationDelay: '260ms' }}>
          <div className="flex items-center gap-1.5 text-brand-muted text-[10px] font-bold uppercase tracking-[0.15em]">
            <span>⭐</span> Avg Score
          </div>
          <div className="flex items-baseline gap-1">
            <span className="num text-2xl font-bold text-brand-text">{avgScore.toFixed(1)}</span>
            <span className="text-brand-muted text-sm">/10</span>
          </div>
          <span className="text-brand-muted text-[11px]">Selected period average</span>
        </div>

        {/* Total Talk Time */}
        <div className="animate-fade-in-up sm:pl-8 flex flex-col gap-1" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-1.5 text-brand-muted text-[10px] font-bold uppercase tracking-[0.15em]">
            <span>🕐</span> Total Talk Time
          </div>
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="num text-2xl font-bold text-brand-text">{fmtTime(totalMins)}</span>
          </div>
          <span className="text-brand-muted text-[11px]">
            Avg {avgDuration > 0 ? `${avgDuration} min` : '—'} per call
          </span>
        </div>

        {/* Response Rate */}
        <div className="animate-fade-in-up sm:pl-8 flex flex-col gap-1" style={{ animationDelay: '340ms' }}>
          <div className="flex items-center gap-1.5 text-brand-muted text-[10px] font-bold uppercase tracking-[0.15em]">
            <span>📡</span> Response Rate
          </div>
          <div className="flex items-baseline gap-1">
            <span className="num text-2xl font-bold text-brand-text">{responseRate}</span>
            <span className="num text-lg font-bold" style={{ color: G }}>%</span>
          </div>
          <span className="text-brand-muted text-[11px]">Calls scored / total calls</span>
        </div>

        {/* Calls in period */}
        <div className="animate-fade-in-up sm:pl-8 flex flex-col gap-1" style={{ animationDelay: '380ms' }}>
          <div className="flex items-center gap-1.5 text-brand-muted text-[10px] font-bold uppercase tracking-[0.15em]">
            <span>📊</span> Total Calls
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="num text-2xl font-bold text-brand-text">{totalCalls}</span>
            {callsDelta !== null && (
              <span className="text-[11px] font-bold" style={{ color: callsDelta >= 0 ? G : '#EF4444' }}>
                {callsDelta >= 0 ? '+' : ''}{callsDelta}%
              </span>
            )}
          </div>
          <span className="text-brand-muted text-[11px]">
            {callsDelta !== null ? 'vs previous equivalent period' : 'in selected period'}
          </span>
        </div>

      </div>
    </div>
  )
}
