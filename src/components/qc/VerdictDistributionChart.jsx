import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { VERDICT_COLORS } from '../../lib/qcUtils'

const VERDICTS = ['Excellent', 'Good', 'Needs Coaching', 'Immediate Attention']

export default function VerdictDistributionChart({ calls }) {
  const data = useMemo(() => {
    const counts = {}
    for (const v of VERDICTS) counts[v] = 0
    for (const c of calls) {
      if (c.finalVerdict && counts[c.finalVerdict] !== undefined) counts[c.finalVerdict]++
    }
    return VERDICTS
      .filter(v => counts[v] > 0)
      .map(v => ({ name: v, value: counts[v], color: VERDICT_COLORS[v] }))
  }, [calls])

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <h3 className="font-bold text-brand-heading text-sm mb-4">Verdict Distribution</h3>
      {!total ? (
        <div className="h-40 flex items-center justify-center text-brand-muted text-sm">No verdict data</div>
      ) : (
        <>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map(d => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
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
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-[11px] text-brand-heading">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-brand-muted">{Math.round(d.value / total * 100)}%</span>
                  <span className="text-[11px] font-semibold text-brand-heading num">{d.value}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
