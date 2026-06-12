import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { buildScoreTrends } from '../../lib/qcUtils'

const LINES = [
  { key: 'overall', label: 'Overall',      color: '#8CC63F' },
  { key: 'comm',    label: 'Comm',         color: '#4A9AF5' },
  { key: 'prof',    label: 'Prof',         color: '#F59E0B' },
  { key: 'prod',    label: 'Prod Know',    color: '#A855F7' },
  { key: 'cx',      label: 'CX',           color: '#EF4444' },
]

export default function ScoreTrendsChart({ calls, dateFilter }) {
  const [showSub, setShowSub] = useState(false)

  const data = useMemo(() => buildScoreTrends(calls, dateFilter), [calls, dateFilter])

  const activeLines = showSub ? LINES : [LINES[0]]

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-brand-heading text-sm">Score Trends</h3>
        <button
          onClick={() => setShowSub(s => !s)}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
            showSub
              ? 'bg-brand-green text-white border-brand-green'
              : 'bg-brand-bg text-brand-muted border-brand-border hover:text-brand-heading'
          }`}
        >
          {showSub ? 'Overall only' : 'Show sub-scores'}
        </button>
      </div>

      {!data.length ? (
        <div className="h-52 flex items-center justify-center text-brand-muted text-sm">No trend data available</div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E5" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7E5' }}
                formatter={(val, name) => [val, name]}
              />
              {showSub && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {activeLines.map(l => (
                <Line
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  name={l.label}
                  stroke={l.color}
                  strokeWidth={l.key === 'overall' ? 2.5 : 1.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.length > 0 && (
        <p className="text-brand-muted text-[11px] mt-2">
          {data.length} data point{data.length !== 1 ? 's' : ''}
          {' '}· {calls.length} employee-call rows
        </p>
      )}
    </div>
  )
}
