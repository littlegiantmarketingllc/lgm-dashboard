import { useState, useMemo, useEffect } from 'react'

function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—' }

const PAGE_SIZE = 25

// Matches QuickSight's "Lead Details" bottom table — the raw record-level
// view underneath the aggregated cards/pivots above. Paginated since a
// 3-month window on a busy account is thousands of rows.
export default function LeadDetailsTable({ leads, delay = 0 }) {
  const [page, setPage] = useState(1)

  const sorted = useMemo(
    () => [...leads].sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)),
    [leads]
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  // Whenever the filtered set changes (owner/source/date filters), jump back
  // to page 1 rather than risk landing past the end of a now-shorter list.
  useEffect(() => { setPage(1) }, [leads])
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>

      <div className="px-4 sm:px-5 py-3.5 border-b border-brand-border">
        <h2 className="text-brand-heading font-semibold text-sm">Lead Details</h2>
        <p className="text-brand-muted text-[10px] mt-0.5">{leads.length.toLocaleString()} leads in the current filters</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/50">
              {['Lead Created', 'Last Status Change', 'Name', 'Assigned To', 'Sold Date', 'Lead Source', 'Lead Profile', 'Sales Stage', 'Bad Lead Reason'].map(h => (
                <th key={h} className="px-3 py-2 first:pl-5 last:pr-4 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap text-left text-brand-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan={9} className="py-10 text-center text-brand-muted text-sm">No leads match the current filters.</td></tr>
            )}
            {pageRows.map(l => (
              <tr key={l.contactId} className="border-b border-brand-border/40 hover:bg-brand-bg/60 transition-colors duration-100">
                <td className="pl-5 pr-3 py-2 text-[11px] text-brand-text whitespace-nowrap">{fmtDate(l.dateAdded)}</td>
                <td className="px-3 py-2 text-[11px] text-brand-muted whitespace-nowrap">{fmtDate(l.lastStatusChangeAt)}</td>
                <td className="px-3 py-2 text-[11px] font-medium text-brand-text truncate max-w-[160px]">{l.name || '—'}</td>
                <td className="px-3 py-2 text-[11px] text-brand-text truncate max-w-[140px]">{l.assignedToName || l.assignedTo || '—'}</td>
                <td className="px-3 py-2 text-[11px] text-brand-muted whitespace-nowrap">{fmtDate(l.oppSoldDate)}</td>
                <td className="px-3 py-2 text-[11px] text-brand-text truncate max-w-[140px]">{l.source || '—'}</td>
                <td className="px-3 py-2 text-[11px] text-brand-text truncate max-w-[140px]">{l.leadProfile || '—'}</td>
                <td className="px-3 py-2 text-[11px]">
                  {l.salesStage
                    ? <span className="inline-block px-1.5 py-0.5 rounded border border-brand-border bg-brand-bg text-brand-text text-[10px] whitespace-nowrap">{l.salesStage}</span>
                    : <span className="text-brand-border">—</span>}
                </td>
                <td className="px-3 pr-4 py-2 text-[11px] text-brand-muted truncate max-w-[160px]">{l.badLeadReason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-brand-border flex items-center justify-between">
          <span className="text-[10px] text-brand-muted">Page {page} of {totalPages} · {sorted.length.toLocaleString()} leads</span>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border text-[10px] font-semibold disabled:opacity-40 text-brand-muted border-brand-border hover:bg-brand-bg">
              ← Prev
            </button>
            <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border text-[10px] font-semibold disabled:opacity-40 text-brand-muted border-brand-border hover:bg-brand-bg">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
