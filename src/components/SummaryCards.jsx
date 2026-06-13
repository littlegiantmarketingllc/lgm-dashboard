import { useCountUp } from '../hooks/useCountUp'
import { G } from '../lib/ehUtils'

const RED = '#EF4444'
const BLU = '#3B82F6'

function TrendPill({ value, lowerIsBetter = false }) {
  if (value === null || value === undefined) return null
  const isGood  = lowerIsBetter ? value <= 0 : value >= 0
  const color   = isGood ? G : RED
  const sign    = value > 0 ? '↑' : '↓'
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
      style={{ color, background: `${color}14`, borderColor: `${color}30` }}
    >
      {sign} {Math.abs(value)}{!lowerIsBetter ? '%' : ''}
    </span>
  )
}

function Card({ label, value, sub, icon, accentBorder, trend, lowerIsBetter, delay, decimals = 0 }) {
  const displayed = useCountUp(typeof value === 'number' ? value : 0, { duration: 1200, delay, decimals })

  return (
    <div
      className="card-hover animate-fade-in-up rounded-2xl border border-brand-border bg-white p-6 flex flex-col gap-3"
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)',
        borderLeft: accentBorder ? `3px solid ${accentBorder}` : undefined,
      }}
    >
      {/* Label */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em]">{label}</p>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentBorder || BLU}16`, border: `1px solid ${accentBorder || BLU}28` }}
        >
          {icon}
        </div>
      </div>

      {/* Number + trend */}
      <div className="flex items-end gap-2">
        <span
          className="num leading-none tracking-tight font-bold"
          style={{ fontSize: '2.75rem', color: accentBorder || BLU }}
        >
          {decimals > 0 ? displayed.toFixed(decimals) : displayed}
        </span>
        <div className="mb-1">
          <TrendPill value={trend} lowerIsBetter={lowerIsBetter} />
        </div>
      </div>

      <p className="text-brand-muted text-[11px] leading-snug">{sub}</p>
    </div>
  )
}

export default function SummaryCards({ summary, trends }) {
  const { total, positive, frustrated } = summary
  const posRate = total > 0 ? Math.round((positive / total) * 100) : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
      <Card
        label="Total Meetings"
        value={total}
        sub="Unique meetings this period"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.07 3.38 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/></svg>}
        accentBorder={BLU}
        trend={trends.total}
        delay={0}
      />
      <Card
        label="Positive Meetings"
        value={positive}
        sub={`${posRate}% satisfaction rate`}
        icon={<svg viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>}
        accentBorder={G}
        trend={trends.positive}
        delay={80}
      />
      <Card
        label="Frustrated Calls"
        value={frustrated}
        sub={frustrated === 0 ? 'All clear this period' : 'Require follow-up'}
        icon={<svg viewBox="0 0 24 24" fill="none" stroke={frustrated > 0 ? RED : G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        accentBorder={frustrated > 0 ? RED : G}
        trend={trends.frustrated}
        lowerIsBetter
        delay={160}
      />
    </div>
  )
}
