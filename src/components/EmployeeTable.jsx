import { useState } from 'react'

const G = '#8CC63F'

function scoreColor(s) {
  return s >= 8 ? G : s >= 6 ? '#EAB308' : '#EF4444'
}

function ScorePill({ score }) {
  const c = scoreColor(score)
  return (
    <span className="num inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-bold border"
      style={{ color: c, background: `${c}14`, borderColor: `${c}28` }}>
      {score.toFixed(1)}
    </span>
  )
}

function ScoreBar({ score }) {
  return (
    <div className="w-full h-[3px] rounded-full bg-brand-border mt-1.5 overflow-hidden">
      <div className="h-full rounded-full score-bar-fill"
        style={{ width: `${(score / 10) * 100}%`, background: scoreColor(score) }} />
    </div>
  )
}

function Sparkline({ scores }) {
  if (!scores?.length) return null
  const H = 22, bW = 5, gap = 2
  const W = scores.length * (bW + gap) - gap
  return (
    <svg width={W} height={H}>
      {scores.map((s, i) => {
        const barH = Math.max(2, (s / 10) * H)
        return (
          <rect key={i} x={i * (bW + gap)} y={H - barH}
            width={bW} height={barH} rx="1.5" fill={scoreColor(s)} opacity="0.75" />
        )
      })}
    </svg>
  )
}

function SummaryTooltip({ emp, pos }) {
  if (!emp || !emp.recentSummaries?.length || !pos) return null
  const left = Math.min(pos.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 340)
  return (
    <div className="fixed z-50 pointer-events-none" style={{ top: pos.y + 10, left: Math.max(8, left) }}>
      <div className="bg-white border border-brand-border rounded-2xl w-72 sm:w-80"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div className="px-4 pt-3 pb-2 border-b border-brand-border">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
            Recent Summaries — {emp.name}
          </p>
        </div>
        <div className="px-4 py-3 space-y-3">
          {emp.recentSummaries.map((s, i) => (
            <div key={i} className={i > 0 ? 'pt-3 border-t border-brand-border/60' : ''}>
              <p className="text-[10px] text-brand-muted font-medium mb-1">{s.customer} · {s.date}</p>
              <p className="text-[12px] text-brand-heading italic leading-relaxed">{s.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function EmployeeTable({ employees }) {
  const [tooltip, setTooltip] = useState(null)

  const showTooltip = (e, emp) => {
    if (!emp.recentSummaries?.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ emp, x: rect.left, y: rect.bottom })
  }

  return (
    <>
      <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white flex flex-col h-full"
        style={{ animationDelay: '360ms', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-brand-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-brand-heading font-semibold text-sm">Employee Performance</h2>
            <p className="text-brand-muted text-[11px] mt-0.5 hidden sm:block">
              Ranked by average score · hover name for recent summaries
            </p>
            <p className="text-brand-muted text-[11px] mt-0.5 sm:hidden">Ranked by average score</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 sm:px-2.5 py-1 rounded-full border flex-shrink-0"
            style={{ color: G, background: `${G}10`, borderColor: `${G}25` }}>
            {employees.length} agents
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg/60">
                <th className="px-3 sm:px-4 py-3 pl-4 sm:pl-6 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">#</th>
                <th className="px-3 sm:px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Employee</th>
                {/* Calls — hidden on xs */}
                <th className="px-3 sm:px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted hidden sm:table-cell">Calls</th>
                <th className="px-3 sm:px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Score</th>
                {/* Trend sparkline — hidden on mobile */}
                <th className="px-3 sm:px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted hidden md:table-cell">Trend</th>
                <th className="px-3 sm:px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Frustrated</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-brand-muted text-sm">
                    No data for selected period
                  </td>
                </tr>
              )}
              {employees.map((emp, i) => (
                <tr key={emp.name}
                  className="animate-slide-in-row border-b border-brand-border/60 transition-colors duration-150"
                  style={{ animationDelay: `${400 + i * 60}ms`, background: i % 2 === 0 ? '#FFFFFF' : '#F9FAF9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0F7E8'}
                  onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#FFFFFF' : '#F9FAF9'; setTooltip(null) }}
                >
                  {/* Rank */}
                  <td className="pl-4 sm:pl-6 pr-2 sm:pr-4 py-3 sm:py-4">
                    <span className="num text-brand-muted text-xs font-bold">{i + 1}</span>
                  </td>

                  {/* Name */}
                  <td className="px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center gap-2 cursor-default"
                      onMouseEnter={e => showTooltip(e, emp)}
                      onMouseLeave={() => setTooltip(null)}>
                      <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: `${G}18`, color: G, border: `1px solid ${G}30` }}>
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className={`text-brand-text font-medium text-[12px] sm:text-[13px] ${
                        emp.recentSummaries?.length ? 'underline decoration-dotted underline-offset-2 decoration-brand-muted' : ''
                      }`}>
                        {/* Short name on very small screens */}
                        <span className="hidden xs:inline">{emp.name}</span>
                        <span className="xs:hidden">{emp.name.split(' ')[0]}</span>
                      </span>
                    </div>
                  </td>

                  {/* Calls — hidden on xs */}
                  <td className="px-3 sm:px-4 py-3 sm:py-4 hidden sm:table-cell">
                    <span className="num text-brand-text font-semibold">{emp.calls}</span>
                  </td>

                  {/* Score */}
                  <td className="px-3 sm:px-4 py-3 sm:py-4 min-w-[80px] sm:min-w-[100px]">
                    <ScorePill score={emp.avgScore} />
                    <ScoreBar score={emp.avgScore} />
                  </td>

                  {/* Sparkline — hidden on mobile */}
                  <td className="px-3 sm:px-4 py-3 sm:py-4 hidden md:table-cell">
                    <div className="flex items-end h-6"><Sparkline scores={emp.recentScores} /></div>
                  </td>

                  {/* Frustrated */}
                  <td className="px-3 sm:px-4 py-3 sm:py-4">
                    {emp.frustrated > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-500 text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot flex-shrink-0" />
                        {emp.frustrated}
                      </span>
                    ) : (
                      <span className="text-brand-muted text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SummaryTooltip emp={tooltip?.emp} pos={tooltip ? { x: tooltip.x, y: tooltip.y } : null} />
    </>
  )
}
