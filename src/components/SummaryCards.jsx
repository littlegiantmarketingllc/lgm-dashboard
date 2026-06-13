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

function Card({ label, value, sub, icon, accentBorder, iconBg, iconColor, trend, lowerIsBetter, delay, decimals = 0 }) {
  const displayed = useCountUp(value, { duration: 1200, delay, decimals })

  return (
    <div
      className="card-hover animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5 sm:p-6 flex flex-col gap-2 sm:gap-3"
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)',
        borderLeft: accentBorder ? `3px solid ${accentBorder}` : undefined,
      }}
    >
      {/* Label + icon */}
      <div className="flex items-start justify-between">
        <span className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em]">{label}</span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{
            background: iconBg || '#F4F6F4',
            border: `1px solid ${iconColor ? iconColor + '30' : '#E5E7E5'}`,
          }}
        >
          {icon}
        </div>
      </div>

      {/* Number + trend */}
      <div className="flex items-end gap-2">
        <span className="num text-[40px] sm:text-[52px] font-bold leading-none text-brand-text tracking-tight">
          {decimals > 0 ? displayed.toFixed(decimals) : displayed}
        </span>
        <div className="mb-1">
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <Card
        label="Total Meetings"
        value={total}
        sub="Calls in selected period"
        icon="📞"
        iconBg="#EFF6FF"
        iconColor="#3B82F6"
        trend={trends.total}
        delay={0}
      />
      <Card
        label="Positive Meetings"
        value={positive}
        sub={`${posRate}% satisfaction rate`}
        icon="✅"
        iconBg={`${G}15`}
        iconColor={G}
        accentBorder={G}
        trend={trends.positive}
        delay={80}
      />
      <Card
        label="Frustrated Calls"
        value={frustrated}
        sub={frustrated === 0 ? 'All clear this period' : 'Requires immediate follow-up'}
        icon="⚠️"
        iconBg={frustrated > 0 ? '#FEF2F2' : '#F4F6F4'}
        iconColor={frustrated > 0 ? '#EF4444' : undefined}
        accentBorder={frustrated > 0 ? '#EF4444' : undefined}
        trend={trends.frustrated}
        lowerIsBetter
        delay={160}
      />
    </div>
  )
}
