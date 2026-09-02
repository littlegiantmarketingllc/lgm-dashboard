import { useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function startOfWeek(dateStr) {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function weekLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Generic weekly count+rate trend — bars for the weekly count of leads
// matching `matchFn`, line for that count as a % of that week's leads.
// Matches QuickSight's "X rate by Date Created" charts; reused for both
// Rate Too High and Quote Rate so the two read as one consistent chart type.
export default function WeeklyTrendChart({ leads, matchFn, title, subtitle, countLabel, rateLabel, barColor, lineColor, emptyText, delay = 0 }) {
  const data = useMemo(() => {
    const buckets = new Map()
    for (const l of leads) {
      if (!l.dateAdded) continue
      const wk = startOfWeek(l.dateAdded)
      const key = wk.getTime()
      if (!buckets.has(key)) buckets.set(key, { date: wk, total: 0, count: 0 })
      const b = buckets.get(key)
      b.total += 1
      if (matchFn(l)) b.count += 1
    }
    return [...buckets.values()]
      .sort((a, b) => a.date - b.date)
      .map(b => ({
        label: weekLabel(b.date),
        count: b.count,
        rate: b.total > 0 ? Math.round((b.count / b.total) * 1000) / 10 : 0,
      }))
  }, [leads, matchFn])

  const hasAnyData = data.some(d => d.count > 0)

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5 sm:p-6"
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>

      <h2 className="text-brand-heading font-semibold text-sm">{title}</h2>
      <p className="text-brand-muted text-[10px] mt-0.5 mb-3">{subtitle}</p>

      {!hasAnyData ? (
        <p className="text-brand-muted text-sm py-12 text-center">{emptyText}</p>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7E5' }} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value, name) => name === 'rate' ? [`${value}%`, rateLabel] : [value, countLabel]}
                contentStyle={{ fontSize: 11, border: '1px solid #E5E7E5', borderRadius: 8 }}
              />
              <Bar yAxisId="left" dataKey="count" fill={barColor} radius={[4, 4, 0, 0]} barSize={28} />
              <Line yAxisId="right" type="monotone" dataKey="rate" stroke={lineColor} strokeWidth={2} dot={{ r: 3, fill: lineColor }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
