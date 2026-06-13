import { useMemo } from 'react'
import { Phone, TrendingUp, AlertTriangle, UserX, BookOpen } from 'lucide-react'
import { uniqueMeetingIds } from '../../lib/qcUtils'
import { useCountUp } from '../../hooks/useCountUp'

// Animated circular ring — used on the Score card
function ScoreRing({ pct, color, size = 44 }) {
  const r    = (size - 5) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg
      width={size} height={size}
      style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={`${color}22`} strokeWidth={3.5} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={3.5}
        strokeLinecap="round"
        strokeDasharray={`${Math.max(0, pct) * circ} ${circ}`}
        style={{ transition: 'stroke-dasharray 1.3s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  )
}

function Card({ Icon, label, value, sub, accent, pulse, delay, decimals = 0, ring = false, ringMax = 10 }) {
  const numericVal = typeof value === 'number' ? value : 0
  const displayed  = useCountUp(numericVal, { duration: 1100, delay, decimals })
  const displayStr = typeof value === 'number'
    ? (decimals > 0 ? displayed.toFixed(decimals) : String(displayed))
    : (value || '—')

  return (
    <div
      className="card-hover animate-fade-in-up rounded-2xl border border-brand-border bg-white flex flex-col min-w-0 overflow-hidden"
      style={{
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)',
        borderTop: `4px solid ${accent}`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        className="p-5 flex flex-col gap-2.5 flex-1"
        style={{ background: `linear-gradient(135deg, ${accent}0d 0%, #ffffff 58%)` }}
      >
        {/* Label + icon */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em] leading-snug pt-0.5 max-w-[80%]">
            {label}
          </span>

          {ring ? (
            /* Circular ring with icon inside — Score card */
            <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0">
              <ScoreRing pct={numericVal / ringMax} color={accent} size={44} />
              <div style={{ color: accent, position: 'relative', zIndex: 1 }}>
                <Icon size={15} strokeWidth={2.5} />
              </div>
            </div>
          ) : (
            /* Regular square icon badge */
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${accent}18`, border: `1px solid ${accent}30`, color: accent }}
            >
              <Icon size={16} strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Number */}
        <div className="flex items-end gap-1.5 mt-0.5">
          <span
            className="num font-bold leading-none tracking-tight"
            style={{ color: accent, fontSize: '40px', lineHeight: 1 }}
          >
            {displayStr}
          </span>
          {ring && typeof value === 'number' && (
            <span className="mb-0.5 text-brand-muted text-[13px] font-semibold leading-none">/10</span>
          )}
          {pulse && (
            <span
              className="mb-1.5 w-2.5 h-2.5 rounded-full animate-pulse-dot flex-shrink-0"
              style={{ background: accent }}
            />
          )}
        </div>

        {sub && (
          <p className="text-brand-muted text-[11px] leading-tight -mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  )
}

export default function KPICards({ calls }) {
  const stats = useMemo(() => {
    if (!calls.length) return { totalCalls: 0, avgScore: 0, actionRequired: 0, frustrated: 0, needsCoaching: 0 }

    const totalCalls     = uniqueMeetingIds(calls).length
    const avgScore       = calls.length
      ? +(calls.reduce((s, c) => s + c.overallScore, 0) / calls.length).toFixed(1)
      : 0
    const actionRequired = calls.filter(
      c => c.status === 'Pending' || c.status === 'Escalated' || c.status === 'Action Required'
    ).length
    const frustrated     = calls.filter(c => c.frustratedFlag).length
    const needsCoaching  = new Set(
      calls.filter(c => c.coachingFlag).map(c => c.employee)
    ).size

    return { totalCalls, avgScore, actionRequired, frustrated, needsCoaching }
  }, [calls])

  const scoreAccent = stats.avgScore >= 8 ? '#8CC63F' : stats.avgScore >= 6 ? '#EAB308' : '#EF4444'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
      <Card
        Icon={Phone}
        label="Total Calls"
        value={stats.totalCalls}
        sub="Unique meeting IDs"
        accent="#3B82F6"
        delay={0}
      />
      <Card
        Icon={TrendingUp}
        label="Avg Overall Score"
        value={stats.avgScore || 0}
        sub="Out of 10, all employees"
        accent={scoreAccent}
        ring
        ringMax={10}
        decimals={1}
        delay={60}
      />
      <Card
        Icon={AlertTriangle}
        label="Action Required"
        value={stats.actionRequired}
        sub="Pending + Escalated"
        accent={stats.actionRequired > 0 ? '#EF4444' : '#8CC63F'}
        pulse={stats.actionRequired > 0}
        delay={120}
      />
      <Card
        Icon={UserX}
        label="Frustrated Customers"
        value={stats.frustrated}
        sub="Frustrated flag = true"
        accent={stats.frustrated > 0 ? '#EF4444' : '#8CC63F'}
        pulse={stats.frustrated > 0}
        delay={180}
      />
      <Card
        Icon={BookOpen}
        label="Needs Coaching"
        value={stats.needsCoaching}
        sub="Unique employees flagged"
        accent={stats.needsCoaching > 0 ? '#EAB308' : '#8CC63F'}
        pulse={stats.needsCoaching > 0}
        delay={240}
      />
    </div>
  )
}
