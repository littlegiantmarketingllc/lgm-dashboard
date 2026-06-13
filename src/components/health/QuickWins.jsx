import { suggestAddon } from '../../lib/healthEngine'

const G   = '#8CC63F'
const RED = '#EF4444'

function fmt(n) { return '$' + Math.round(n).toLocaleString() }

function bandColor(band) {
  if (band === 'healthy') return G
  if (band === 'watch')   return '#EAB308'
  return RED
}

export default function QuickWins({ topUpsell, topAtRisk, onAccountClick }) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: '520ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="px-5 sm:px-6 py-4 border-b border-brand-border flex items-center gap-2">
        <span className="text-base">⚡</span>
        <div>
          <h2 className="text-brand-heading font-semibold text-sm">Quick Wins — Do These Today</h2>
          <p className="text-brand-muted text-[11px] mt-0.5">Top 3 upsell opportunities + 3 most urgent at-risk accounts</p>
        </div>
      </div>

      <div className="px-5 sm:px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Upsell side */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: G }}>
            Top Upsell Opportunities
          </p>
          <div className="space-y-2.5">
            {topUpsell.length === 0 && (
              <p className="text-brand-muted text-[12px]">No upsell-ready accounts found.</p>
            )}
            {topUpsell.map((a, i) => {
              const { label, estExtra } = suggestAddon(a)
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-brand-border bg-brand-bg/50">
                  <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 text-white mt-0.5"
                    style={{ background: G }}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onAccountClick?.(a)}
                      className="text-[12px] font-semibold text-brand-text hover:underline text-left truncate block w-full"
                    >
                      {a.accountName}
                    </button>
                    <p className="text-[11px] text-brand-muted truncate">{label}</p>
                  </div>
                  <span className="num text-[12px] font-bold flex-shrink-0" style={{ color: G }}>+{fmt(estExtra)}/mo</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* At-risk side */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: RED }}>
            Most Urgent At-Risk
          </p>
          <div className="space-y-2.5">
            {topAtRisk.length === 0 && (
              <p className="text-brand-muted text-[12px]">No at-risk accounts found.</p>
            )}
            {topAtRisk.map((a, i) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-brand-border bg-brand-bg/50">
                <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 text-white mt-0.5"
                  style={{ background: RED }}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => onAccountClick?.(a)}
                    className="text-[12px] font-semibold hover:underline text-left truncate block w-full"
                    style={{ color: RED }}
                  >
                    {a.accountName}
                  </button>
                  <p className="text-[11px] text-brand-muted">{a.transactions.toLocaleString()} txns · {a.users} users</p>
                </div>
                <span className="num text-[11px] font-bold flex-shrink-0 px-2 py-0.5 rounded-full border"
                  style={{ color: bandColor(a._health?.band), background: `${bandColor(a._health?.band)}10`, borderColor: `${bandColor(a._health?.band)}30` }}>
                  {a._health?.score ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
