import { useMemo, useState } from 'react'
import { aggregateEmployees, VERDICT_BG, scoreBg, scoreColor } from '../../lib/qcUtils'

function Sparkline({ scores, color }) {
  if (!scores || scores.length < 2) return <span className="text-brand-muted text-[10px]">—</span>
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1
  const W = 48, H = 18, PAD = 2
  const pts = scores.map((v, i) => {
    const x = PAD + (i / (scores.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2)
    return `${x},${y}`
  })
  return (
    <svg width={W} height={H} className="flex-shrink-0">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="2" fill={color} />
    </svg>
  )
}

function ScoreCell({ value }) {
  if (!value && value !== 0) return <span className="text-brand-muted text-[11px]">—</span>
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold num ${scoreBg(value)}`}>
      {value}
    </span>
  )
}

function VerdictBadge({ verdict }) {
  if (!verdict) return <span className="text-brand-muted text-[10px]">—</span>
  const short = verdict === 'Immediate Attention' ? 'Immediate!'
    : verdict === 'Needs Coaching' ? 'Coaching'
    : verdict
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${VERDICT_BG[verdict] || 'bg-gray-100 text-gray-600'}`}>
      {short}
    </span>
  )
}

const COLUMNS = [
  { key: 'name',       label: 'Employee',        sortable: true  },
  { key: 'calls',      label: 'Calls',           sortable: true  },
  { key: 'avgComm',    label: 'Comm',            sortable: true  },
  { key: 'avgProf',    label: 'Prof',            sortable: true  },
  { key: 'avgProd',    label: 'Prod Know',       sortable: true  },
  { key: 'avgCX',      label: 'Cx Exp',          sortable: true  },
  { key: 'avgOverall', label: 'Overall',         sortable: true  },
  { key: 'topVerdict', label: 'Verdict',         sortable: false },
  { key: 'trend',      label: 'Trend',           sortable: false },
  { key: 'coaching',   label: 'Coaching',         sortable: true  },
]

export default function EmployeePerformanceTable({ calls, onEmployeeClick }) {
  const [sortKey, setSortKey]   = useState('avgOverall')
  const [sortDir, setSortDir]   = useState('desc')

  const employees = useMemo(() => aggregateEmployees(calls), [calls])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...employees].sort((a, b) => {
      if (sortKey === 'name')     return dir * a.name.localeCompare(b.name)
      if (sortKey === 'coaching') return dir * ((a.coachingFlag ? 1 : 0) - (b.coachingFlag ? 1 : 0))
      const va = a[sortKey] ?? 0
      const vb = b[sortKey] ?? 0
      return dir * (va - vb)
    })
  }, [employees, sortKey, sortDir])

  const handleSort = (key) => {
    if (!COLUMNS.find(c => c.key === key)?.sortable) return
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  if (!calls.length) {
    return (
      <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-8 text-center"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>
        <p className="text-brand-muted text-sm">No employee data in this period.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white overflow-hidden"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)', borderTop: '4px solid #8CC63F' }}>
      <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between"
        style={{ background: 'linear-gradient(to right, rgba(140,198,63,0.07), transparent)' }}>
        <h3 className="font-bold text-brand-heading text-sm">Employee Performance</h3>
        <span className="text-brand-muted text-[11px]">{employees.length} employees</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-brand-muted whitespace-nowrap ${
                    col.sortable ? 'cursor-pointer hover:text-brand-heading select-none' : ''
                  }`}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="ml-1 text-brand-green">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((emp, i) => {
              const trend = emp.recentScores.length >= 2
                ? emp.recentScores[emp.recentScores.length - 1] - emp.recentScores[0]
                : 0
              const trendColor = trend > 0 ? '#8CC63F' : trend < 0 ? '#EF4444' : '#6B7280'
              return (
                <tr
                  key={emp.name}
                  className="border-b border-brand-border/40 hover:bg-[#F0F7E8] cursor-pointer transition-colors"
                  style={{ borderLeft: `3px solid ${scoreColor(emp.avgOverall)}` }}
                  onClick={() => onEmployeeClick(emp.name)}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                        style={{ background: scoreColor(emp.avgOverall), boxShadow: `0 2px 8px ${scoreColor(emp.avgOverall)}40` }}
                      >
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-brand-heading hover:text-brand-green transition-colors">
                        {emp.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-brand-muted num">{emp.calls}</td>
                  <td className="px-3 py-2.5"><ScoreCell value={emp.avgComm} /></td>
                  <td className="px-3 py-2.5"><ScoreCell value={emp.avgProf} /></td>
                  <td className="px-3 py-2.5"><ScoreCell value={emp.avgProd} /></td>
                  <td className="px-3 py-2.5"><ScoreCell value={emp.avgCX} /></td>
                  <td className="px-3 py-2.5 font-bold">
                    <ScoreCell value={emp.avgOverall} />
                  </td>
                  <td className="px-3 py-2.5">
                    <VerdictBadge verdict={emp.topVerdict} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Sparkline scores={emp.recentScores} color={trendColor} />
                  </td>
                  <td className="px-3 py-2.5">
                    {emp.coachingFlag
                      ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 text-[10px] font-semibold">🎓 Yes</span>
                      : <span className="text-brand-muted text-[10px]">—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
