import { useState, useMemo } from 'react'
import InfoTip from './InfoTip'

const G   = '#8CC63F'
const AMB = '#EAB308'
const RED = '#EF4444'

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

function ActivityBadge({ days }) {
  if (days === null || days === undefined) return <span className="text-brand-muted">—</span>
  const d = Number(days)
  const color = d <= 7 ? G : d <= 30 ? AMB : RED
  const label = d === 0 ? 'Today' : `${d}d ago`
  return (
    <span className="num inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
      style={{ color, background: `${color}12`, borderColor: `${color}28` }}>
      {label}
    </span>
  )
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="text-brand-border ml-1">↕</span>
  return <span className="ml-1" style={{ color: G }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

const COLUMNS = [
  { key: 'accountName',       label: 'Account Name',     align: 'left'   },
  { key: 'ghlCity',           label: 'Location',         align: 'left'   },
  { key: 'ghlEmail',          label: 'Email',            align: 'left'   },
  { key: 'ghlDateAdded',      label: 'Joined GHL',       align: 'left',  tip: 'Date this sub-account was created in GHL.' },
  { key: 'ghlDaysSinceUpdate',label: 'Last Activity',    align: 'center', tip: 'Days since the GHL sub-account record was last updated — best available proxy for account activity.' },
  { key: '_healthScore',      label: 'Health',           align: 'center', tip: 'Composite score: 50% tenure (how long in GHL) + 50% activity (how recently updated). Healthy = 70+, Watch = 40–69, At-Risk < 40.' },
]

const PAGE_SIZE = 25

export default function MasterAccountsTable({ accounts, onAccountClick }) {
  const [sortCol, setSortCol] = useState('ghlDaysSinceUpdate')
  const [sortDir, setSortDir] = useState('asc')
  const [page,    setPage]    = useState(1)

  const accountsKey = accounts.length
  useMemo(() => { setPage(1) }, [accountsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => {
    return [...accounts].sort((a, b) => {
      let av = sortCol === '_healthScore'
        ? (a._health?.score ?? 0)
        : sortCol === 'ghlDaysSinceUpdate'
          ? (a.ghlDaysSinceUpdate ?? 9999)
          : (a[sortCol] ?? '')
      let bv = sortCol === '_healthScore'
        ? (b._health?.score ?? 0)
        : sortCol === 'ghlDaysSinceUpdate'
          ? (b.ghlDaysSinceUpdate ?? 9999)
          : (b[sortCol] ?? '')
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
    else { setSortCol(col); setSortDir(col === 'ghlDaysSinceUpdate' ? 'asc' : 'desc') }
    setPage(1)
  }

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: '400ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="px-4 sm:px-6 py-4 border-b border-brand-border flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-start gap-2">
          <div>
            <h2 className="text-brand-heading font-semibold text-sm">All GHL Sub-accounts</h2>
            <p className="text-brand-muted text-[11px] mt-0.5">
              <span className="font-medium text-brand-text">{accounts.length}</span> accounts · click column header to sort
            </p>
          </div>
          <InfoTip
            text="All active GHL sub-accounts. Data pulled live from GHL Agency API. Click any account name to see full details and live CRM data."
            position="top-end"
          />
        </div>
      </div>

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
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                    {col.tip && (
                      <span onClick={e => e.stopPropagation()}>
                        <InfoTip text={col.tip} position="bottom-end" />
                      </span>
                    )}
                  </span>
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
            {pageData.map(a => (
              <tr
                key={a.id}
                className="border-b border-brand-border/50 hover:bg-brand-bg/50 transition-colors duration-100"
              >
                <td className="pl-5 pr-3 py-2.5">
                  <button
                    onClick={() => onAccountClick?.(a)}
                    className="text-[12px] font-medium text-brand-text hover:underline text-left"
                  >
                    {a.accountName}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-[11px] text-brand-muted">
                  {[a.ghlCity, a.ghlState].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-3 py-2.5 text-[11px] text-brand-muted truncate max-w-[180px]">
                  {a.ghlEmail || '—'}
                </td>
                <td className="px-3 py-2.5 text-[11px] text-brand-muted">
                  {a.ghlDateAdded
                    ? new Date(a.ghlDateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <ActivityBadge days={a.ghlDaysSinceUpdate} />
                </td>
                <td className="px-3 py-2.5 pr-5 text-center">
                  <HealthPill score={a._health?.score ?? 0} band={a._health?.band ?? 'at_risk'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
            >← Prev</button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold disabled:opacity-40 text-brand-muted border-brand-border hover:bg-brand-bg"
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
