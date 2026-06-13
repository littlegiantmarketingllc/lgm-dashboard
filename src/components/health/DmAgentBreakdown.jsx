import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const G   = '#8CC63F'
const AMB = '#EAB308'

function fmt(n) { return '$' + Math.round(n).toLocaleString() }

function StatLine({ dot, label, count, rev, pct }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-brand-border/60 last:border-0">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dot }} />
        <span className="text-brand-heading font-semibold text-[13px]">{label}</span>
        <span className="text-brand-muted text-[11px]">({count} accounts)</span>
      </div>
      <div className="text-right">
        <p className="num text-[13px] font-bold text-brand-text">{fmt(rev)}</p>
        <p className="text-[10px] text-brand-muted">{pct}% of total</p>
      </div>
    </div>
  )
}

export default function DmAgentBreakdown({ breakdown, avgHealthDm, avgHealthAgent }) {
  const { dm, agent, total } = breakdown

  const pieData = [
    { name: 'DM',    value: dm.rev    || 0.01, color: G   },
    { name: 'Agent', value: agent.rev || 0.01, color: AMB },
  ]

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: '360ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="px-5 sm:px-6 py-4 border-b border-brand-border">
        <h2 className="text-brand-heading font-semibold text-sm">DM vs Agent Breakdown</h2>
        <p className="text-brand-muted text-[11px] mt-0.5">Revenue distribution by account type</p>
      </div>

      <div className="px-5 sm:px-6 py-5 flex flex-col sm:flex-row gap-6 items-center">

        {/* Donut */}
        <div className="w-28 h-28 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={48}
                dataKey="value" paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                formatter={(v, n) => [fmt(v), n]}
                contentStyle={{ fontSize: 11, border: '1px solid #E5E7E5', borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0 w-full">
          <StatLine dot={G}   label="DM"    count={dm.count}    rev={dm.rev}    pct={dm.pct}    />
          <StatLine dot={AMB} label="Agent" count={agent.count} rev={agent.rev} pct={agent.pct} />

          <div className="flex items-center justify-between pt-2.5">
            <span className="text-brand-muted text-[11px] font-semibold">Total Revenue</span>
            <span className="num text-[13px] font-bold text-brand-text">{fmt(total)}</span>
          </div>

          {(avgHealthDm !== null || avgHealthAgent !== null) && (
            <div className="mt-3 pt-3 border-t border-brand-border/60 grid grid-cols-2 gap-3">
              <div className="text-center rounded-xl bg-brand-bg border border-brand-border p-2">
                <p className="text-[10px] text-brand-muted uppercase tracking-wider">DM Avg Health</p>
                <p className="num font-bold text-[15px] mt-0.5" style={{ color: G }}>{avgHealthDm ?? '—'}</p>
              </div>
              <div className="text-center rounded-xl bg-brand-bg border border-brand-border p-2">
                <p className="text-[10px] text-brand-muted uppercase tracking-wider">Agent Avg Health</p>
                <p className="num font-bold text-[15px] mt-0.5" style={{ color: AMB }}>{avgHealthAgent ?? '—'}</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
