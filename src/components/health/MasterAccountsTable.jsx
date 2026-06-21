import { useState, useMemo } from 'react'

const G   = '#8CC63F'
const AMB = '#EAB308'
const RED = '#EF4444'

function fmt(n)   { return '$' + Math.round(n).toLocaleString() }
function fmtGP(n) { return n ? `${(n * 100).toFixed(0)}%` : '—' }

function bandColor(band) {
  if (band === 'healthy') return G
  if (band === 'watch')   return AMB
  return RED
}

function HealthPill({ score, band }) {
  const c = bandColor(band)
  return (
    <span className="num inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap"
      style={{ color: c, background: `${c}12`, borderColor: `${c}28` }}>
      {score}
    </span>
  )
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="text-brand-border ml-1">↕</span>
  return <span className="ml-1" style={{ color: G }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

const COLUMNS = [
  { key: 'accountName',   label: 'Account Name',  align: 'left'   },
  { key: 'accountType',   label: 'Type',           align: 'left'   },
  { key: 'totalRev',      label: 'Total Rev',      align: 'right'  },
  { key: 'planPrice',     label: 'Plan Price',     align: 'right'  },
  { key: 'users',         label: 'Users',          align: 'right'  },
  { key: 'transactions',  label: 'Transactions',   align: 'right'  },
  { key: 'addOns',        label: 'Add-ons',        align: 'right'  },
  { key: 'annualSubs',    label: 'Annual Subs',    align: 'right'  },
  { key: 'gp',            label: 'GP',             align: 'right'  },
  { key: 'multiLocation', label: 'Multi-Loc',      align: 'center' },
  { key: '_healthScore',  label: 'Health',         align: 'center' },
]

const PAGE_SIZE = 25

export default function MasterAccountsTable({ accounts, onAccountClick }) {
  const [sortCol, setSortCol] = useState('totalRev')
  const [sortDir, setSortDir] = useState('desc')
  const [page,    setPage]    = useState(1)

  // Reset to page 1 whenever the incoming accounts list changes (filters applied upstream)
  const accountsKey = accounts.length
  useMemo(() => { setPage(1) }, [accountsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => {
    return [...accounts].sort((a, b) => {
      let av = sortCol === '_healthScore' ? (a._health?.score ?? 0) : (a[sortCol] ?? 0)
      let bv = sortCol === '_healthScore' ? (b._health?.score ?? 0) : (b[sortCol] ?? 0)
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ?  1 : -1
      return 0
    })
  }, [accounts, sortCol, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageData   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
    setPage(1)
  }

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: '600ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-brand-border flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-brand-heading font-semibold text-sm">Master Accounts Table</h2>
          <p className="text-brand-muted text-[11px] mt-0.5">
            {accounts.length} accounts · click any column header to sort
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/50">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-3 py-3 first:pl-5 last:pr-5 text-[10px] font-bold uppercase tracking-widest text-brand-muted cursor-pointer hover:text-brand-heading whitespace-nowrap select-none text-${col.align}`}
                >
                  {col.label}
                  <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-12 text-center text-brand-muted text-sm">
                  No accounts match the current filters.
                </td>
              </tr>
            )}
            {pageData.map((a, i) => (
              <tr
                key={a.id}
                className="border-b border-brand-border/50 hover:bg-brand-bg/50 transition-colors duration-100"
              >
                <td className="pl-5 pr-3 py-2.5">
                  <button
                    onClick={() => onAccountClick?.(a)}
                    className="text-[12px] font-medium text-brand-text hover:underline text-left inline-flex items-center gap-1.5"
                    style={{ color: a._health?.band === 'at_risk' ? RED : undefined }}
                  >
                    {a.accountName}
                    {a.hasDataIssue && <span title="Flagged data issue — see account detail">🩹</span>}
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-[11px] bg-brand-bg border border-brand-border px-2 py-0.5 rounded whitespace-nowrap text-brand-muted">
                    {a.accountType}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right num text-[12px] font-semibold text-brand-text">{fmt(a.totalRev)}</td>
                <td className="px-3 py-2.5 text-right num text-[12px] text-brand-muted">{fmt(a.planPrice)}</td>
                <td className="px-3 py-2.5 text-right num text-[12px] text-brand-text">{a.users}</td>
                <td className="px-3 py-2.5 text-right num text-[12px] text-brand-text">{a.transactions.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right num text-[12px] text-brand-muted">{a.addOns ? fmt(a.addOns) : '—'}</td>
                <td className="px-3 py-2.5 text-right num text-[12px] text-brand-muted">{a.annualSubs ? fmt(a.annualSubs) : '—'}</td>
                <td className="px-3 py-2.5 text-right num text-[12px] text-brand-muted">{fmtGP(a.gp)}</td>
                <td className="px-3 py-2.5 text-center text-[12px]">{a.multiLocation ? '✓' : '—'}</td>
                <td className="px-3 py-2.5 pr-5 text-center">
                  <HealthPill score={a._health?.score ?? 0} band={a._health?.band ?? 'at_risk'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-brand-border flex items-center justify-between">
          <span className="text-[11px] text-brand-muted">
            Page {page} of {totalPages} · {sorted.length} accounts
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
    </div>
  )
}
