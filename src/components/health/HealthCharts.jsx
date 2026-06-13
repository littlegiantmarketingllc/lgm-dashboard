import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine, Legend,
} from 'recharts'
import { CHURN_TXN_THRESHOLD } from '../../lib/healthConfig'

const G   = '#8CC63F'
const AMB = '#EAB308'
const RED = '#EF4444'

function fmt(n) { return '$' + Math.round(n).toLocaleString() }

function Card({ title, subtitle, children, delay = 0 }) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="px-5 sm:px-6 py-4 border-b border-brand-border">
        <h3 className="text-brand-heading font-semibold text-sm">{title}</h3>
        {subtitle && <p className="text-brand-muted text-[11px] mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-5 sm:px-6 py-5">
        {children}
      </div>
    </div>
  )
}

const TT_STYLE = { fontSize: 11, border: '1px solid #E5E7E5', borderRadius: 8, background: '#fff' }

// ── 1. Health Distribution (donut) ───────────────────────────────────────────
function HealthDistribution({ accounts }) {
  const counts = {
    Healthy: accounts.filter(a => a._health?.band === 'healthy').length,
    Watch:   accounts.filter(a => a._health?.band === 'watch').length,
    'At-Risk': accounts.filter(a => a._health?.band === 'at_risk').length,
  }
  const data = [
    { name: 'Healthy',  value: counts.Healthy,   color: G   },
    { name: 'Watch',    value: counts.Watch,      color: AMB },
    { name: 'At-Risk',  value: counts['At-Risk'], color: RED },
  ].filter(d => d.value > 0)

  return (
    <Card title="Health Distribution" subtitle="Accounts by health band" delay={620}>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-36 h-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                dataKey="value" paddingAngle={3}>
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={TT_STYLE} formatter={(v, n) => [v + ' accounts', n]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3 w-full">
          {[
            { label: 'Healthy (80+)',  count: counts.Healthy,   color: G   },
            { label: 'Watch (50–79)',  count: counts.Watch,     color: AMB },
            { label: 'At-Risk (<50)', count: counts['At-Risk'], color: RED },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-[12px] text-brand-heading">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 rounded-full bg-brand-border overflow-hidden">
                  <div className="h-full rounded-full score-bar-fill"
                    style={{ width: `${accounts.length ? (count / accounts.length) * 100 : 0}%`, background: color }} />
                </div>
                <span className="num text-[12px] font-bold w-6 text-right" style={{ color }}>{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// ── 2. Revenue by Health Band (bar) ──────────────────────────────────────────
function RevenueByBand({ accounts }) {
  const bands = { 'Healthy': 0, 'Watch': 0, 'At-Risk': 0 }
  for (const a of accounts) {
    if (a._health?.band === 'healthy')  bands['Healthy']  += a.totalRev || 0
    else if (a._health?.band === 'watch') bands['Watch']  += a.totalRev || 0
    else                                  bands['At-Risk'] += a.totalRev || 0
  }
  const data = [
    { name: 'Healthy',  rev: Math.round(bands['Healthy']),  fill: G   },
    { name: 'Watch',    rev: Math.round(bands['Watch']),    fill: AMB },
    { name: 'At-Risk',  rev: Math.round(bands['At-Risk']),  fill: RED },
  ]

  return (
    <Card title="Revenue by Health Band" subtitle="MRR distribution across risk segments" delay={660}>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E5" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            formatter={(v) => [fmt(v), 'Revenue']}
            contentStyle={TT_STYLE}
          />
          <Bar dataKey="rev" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── 3. Transactions Histogram ─────────────────────────────────────────────────
function TxnHistogram({ accounts }) {
  const buckets = [
    { label: '0',      min: 0,     max: 500    },
    { label: '500',    min: 500,   max: 1000   },
    { label: '1k',     min: 1000,  max: 2000   },
    { label: '2k',     min: 2000,  max: 3500   },
    { label: '3.5k',   min: 3500,  max: 5000   },
    { label: '5k',     min: 5000,  max: 8000   },
    { label: '8k',     min: 8000,  max: 12000  },
    { label: '12k+',   min: 12000, max: Infinity },
  ]

  const data = buckets.map(b => ({
    label: b.label,
    count: accounts.filter(a => a.transactions >= b.min && a.transactions < b.max).length,
    isRisk: b.max <= CHURN_TXN_THRESHOLD || b.min < CHURN_TXN_THRESHOLD,
    fill: b.min < CHURN_TXN_THRESHOLD ? RED : G,
  }))

  // Find the bucket index where the threshold sits for the reference line
  const thresholdBucket = buckets.findIndex(b => b.min <= CHURN_TXN_THRESHOLD && b.max > CHURN_TXN_THRESHOLD)

  return (
    <Card title="Transaction Distribution" subtitle={`Vertical line = ${CHURN_TXN_THRESHOLD.toLocaleString()} transaction threshold`} delay={700}>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E5" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            formatter={(v) => [v + ' accounts', 'Count']}
            labelFormatter={(l) => `${l} transactions`}
            contentStyle={TT_STYLE}
          />
          <ReferenceLine
            x={data[thresholdBucket]?.label}
            stroke={AMB}
            strokeDasharray="4 3"
            strokeWidth={2}
            label={{ value: '3.5k threshold', position: 'insideTopRight', fontSize: 9, fill: AMB }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── Composed export ───────────────────────────────────────────────────────────
export default function HealthCharts({ accounts }) {
  if (!accounts.length) return null
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
      <HealthDistribution accounts={accounts} />
      <RevenueByBand      accounts={accounts} />
      <TxnHistogram       accounts={accounts} />
    </div>
  )
}
