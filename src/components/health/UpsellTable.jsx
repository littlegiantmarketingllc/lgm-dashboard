import { useState, useMemo } from 'react'
import { suggestAddon } from '../../lib/healthEngine'

const G = '#8CC63F'

const TOP_OPPORTUNITIES_COUNT = 10
const PAGE_SIZE                = 20

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

function UpsellRow({ a, i, isContacted, toggleContacted, getContactedAt, onAccountClick }) {
  const { label, estExtra } = suggestAddon(a)
  const contacted           = isContacted(a.id)
  const contactedAt         = getContactedAt(a.id)

  return (
    <tr key={a.id}
      className={`animate-slide-in-row border-b border-brand-border/60 transition-all duration-200 ${contacted ? 'opacity-55 bg-brand-bg/40' : 'hover:bg-green-50/20'}`}
      style={{ animationDelay: `${i * 30}ms`, borderLeft: `2px solid ${contacted ? '#E5E7E5' : G}` }}>

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
}

const UPSELL_HEADERS = ['Account Name', 'Transactions', 'Users', 'Current Rev', 'Suggested Add-on', 'Est. Extra/mo', 'Action']

function UpsellRows({ rows, isContacted, toggleContacted, getContactedAt, onAccountClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-border bg-brand-bg/50">
            {UPSELL_HEADERS.map(h => (
              <th key={h} className="px-3 sm:px-4 py-3 first:pl-5 last:pr-5 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <UpsellRow key={a.id} a={a} i={i} isContacted={isContacted} toggleContacted={toggleContacted} getContactedAt={getContactedAt} onAccountClick={onAccountClick} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function UpsellTable({ accounts, isContacted, toggleContacted, getContactedAt, onAccountClick, potentialMRR }) {
  const [page, setPage] = useState(1)

  const sorted = useMemo(() =>
    [...accounts].sort((a, b) => suggestAddon(b).estExtra - suggestAddon(a).estExtra),
    [accounts]
  )
  const contacted = sorted.filter(a => isContacted(a.id)).length

  // Reset to page 1 whenever the incoming accounts list changes (filters applied upstream)
  const accountsKey = accounts.length
  useMemo(() => { setPage(1) }, [accountsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const topOpportunities = sorted.slice(0, TOP_OPPORTUNITIES_COUNT)
  const rest              = sorted.slice(TOP_OPPORTUNITIES_COUNT)

  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE))
  const pageData   = useMemo(() => rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rest, page])

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

      {sorted.length === 0 ? (
        <div className="py-12 text-center text-brand-muted text-sm">
          No upsell-ready accounts yet — accounts need 3,500+ transactions, 3+ users, and no add-ons yet.
        </div>
      ) : (
        <>
          {/* Top Opportunities — biggest $ potential, always visible, no pagination */}
          <div className="px-4 sm:px-6 pt-4 pb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0" style={{ color: G }}>
              🟢 Top Opportunities — highest potential first ({topOpportunities.length})
            </p>
          </div>
          <UpsellRows rows={topOpportunities} isContacted={isContacted} toggleContacted={toggleContacted} getContactedAt={getContactedAt} onAccountClick={onAccountClick} />

          {rest.length > 0 && (
            <>
              <div className="px-4 sm:px-6 pt-4 pb-1.5 border-t border-brand-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">
                  🟡 To-Do — {rest.length} more, lower priority
                </p>
              </div>
              <UpsellRows rows={pageData} isContacted={isContacted} toggleContacted={toggleContacted} getContactedAt={getContactedAt} onAccountClick={onAccountClick} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-brand-border flex items-center justify-between">
                  <span className="text-[11px] text-brand-muted">
                    Page {page} of {totalPages} · {rest.length} accounts
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold disabled:opacity-40 text-brand-muted border-brand-border hover:bg-brand-bg"
                    >
                      ← Prev
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold disabled:opacity-40 text-brand-muted border-brand-border hover:bg-brand-bg"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
