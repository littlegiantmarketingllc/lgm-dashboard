import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts'
import { format, parseISO, isValid } from 'date-fns'
import InfoTip from './InfoTip'

const G   = '#8CC63F'
const AMB = '#EAB308'
const RED = '#EF4444'

function Card({ title, subtitle, infoText, children, delay = 0 }) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="px-5 sm:px-6 py-4 border-b border-brand-border flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-brand-heading font-semibold text-sm">{title}</h3>
          {subtitle && <p className="text-brand-muted text-[11px] mt-0.5">{subtitle}</p>}
        </div>
        {infoText && <InfoTip text={infoText} position="top-end" />}
      </div>
      <div className="px-5 sm:px-6 py-5">{children}</div>
    </div>
  )
}

const TT_STYLE = { fontSize: 11, border: '1px solid #E5E7E5', borderRadius: 8, background: '#fff' }

// ── 1. Health Band Distribution (donut) ──────────────────────────────────────
function HealthDistribution({ accounts }) {
  const counts = {
    Active:   accounts.filter(a => a._health?.band === 'healthy').length,
    Slowing:  accounts.filter(a => a._health?.band === 'watch').length,
    Stale:    accounts.filter(a => a._health?.band === 'at_risk').length,
  }
  const data = [
    { name: 'Active',   value: counts.Active,  color: G   },
    { name: 'Slowing',  value: counts.Slowing, color: AMB },
    { name: 'Stale',    value: counts.Stale,   color: RED },
  ].filter(d => d.value > 0)

  return (
    <Card title="Health Distribution" subtitle="Accounts by health band" delay={620}
      infoText="Portfolio breakdown by health band. Active = composite score 70+ (recent activity + good tenure). Slowing = 40–69. Stale = below 40 (30+ days no GHL activity).">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-36 h-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={3}>
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={TT_STYLE} formatter={(v, n) => [v + ' accounts', n]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3 w-full">
          {[
            { label: 'Active (70+)',    count: counts.Active,  color: G   },
            { label: 'Slowing (40–69)', count: counts.Slowing, color: AMB },
            { label: 'Stale (<40)',     count: counts.Stale,   color: RED },
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

// ── 2. Join Date Timeline (accounts added per month) ─────────────────────────
function JoinTimeline({ accounts }) {
  // Build monthly buckets from the last 12 months
  const now = new Date()
  const months = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy'), count: 0 })
  }

  for (const a of accounts) {
    if (!a.ghlDateAdded) continue
    try {
      const d = parseISO(a.ghlDateAdded)
      if (!isValid(d)) continue
      const key = format(d, 'yyyy-MM')
      const bucket = months.find(m => m.key === key)
      if (bucket) bucket.count++
    } catch {}
  }

  return (
    <Card title="Client Joins by Month" subtitle="New GHL sub-accounts over last 12 months" delay={660}
      infoText="How many new client sub-accounts were created in GHL each month over the past year. Based on the GHL sub-account creation date (dateAdded), pulled live from the GoHighLevel API.">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={months} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E5" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} interval={1} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={24} />
          <Tooltip
            formatter={(v) => [v + ' accounts', 'New Clients']}
            contentStyle={TT_STYLE}
          />
          <Bar dataKey="count" fill={G} radius={[4, 4, 0, 0]} fillOpacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── 3. Activity Distribution histogram ───────────────────────────────────────
function ActivityHistogram({ accounts }) {
  const buckets = [
    { label: 'Today',   min: 0,   max: 1   },
    { label: '1–7d',    min: 1,   max: 7   },
    { label: '8–14d',   min: 7,   max: 14  },
    { label: '15–30d',  min: 14,  max: 30  },
    { label: '31–60d',  min: 30,  max: 60  },
    { label: '61–90d',  min: 60,  max: 90  },
    { label: '90d+',    min: 90,  max: Infinity },
  ]

  const data = buckets.map(b => ({
    label: b.label,
    count: accounts.filter(a => {
      const d = Number(a.ghlDaysSinceUpdate)
      return !isNaN(d) && d >= b.min && d < b.max
    }).length,
    fill: b.min >= 30 ? RED : b.min >= 14 ? AMB : G,
  }))

  return (
    <Card title="Activity Distribution" subtitle="Days since last GHL update across all accounts" delay={700}
      infoText="How many accounts fall into each activity recency bucket. Accounts updated today or within the last 7 days are in peak health. Red buckets (30d+) are stale — these need a check-in call.">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E5" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            formatter={(v) => [v + ' accounts', 'Count']}
            labelFormatter={(l) => `Last active: ${l}`}
            contentStyle={TT_STYLE}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── 4. Revenue by Health Band (billing-pending) ──────────────────────────────
function RevenueByBand() {
  const bands = [
    { name: 'Active (80+)',    color: G   },
    { name: 'Watch (50–79)',   color: AMB },
    { name: 'At-Risk (<50)',   color: RED },
  ]
  return (
    <Card title="Revenue by Health Band" subtitle="Monthly revenue split by account health — billing data required" delay={740}
      infoText="Will show total monthly charges grouped by health band: Active, Watch, and At-Risk accounts. Helps quantify how much revenue is in jeopardy from stale clients. Requires billing sheet or Stripe connection.">
      <div className="flex flex-col items-center justify-center h-[160px] gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-sm">💰</div>
        <p className="text-[12px] font-semibold text-brand-heading">Billing data not connected</p>
        <div className="flex items-center gap-4">
          {bands.map(b => (
            <div key={b.name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full opacity-30" style={{ background: b.color }} />
              <span className="text-[10px] text-brand-muted opacity-60">{b.name}: —</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-amber-600 font-medium">⚠ Requires Stripe or billing sheet</p>
      </div>
    </Card>
  )
}

// ── 5. Transaction / DataHealthStatus Histogram (billing-pending) ─────────────
function TxnHistogram() {
  const THRESHOLD = 3_500
  const buckets = [
    { label: '0–999',      min: 0,    max: 1000 },
    { label: '1k–1.9k',   min: 1000, max: 2000 },
    { label: '2k–2.9k',   min: 2000, max: 3000 },
    { label: '3k–3.5k',   min: 3000, max: 3500 },
    { label: '3.5k+',     min: 3500, max: Infinity },
  ]
  const data = buckets.map(b => ({ label: b.label, count: 0 }))

  return (
    <Card title="Transaction Distribution" subtitle="DataHealthStatus buckets — billing data required" delay={780}
      infoText="Will show how accounts are distributed by DataHealthStatus (transaction count × 1000). The red reference line at 3,500 marks the churn threshold — accounts below this are at risk. Requires billing sheet.">
      <div className="relative">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E5" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={24} />
            <ReferenceLine x="3.5k+" stroke={RED} strokeDasharray="4 4" label={{ value: 'Threshold', position: 'insideTopRight', fontSize: 9, fill: RED }} />
            <Bar dataKey="count" fill={G} radius={[4, 4, 0, 0]} fillOpacity={0.3} />
          </BarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px] rounded-b-xl gap-1">
          <p className="text-[12px] font-semibold text-brand-heading">Billing data not connected</p>
          <p className="text-[10px] text-amber-600 font-medium">⚠ Requires billing sheet or Stripe</p>
        </div>
      </div>
    </Card>
  )
}

export default function HealthCharts({ accounts }) {
  if (!accounts.length) return null
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <HealthDistribution accounts={accounts} />
        <JoinTimeline       accounts={accounts} />
        <ActivityHistogram  accounts={accounts} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <RevenueByBand />
        <TxnHistogram />
      </div>
    </div>
  )
}
