import { G, scoreColor } from '../lib/ehUtils'

const GOLD = '#F59E0B'

function SubScoreBar({ label, value, color }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-brand-muted text-[10px] w-20 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-brand-border overflow-hidden">
        <div
          className="h-full rounded-full score-bar-fill"
          style={{ width: `${(value / 10) * 100}%`, background: color }}
        />
      </div>
      <span className="num text-[10px] font-bold flex-shrink-0" style={{ color }}>{value.toFixed(1)}</span>
    </div>
  )
}

export default function TopPerformer({ performer, onEmployeeClick }) {
  if (!performer) {
    return (
      <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-6 flex flex-col items-center justify-center gap-3 min-h-[200px]"
        style={{ animationDelay: '300ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>
        <p className="text-brand-muted text-sm">No data for selected period</p>
      </div>
    )
  }

  const initials = performer.name.includes(' ')
    ? performer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : performer.name.slice(0, 2).toUpperCase()

  const barColor = scoreColor(performer.avgScore)

  return (
    <div
      className="card-hover animate-fade-in-up rounded-2xl border border-brand-border bg-white flex flex-col gap-4 p-6 relative overflow-hidden"
      style={{
        animationDelay: '300ms',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)',
        borderLeft: `3px solid ${G}`,
      }}
    >
      {/* Soft green glow */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-3xl pointer-events-none"
        style={{ background: G, opacity: 0.06 }} />

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
            🏆 Top Performer
          </p>
          <p className="text-brand-muted text-[11px] mt-0.5">Best in selected period</p>
        </div>
        <span className="text-2xl">🥇</span>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
            style={{ background: G }}>
            {initials}
          </div>
          <div className="absolute -top-2 -right-2 text-lg">👑</div>
        </div>
        <div className="text-center">
          <button
            onClick={() => onEmployeeClick?.(performer.name)}
            className="text-brand-text font-bold text-base hover:text-brand-green transition-colors duration-150 underline decoration-dotted underline-offset-2 decoration-brand-muted/50"
          >
            {performer.name}
          </button>
          <p className="text-brand-muted text-[11px] mt-0.5">
            {performer.calls} call{performer.calls !== 1 ? 's' : ''} · {performer.frustrated > 0 ? `${performer.frustrated} frustrated` : 'No frustrated calls'}
          </p>
        </div>
      </div>

      {/* Overall score */}
      <div className="rounded-xl border border-brand-border bg-brand-bg p-3 flex items-center justify-between">
        <span className="text-brand-muted text-xs">Avg Score</span>
        <span className="num text-2xl font-bold" style={{ color: barColor }}>
          {performer.avgScore}
          <span className="text-brand-muted text-sm font-normal"> /10</span>
        </span>
      </div>

      {/* Overall score bar */}
      <div className="h-2.5 rounded-full bg-brand-border overflow-hidden">
        <div className="h-full rounded-full score-bar-fill"
          style={{ width: `${(performer.avgScore / 10) * 100}%`, background: `linear-gradient(90deg, ${G}, ${GOLD})` }} />
      </div>

      {/* Sub-scores (if available) */}
      {(performer.avgComm || performer.avgProf || performer.avgProd || performer.avgCX) && (
        <div className="space-y-1.5">
          <SubScoreBar label="Communication" value={performer.avgComm} color={scoreColor(performer.avgComm || 0)} />
          <SubScoreBar label="Professionalism" value={performer.avgProf} color={scoreColor(performer.avgProf || 0)} />
          <SubScoreBar label="Product Know." value={performer.avgProd} color={scoreColor(performer.avgProd || 0)} />
          <SubScoreBar label="Cx Experience" value={performer.avgCX} color={scoreColor(performer.avgCX || 0)} />
        </div>
      )}

      {/* Latest call summary */}
      {performer.latestSummary && (
        <div className="rounded-xl border border-brand-border bg-brand-bg px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-brand-muted mb-1.5">
            Latest Call{performer.latestCustomer ? ` — ${performer.latestCustomer}` : ''}
          </p>
          <p className="text-[11px] text-brand-heading italic leading-relaxed">
            {performer.latestSummary}
          </p>
        </div>
      )}
    </div>
  )
}
