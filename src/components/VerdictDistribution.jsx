import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const VERDICT_COLORS = {
  'Excellent':           '#8CC63F',
  'Good':                '#4ADE80',
  'Satisfactory':        '#60A5FA',
  'Needs Improvement':   '#FBBF24',
  'Needs Coaching':      '#F97316',
  'Immediate Attention': '#EF4444',
  'Immediate':           '#EF4444',
}
const VERDICT_ORDER = ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement', 'Needs Coaching', 'Immediate Attention']

export default function VerdictDistribution({ calls }) {
  const data = useMemo(() => {
    const counts = {}
    for (const c of calls) {
      if (!c.finalVerdict) continue
      counts[c.finalVerdict] = (counts[c.finalVerdict] || 0) + 1
    }
    return VERDICT_ORDER
      .filter(v => counts[v] > 0)
      .map(v => ({ name: v, value: counts[v], color: VERDICT_COLORS[v] || '#9CA3AF' }))
  }, [calls])

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5"
      style={{ animationDelay: '480ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>
      <h3 className="font-semibold text-brand-heading text-sm mb-1">Verdict Distribution</h3>
      <p className="text-brand-muted text-[11px] mb-4">Call outcome breakdown</p>

      {!total ? (
        <div className="h-40 flex items-center justify-center text-brand-muted text-sm">No verdict data</div>
      ) : (
        <>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={66}
                  paddingAngle={3} dataKey="value" stroke="none">
                  {data.map(d => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val} (${Math.round(val/total*100)}%)`, name]}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7E5' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {data.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-[11px] text-brand-heading">{d.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-brand-muted">{Math.round(d.value/total*100)}%</span>
                  <span className="text-[11px] font-bold text-brand-heading num w-5 text-right">{d.value}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
