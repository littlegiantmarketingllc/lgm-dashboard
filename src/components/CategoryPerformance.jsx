import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { scoreColor } from '../lib/ehUtils'

export default function CategoryPerformance({ calls }) {
  const data = useMemo(() => {
    const map = {}
    for (const c of calls) {
      const cat = c.category || 'General'
      if (!map[cat]) map[cat] = { calls: 0, total: 0 }
      map[cat].calls++
      map[cat].total += c.overallScore || 0
    }
    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        avg: v.calls ? +(v.total / v.calls).toFixed(1) : 0,
        calls: v.calls,
      }))
      .filter(d => d.avg > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8)
  }, [calls])

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5"
      style={{ animationDelay: '520ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>
      <h3 className="font-semibold text-brand-heading text-sm mb-1">Category Performance</h3>
      <p className="text-brand-muted text-[11px] mb-4">Average score by call category</p>

      {!data.length ? (
        <div className="h-40 flex items-center justify-center text-brand-muted text-sm">No category data</div>
      ) : (
        <>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 4 }}>
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#4A4A4A' }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val) => [val, 'Avg Score']}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7E5' }}
                />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {data.map(d => <Cell key={d.name} fill={scoreColor(d.avg)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1">
            {data.map(d => (
              <div key={d.name} className="flex items-center justify-between text-[11px]">
                <span className="text-brand-heading truncate max-w-[160px]">{d.name}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-brand-muted">{d.calls} call{d.calls !== 1 ? 's' : ''}</span>
                  <span className="font-bold num" style={{ color: scoreColor(d.avg) }}>{d.avg}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
