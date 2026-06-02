const G = '#8CC63F'

function scoreColor(s) {
  return s >= 8 ? G : s >= 6 ? '#EAB308' : '#EF4444'
}

function ScorePill({ score }) {
  const c = scoreColor(score)
  return (
    <span
      className="num inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border"
      style={{ color: c, background: `${c}14`, borderColor: `${c}28` }}
    >
      {score.toFixed(1)}
    </span>
  )
}

function ScoreBar({ score }) {
  return (
    <div className="w-full h-[3px] rounded-full bg-brand-border mt-1.5 overflow-hidden">
      <div
        className="h-full rounded-full score-bar-fill"
        style={{ width: `${(score / 10) * 100}%`, background: scoreColor(score) }}
      />
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
          <rect
            key={i}
            x={i * (bW + gap)} y={H - barH}
            width={bW} height={barH}
            rx="1.5"
            fill={scoreColor(s)}
            opacity="0.75"
          />
        )
      })}
    </svg>
  )
}

export default function EmployeeTable({ employees }) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white flex flex-col h-full"
      style={{
        animationDelay: '360ms',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
        <div>
          <h2 className="text-brand-heading font-semibold text-sm">Employee Performance</h2>
          <p className="text-brand-muted text-[11px] mt-0.5">Ranked by average score</p>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
          style={{ color: G, background: `${G}10`, borderColor: `${G}25` }}
        >
          {employees.length} agents
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/60">
              {['#', 'Employee', 'Calls', 'Score', 'Trend', 'Frustrated'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted first:pl-6">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-14 text-brand-muted text-sm">
                  No data for selected period
                </td>
              </tr>
            )}
            {employees.map((emp, i) => (
              <tr
                key={emp.name}
                className="animate-slide-in-row border-b border-brand-border/60 transition-colors duration-150"
                style={{
                  animationDelay: `${400 + i * 60}ms`,
                  background: i % 2 === 0 ? '#FFFFFF' : '#F9FAF9',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0F7E8'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#FFFFFF' : '#F9FAF9'}
              >
                {/* Rank */}
                <td className="pl-6 pr-4 py-4">
                  <span className="num text-brand-muted text-xs font-bold w-5 inline-block text-center">
                    {i + 1}
                  </span>
                </td>

                {/* Name */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: `${G}18`, color: G, border: `1px solid ${G}30` }}
                    >
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-brand-text font-medium text-[13px]">{emp.name}</span>
                  </div>
                </td>

                {/* Calls */}
                <td className="px-4 py-4">
                  <span className="num text-brand-text font-semibold">{emp.calls}</span>
                </td>

                {/* Score */}
                <td className="px-4 py-4 min-w-[100px]">
                  <ScorePill score={emp.avgScore} />
                  <ScoreBar score={emp.avgScore} />
                </td>

                {/* Sparkline */}
                <td className="px-4 py-4">
                  <div className="flex items-end h-6">
                    <Sparkline scores={emp.recentScores} />
                  </div>
                </td>

                {/* Frustrated */}
                <td className="px-4 py-4">
                  {emp.frustrated > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-red-500 text-xs font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
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
  )
}
