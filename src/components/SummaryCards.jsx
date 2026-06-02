import { useCountUp } from '../hooks/useCountUp'

const G = '#8CC63F'

function TrendPill({ value, lowerIsBetter = false }) {
  if (value === null || value === undefined) return null
  const isGood = lowerIsBetter ? value <= 0 : value >= 0
  const color  = isGood ? G : '#EF4444'
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
      style={{ color, background: `${color}14`, borderColor: `${color}30` }}
    >
      {value > 0 ? '↑' : '↓'} {Math.abs(value)}{!lowerIsBetter ? '%' : ''}
    </span>
  )
}

function Card({ label, value, sub, icon, accentBorder, trend, lowerIsBetter, delay, decimals = 0 }) {
  const displayed = useCountUp(value, { duration: 1200, delay, decimals })

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-6 flex flex-col gap-3"
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        borderLeft: accentBorder ? `3px solid ${accentBorder}` : undefined,
      }}
    >
      {/* Label + icon */}
      <div className="flex items-start justify-between">
        <span className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em]">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base border border-brand-border bg-brand-bg">
          {icon}
        </div>
      </div>

      {/* Big number + trend */}
      <div className="flex items-end gap-2.5">
        <span className="num text-[52px] font-bold leading-none text-brand-text tracking-tight">
          {decimals > 0 ? displayed.toFixed(decimals) : displayed}
        </span>
        <div className="mb-1.5">
          <TrendPill value={trend} lowerIsBetter={lowerIsBetter} />
        </div>
      </div>

      <p className="text-brand-muted text-[11px]">{sub}</p>
    </div>
  )
}

export default function SummaryCards({ summary, trends }) {
  const { total, positive, frustrated } = summary
  const posRate = total > 0 ? Math.round((positive / total) * 100) : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card
        label="Total Meetings"
        value={total}
        sub="Calls in selected period"
        icon="📞"
        trend={trends.total}
        delay={0}
      />
      <Card
        label="Positive Meetings"
        value={positive}
        sub={`${posRate}% satisfaction rate`}
        icon="✅"
        accentBorder={G}
        trend={trends.positive}
        delay={80}
      />
      <Card
        label="Frustrated Calls"
        value={frustrated}
        sub={frustrated === 0 ? 'All clear this period' : 'Requires immediate follow-up'}
        icon="⚠️"
        accentBorder={frustrated > 0 ? '#EF4444' : undefined}
        trend={trends.frustrated}
        lowerIsBetter
        delay={160}
      />
    </div>
  )
}
