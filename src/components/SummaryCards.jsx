import { useCountUp } from '../hooks/useCountUp'

const G   = '#8CC63F'
const RED = '#EF4444'
const BLU = '#3B82F6'

function TrendPill({ value, lowerIsBetter = false }) {
  if (value === null || value === undefined) return null
  const isGood = lowerIsBetter ? value <= 0 : value >= 0
  const color  = isGood ? G : RED
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
      style={{ color, background: `${color}14`, borderColor: `${color}30` }}
    >
      {value > 0 ? '↑' : '↓'} {Math.abs(value)}{!lowerIsBetter ? '%' : ''}
    </span>
  )
}

function Card({ label, value, sub, icon, accentColor, trend, lowerIsBetter, delay, decimals = 0 }) {
  const displayed = useCountUp(value, { duration: 1200, delay, decimals })

  return (
    <div
      className="card-hover animate-fade-in-up rounded-2xl border border-brand-border bg-white flex flex-col overflow-hidden"
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)',
        borderTop: `4px solid ${accentColor}`,
      }}
    >
      <div
        className="p-5 sm:p-6 flex flex-col gap-2 sm:gap-3 flex-1"
        style={{ background: `linear-gradient(135deg, ${accentColor}0d 0%, #ffffff 55%)` }}
      >
        {/* Label + icon */}
        <div className="flex items-start justify-between">
          <span className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em]">{label}</span>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}35` }}
          >
            {icon}
          </div>
        </div>

        {/* Number — colored to match the card meaning */}
        <div className="flex items-end gap-2">
          <span
            className="num text-[48px] sm:text-[58px] font-bold leading-none tracking-tight"
            style={{ color: accentColor }}
          >
            {decimals > 0 ? displayed.toFixed(decimals) : displayed}
          </span>
          <div className="mb-1.5">
            <TrendPill value={trend} lowerIsBetter={lowerIsBetter} />
          </div>
        </div>

        <p className="text-brand-muted text-[11px]">{sub}</p>
      </div>
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
        accentColor={BLU}
        trend={trends.total}
        delay={0}
      />
      <Card
        label="Positive Meetings"
        value={positive}
        sub={`${posRate}% satisfaction rate`}
        icon="✅"
        accentColor={G}
        trend={trends.positive}
        delay={80}
      />
      <Card
        label="Frustrated Calls"
        value={frustrated}
        sub={frustrated === 0 ? 'All clear this period' : 'Requires immediate follow-up'}
        icon="⚠️"
        accentColor={frustrated > 0 ? RED : G}
        trend={trends.frustrated}
        lowerIsBetter
        delay={160}
      />
    </div>
  )
}
