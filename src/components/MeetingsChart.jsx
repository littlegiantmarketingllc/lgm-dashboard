import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

const G = '#8CC63F'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="bg-white border border-brand-border rounded-xl px-4 py-3"
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
    >
      <p className="text-brand-muted text-[10px] font-bold uppercase tracking-widest mb-2.5">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[12px] mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-brand-muted capitalize">{p.name}:</span>
          <span className="text-brand-text font-bold num">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function MeetingsChart({ data }) {
  const interval = data.length > 20 ? 4 : data.length > 10 ? 2 : 1

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{
        animationDelay: '440ms',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
        <div>
          <h2 className="text-brand-heading font-semibold text-sm">Meetings Over Time</h2>
          <p className="text-brand-muted text-[11px] mt-0.5">Daily positive vs frustrated calls</p>
        </div>
        <div className="flex items-center gap-5 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 rounded inline-block" style={{ background: G }} />
            <span className="text-brand-muted">Positive</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 rounded bg-brand-red inline-block" />
            <span className="text-brand-muted">Frustrated</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pt-6 pb-4">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={G}        stopOpacity={0.20} />
                <stop offset="100%" stopColor={G}        stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="gFrustrated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#EF4444" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0}    />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E5" vertical={false} />

            <XAxis
              dataKey="date"
              tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 600 }}
              axisLine={{ stroke: '#E5E7E5' }}
              tickLine={false}
              interval={interval}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#6B7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7E5', strokeWidth: 1 }} />

            <Area
              type="monotone"
              dataKey="positive"
              name="Positive"
              stroke={G}
              strokeWidth={2.5}
              fill="url(#gPositive)"
              dot={{ r: 3, fill: G, stroke: '#FFFFFF', strokeWidth: 2 }}
              activeDot={{ r: 5.5, fill: G, stroke: '#FFFFFF', strokeWidth: 2 }}
              isAnimationActive
              animationDuration={1400}
              animationEasing="ease-out"
            />
            <Area
              type="monotone"
              dataKey="frustrated"
              name="Frustrated"
              stroke="#EF4444"
              strokeWidth={2.5}
              fill="url(#gFrustrated)"
              dot={{ r: 3, fill: '#EF4444', stroke: '#FFFFFF', strokeWidth: 2 }}
              activeDot={{ r: 5.5, fill: '#EF4444', stroke: '#FFFFFF', strokeWidth: 2 }}
              isAnimationActive
              animationDuration={1600}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
