import { useState } from 'react'
import { G, scoreColor } from '../lib/ehUtils'
import EmployeeAvatar from './EmployeeAvatar'

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
    <div className="w-full h-2 rounded-full bg-brand-border mt-2 overflow-hidden">
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

// Picks a positive growth label from score level + trend — never a critical/negative tag.
// null = no badge (performance is already strong and stable, nothing to call out).
function growthLabel(emp) {
  if (!emp.coaching) return null
  const scores = emp.recentScores || []
  let trend = 0
  if (scores.length >= 4) {
    const mid = Math.floor(scores.length / 2)
    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length
    trend = avg(scores.slice(mid)) - avg(scores.slice(0, mid))
  }
  if (emp.avgScore >= 8 && trend >= 0) return null
  if (trend > 0.3 || emp.avgScore >= 6) return 'Growing'
  return 'Learning'
}

function SearchIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-brand-muted flex-shrink-0" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}

export default function EmployeeTable({ employees, onEmployeeClick, onCoachingClick }) {
  const [tooltip, setTooltip] = useState(null)
  const [search, setSearch]   = useState('')

  const displayed = search.trim()
    ? employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : employees

  const showTooltip = (e, emp) => {
    if (!emp.recentSummaries?.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ emp, x: rect.left, y: rect.bottom })
  }

  return (
    <>
      <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white flex flex-col h-full"
        style={{ animationDelay: '360ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-brand-border flex items-center justify-between gap-3"
          style={{ background: 'linear-gradient(to right, rgba(140,198,63,0.05), transparent)' }}>
          <div className="min-w-0">
            <h2 className="text-brand-heading font-semibold text-sm">Employee Performance</h2>
            <p className="text-brand-muted text-[11px] mt-0.5 hidden sm:block">
              Ranked by average score · click name for full profile
            </p>
            <p className="text-brand-muted text-[11px] mt-0.5 sm:hidden">Tap name for profile</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative hidden sm:flex items-center">
              <span className="absolute left-2.5 pointer-events-none"><SearchIcon /></span>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-8 pr-3 py-1.5 text-[12px] border border-brand-border rounded-lg bg-brand-bg focus:outline-none focus:border-brand-green w-28 focus:w-36 transition-all duration-200 placeholder:text-brand-muted/60"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 text-brand-muted hover:text-brand-text">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 sm:px-2.5 py-1 rounded-full border flex-shrink-0"
              style={{ color: G, background: `${G}10`, borderColor: `${G}25` }}>
              {displayed.length} agent{displayed.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 py-2.5 border-b border-brand-border/60">
          <div className="relative flex items-center">
            <span className="absolute left-2.5 pointer-events-none"><SearchIcon /></span>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-brand-border rounded-lg bg-brand-bg focus:outline-none focus:border-brand-green placeholder:text-brand-muted/60"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 text-brand-muted hover:text-brand-text">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg/60">
                <th className="px-3 sm:px-4 py-3 pl-4 sm:pl-6 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">#</th>
                <th className="px-3 sm:px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Employee</th>
                <th className="px-3 sm:px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted hidden sm:table-cell">Calls</th>
                <th className="px-3 sm:px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Score</th>
                <th className="px-3 sm:px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted hidden md:table-cell">Trend</th>
                <th className="px-3 sm:px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Frustrated</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-brand-muted text-sm">
                    {search ? `No employees match "${search}"` : 'No data for selected period'}
                  </td>
                </tr>
              )}
              {displayed.map((emp, i) => (
                <tr key={emp.name}
                  className="animate-slide-in-row border-b border-brand-border/60 cursor-pointer transition-colors duration-150"
                  style={{
                    animationDelay: `${400 + i * 60}ms`,
                    background: i % 2 === 0 ? '#FFFFFF' : '#F9FAF9',
                    borderLeft: `3px solid ${scoreColor(emp.avgScore)}`,
                  }}
                  onClick={() => onEmployeeClick?.(emp.name)}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0F7E8'}
                  onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#FFFFFF' : '#F9FAF9'; setTooltip(null) }}
                >
                  {/* Rank */}
                  <td className="pl-4 sm:pl-6 pr-2 sm:pr-4 py-3 sm:py-4">
                    <span className="num text-brand-muted text-xs font-bold">{i + 1}</span>
                  </td>

                  {/* Name */}
                  <td className="px-3 sm:px-4 py-3 sm:py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <EmployeeAvatar name={emp.name} size={28} variant="light" />
                      <button
                        onClick={() => onEmployeeClick?.(emp.name)}
                        onMouseEnter={e => showTooltip(e, emp)}
                        onMouseLeave={() => setTooltip(null)}
                        className="text-brand-text font-medium text-[12px] sm:text-[13px] hover:text-brand-green underline decoration-dotted underline-offset-2 decoration-brand-muted text-left transition-colors duration-150"
                      >
                        <span className="hidden xs:inline">{emp.name}{emp.name === 'John Graham' && <span className="text-brand-muted font-normal text-[10px] ml-1">(Founder)</span>}</span>
                        <span className="xs:hidden">{emp.name.split(' ')[0]}</span>
                      </button>
                      {(() => {
                        const label = growthLabel(emp)
                        if (!label) return null
                        const isGrowing = label === 'Growing'
                        return (
                          <button
                            onClick={e => { e.stopPropagation(); onCoachingClick?.(emp.name) }}
                            className={`text-[9px] px-1 py-0.5 rounded hidden sm:inline transition-colors border ${
                              isGrowing
                                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                            }`}
                            title="View growth opportunities"
                          >
                            {label}
                          </button>
                        )
                      })()}
                    </div>
                  </td>

                  {/* Calls */}
                  <td className="px-3 sm:px-4 py-3 sm:py-4 hidden sm:table-cell">
                    <span className="num text-brand-text font-semibold">{emp.calls}</span>
                  </td>

                  {/* Score */}
                  <td className="px-3 sm:px-4 py-3 sm:py-4 min-w-[80px] sm:min-w-[100px]">
                    <ScorePill score={emp.avgScore} />
                    <ScoreBar score={emp.avgScore} />
                  </td>

                  {/* Sparkline */}
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
