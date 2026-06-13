import { G } from '../lib/ehUtils'

function fmtTime(totalMins) {
  if (!totalMins) return '0m'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function Stat({ icon, label, value, sub, delta, delay, padLeft }) {
  return (
    <div
      className={`animate-fade-in-up flex flex-col gap-1 ${padLeft ? 'sm:pl-8 sm:border-l sm:border-brand-border' : ''}`}
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
  const scoreColor = avgScore >= 8 ? G : avgScore >= 6 ? '#EAB308' : '#EF4444'

  return (
    <div
      className="card-hover animate-fade-in-up rounded-2xl border border-brand-border bg-white px-6 py-5"
      style={{ animationDelay: '240ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <p className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em] mb-5">
        Quick Stats — Selected Period
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
        <Stat
          icon={<svg viewBox="0 0 24 24" fill="none" stroke={scoreColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 inline"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
          label={`Avg Score${stats.totalCalls ? '' : ''}`}
          value={<span style={{ color: scoreColor }}>{avgScore.toFixed(1)}</span>}
          sub="Overall score / 10"
          delay={260}
        />
        <Stat
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 inline"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          label="Total Talk Time"
          value={fmtTime(totalMins)}
          sub={`Avg ${avgDuration > 0 ? `${avgDuration} min` : '—'} / call`}
          delay={300}
          padLeft
        />
        <Stat
          icon={<svg viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 inline"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
          label="Response Rate"
          value={<><span>{responseRate}</span><span className="text-base font-bold" style={{ color: G }}>%</span></>}
          sub="Calls scored / total"
          delay={340}
          padLeft
        />
        <Stat
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 inline"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
          label="Total Calls"
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
