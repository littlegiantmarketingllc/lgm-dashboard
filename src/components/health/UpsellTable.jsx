import { suggestAddon } from '../../lib/healthEngine'

const G = '#8CC63F'

function fmt(n) { return '$' + Math.round(n).toLocaleString() }

function contactedAgo(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)  return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function UpsellTable({ accounts, isContacted, toggleContacted, getContactedAt, onAccountClick, potentialMRR }) {
  const sorted = [...accounts].sort((a, b) => suggestAddon(b).estExtra - suggestAddon(a).estExtra)
  const contacted = sorted.filter(a => isContacted(a.id)).length

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: '580ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-brand-border flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-brand-heading font-semibold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: G }} />
            Upsell Opportunities
          </h2>
          <p className="text-brand-muted text-[11px] mt-0.5">
            {accounts.length} accounts ready · {contacted} contacted
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-3 py-1.5 rounded-full border"
            style={{ color: G, background: `${G}0D`, borderColor: `${G}30` }}>
            Potential additional MRR: {fmt(potentialMRR)}/mo
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/50">
              {['Account Name', 'Transactions', 'Users', 'Current Rev', 'Suggested Add-on', 'Est. Extra/mo', 'Action'].map(h => (
                <th key={h} className="px-3 sm:px-4 py-3 first:pl-5 last:pr-5 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-brand-muted text-sm">
                  No upsell-ready accounts yet — accounts need 3,500+ transactions and 3+ users.
                </td>
              </tr>
            )}
            {sorted.map((a, i) => {
              const { label, estExtra } = suggestAddon(a)
              const contacted           = isContacted(a.id)
              const contactedAt         = getContactedAt(a.id)

              return (
                <tr key={a.id}
                  className={`animate-slide-in-row border-b border-brand-border/60 transition-all duration-200 ${contacted ? 'opacity-55 bg-brand-bg/40' : 'hover:bg-green-50/20'}`}
                  style={{ animationDelay: `${600 + i * 40}ms`, borderLeft: `2px solid ${contacted ? '#E5E7E5' : G}` }}>

                  <td className="pl-5 pr-3 py-3">
                    <button
                      onClick={() => onAccountClick?.(a)}
                      className="text-[12px] font-semibold text-brand-text hover:underline text-left"
                    >
                      {a.accountName}
                    </button>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className="num text-[12px] text-brand-text">{a.transactions.toLocaleString()}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className="num text-[12px] text-brand-text">{a.users}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className="num text-[12px] font-semibold text-brand-text">{fmt(a.totalRev)}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 max-w-[180px]">
                    <span className="text-[11px] text-brand-heading">{label}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className="num text-[12px] font-bold" style={{ color: G }}>+{fmt(estExtra)}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 pr-5">
                    <div className="flex flex-col gap-1 items-start">
                      <button
                        onClick={() => toggleContacted(a.id)}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 whitespace-nowrap"
                        style={contacted
                          ? { color: '#6B7280', borderColor: '#E5E7E5' }
                          : { color: G, background: `${G}10`, borderColor: `${G}30` }
                        }
                      >
                        {contacted ? 'Undo' : 'Mark Contacted'}
                      </button>
                      {contacted && contactedAt && (
                        <span className="text-[10px] text-brand-muted">Contacted {contactedAgo(contactedAt)}</span>
                      )}
                    </div>
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
