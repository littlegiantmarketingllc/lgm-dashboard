const G = '#8CC63F'

function fmtTime(totalMins) {
  if (!totalMins) return '0m'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function Stat({ icon, label, value, sub, delta, delay, padLeft }) {
  return (
    <div
      className={`animate-fade-in-up flex flex-col gap-1 ${padLeft ? 'sm:pl-8' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-1.5 text-brand-muted text-[10px] font-bold uppercase tracking-[0.15em]">
        <span>{icon}</span> {label}
      </div>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="num text-xl sm:text-2xl font-bold text-brand-text">{value}</span>
        {delta !== undefined && delta !== null && (
          <span className="text-[11px] font-bold" style={{ color: delta >= 0 ? G : '#EF4444' }}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <span className="text-brand-muted text-[11px] leading-snug">{sub}</span>
    </div>
  )
}

export default function QuickStats({ stats }) {
  const { avgScore, totalMins, avgDuration, responseRate, totalCalls, callsDelta } = stats

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white px-4 sm:px-6 py-5"
      style={{ animationDelay: '240ms', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <p className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em] mb-4 sm:mb-5">
        Quick Stats — Selected Period
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-5 sm:divide-x divide-brand-border">
        <Stat
          icon="⭐" label="Avg Score"
          value={avgScore.toFixed(1)}
          sub="Selected period average"
          delay={260}
        />
        <Stat
          icon="🕐" label="Total Talk Time"
          value={fmtTime(totalMins)}
          sub={`Avg ${avgDuration > 0 ? `${avgDuration} min` : '—'} / call`}
          delay={300}
          padLeft
        />
        <Stat
          icon="📡" label="Response Rate"
          value={<><span>{responseRate}</span><span className="text-base font-bold" style={{ color: G }}>%</span></>}
          sub="Calls scored / total"
          delay={340}
          padLeft
        />
        <Stat
          icon="📊" label="Total Calls"
          value={totalCalls}
          sub={callsDelta !== null ? 'vs previous period' : 'in selected period'}
          delta={callsDelta}
          delay={380}
          padLeft
        />
      </div>
    </div>
  )
}
