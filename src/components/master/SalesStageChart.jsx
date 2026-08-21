import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const G   = '#8CC63F'
const RED = '#EF4444'
const AMB = '#EAB308'
const BLU = '#3B82F6'
const PUR = '#8B5CF6'
const GRY = '#9CA3AF'

// Semantic color first (stage names carry real meaning — a "Bad Lead" slice
// should always read as bad at a glance, not whatever color the rotation
// landed on), falling back to a rotating palette for anything unrecognized —
// so this works whether the account uses these exact stage names or
// something completely different.
const SEMANTIC = [
  { match: /won|sold|policy sold|closed.?won/i, color: G },
  { match: /bad lead|lost|x-?dated|closed.?lost/i, color: RED },
  { match: /pending|quote|quoted|negotiat/i, color: AMB },
  { match: /requote|missing|needs/i, color: PUR },
  { match: /new lead|contact/i, color: BLU },
  { match: /no opportunity/i, color: GRY },
]
const ROTATION = [G, AMB, RED, BLU, PUR, '#EC4899', '#14B8A6', '#F97316']

function colorFor(stage, fallbackIndex) {
  const hit = SEMANTIC.find(s => s.match.test(stage))
  return hit ? hit.color : ROTATION[fallbackIndex % ROTATION.length]
}

function fmtPct(n) { return Math.round(n * 10) / 10 + '%' }

// Animated donut matching QuickSight's "Sales Stage ratio" visual — center
// total, color-coded legend, hover tooltip with exact counts.
export default function SalesStageChart({ rows, total, delay = 0 }) {
  const data = rows.map((r, i) => ({ ...r, color: colorFor(r.stage, i) }))

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5 sm:p-6"
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>

      <h2 className="text-brand-heading font-semibold text-sm">Sales Stage Ratio</h2>
      <p className="text-brand-muted text-[10px] mt-0.5 mb-3">Current stage of every lead in this window</p>

      {rows.length === 0 ? (
        <p className="text-brand-muted text-sm py-12 text-center">No opportunity data for this window.</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-[220px] h-[220px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%" cy="50%"
                  innerRadius={62} outerRadius={100}
                  dataKey="count"
                  nameKey="stage"
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {data.map(d => <Cell key={d.stage} fill={d.color} stroke="#fff" strokeWidth={2} />)}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value.toLocaleString()} leads`, name]}
                  contentStyle={{ fontSize: 11, border: '1px solid #E5E7E5', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="num text-2xl font-bold text-brand-text">{total.toLocaleString()}</span>
              <span className="text-brand-muted text-[10px] uppercase tracking-wider">Leads</span>
            </div>
          </div>

          <div className="flex-1 w-full min-w-0 space-y-1.5">
            {data.map(d => (
              <div key={d.stage} className="flex items-center justify-between gap-2 py-1 border-b border-brand-border/40 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-[12px] text-brand-text truncate">{d.stage}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="num text-[11px] font-semibold text-brand-text">{d.count.toLocaleString()}</span>
                  <span className="text-[10px] text-brand-muted w-10 text-right">{fmtPct(d.pct)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
