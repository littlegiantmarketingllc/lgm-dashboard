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

// Gray dashed cell for billing-dependent columns
function Dash({ tip }) {
  return (
    <span className="text-brand-border text-[12px] font-semibold" title={tip || 'Requires billing data'}>—</span>
  )
}

const LIVE_COLUMNS = [
  { key: 'accountName',        label: 'Account Name',  align: 'left',   billing: false },
  { key: 'accountType',        label: 'Type',          align: 'left',   billing: true,  tip: 'DM (Digital Marketing) or Agent (AI). Requires billing sheet to differentiate.' },
  { key: 'ghlCity',            label: 'Location',      align: 'left',   billing: false },
  { key: 'ghlEmail',           label: 'Email',         align: 'left',   billing: false },
  { key: 'ghlDateAdded',       label: 'Joined GHL',    align: 'left',   billing: false, tip: 'Date this sub-account was created in GHL.' },
  { key: 'totalRev',           label: 'Total Rev',     align: 'right',  billing: true,  tip: 'Total monthly charges (plan + users + add-ons + LC wallet). Requires billing sheet.' },
  { key: 'planPrice',          label: 'Plan Price',    align: 'right',  billing: true,  tip: 'Base monthly plan subscription price. Requires billing sheet.' },
  { key: 'users',              label: 'Users',         align: 'center', billing: true,  tip: 'Adjusted user seat count. Requires billing sheet (live count available in account modal via GHL OAuth).' },
  { key: 'transactions',       label: 'Transactions',  align: 'center', billing: true,  tip: 'DataHealthStatus × 1000 — a proxy for platform usage volume. Requires billing sheet.' },
  { key: 'addOns',             label: 'Add-ons',       align: 'right',  billing: true,  tip: 'Monthly add-on charges above base plan. Requires billing sheet.' },
  { key: 'annualSubs',         label: 'Annual Subs',   align: 'right',  billing: true,  tip: 'Annual subscription component. Requires billing sheet.' },
  { key: 'gpPct',              label: 'GP%',           align: 'center', billing: true,  tip: 'Gross profit percentage. Requires billing sheet.' },
  { key: 'multiLoc',           label: 'Multi-Loc',     align: 'center', billing: true,  tip: 'Whether this account spans multiple GHL locations. Requires billing sheet.' },
  { key: 'ghlDaysSinceUpdate', label: 'Last Activity', align: 'center', billing: false, tip: 'Days since the GHL sub-account record was last updated — best available proxy for account activity.' },
  { key: '_healthScore',       label: 'Health',        align: 'center', billing: false, tip: 'Composite score: 50% tenure + 50% activity. Healthy = 70+, Watch = 40–69, At-Risk < 40.' },
]

const SORTABLE_COLS = new Set(['accountName', 'ghlCity', 'ghlDateAdded', 'ghlDaysSinceUpdate', '_healthScore'])
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
    if (!SORTABLE_COLS.has(col)) return
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir(col === 'ghlDaysSinceUpdate' ? 'asc' : 'desc') }
    setPage(1)
  }

  const billingCols = LIVE_COLUMNS.filter(c => c.billing).map(c => c.label)

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: '400ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="px-4 sm:px-6 py-4 border-b border-brand-border flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-start gap-2">
          <div>
            <h2 className="text-brand-heading font-semibold text-sm">All Accounts</h2>
            <p className="text-brand-muted text-[11px] mt-0.5">
              <span className="font-medium text-brand-text">{accounts.length}</span> sub-accounts · click column header to sort · billing columns (—) require Stripe or billing sheet
            </p>
          </div>
          <InfoTip
            text="Full client portfolio — all GHL sub-accounts. Live columns (Account Name, Location, Email, Joined GHL, Last Activity, Health) pull from GoHighLevel in real time. Billing columns (Type, Total Rev, Plan Price, Users, Transactions, Add-ons, Annual Subs, GP%, Multi-Loc) show — until Stripe or the billing sheet is connected."
            position="top-end"
          />
        </div>
        {billingCols.length > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            <span>⚠</span>
            <span>Billing columns show — until Stripe or billing sheet is connected</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/50">
              {LIVE_COLUMNS.map(col => {
                const sortable = SORTABLE_COLS.has(col.key)
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-3 py-3 first:pl-5 last:pr-5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap select-none text-${col.align} ${
                      sortable ? 'cursor-pointer hover:text-brand-heading text-brand-muted' : 'text-brand-border cursor-default'
                    } ${col.billing ? 'opacity-60' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                      {col.tip && (
                        <span onClick={e => e.stopPropagation()}>
                          <InfoTip text={col.tip} position="bottom-end" />
                        </span>
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr>
                <td colSpan={LIVE_COLUMNS.length} className="py-12 text-center text-brand-muted text-sm">
                  No accounts match the current filters.
                </td>
              </tr>
            )}
            {pageData.map(a => (
              <tr
                key={a.id}
                className="border-b border-brand-border/50 hover:bg-brand-bg/50 transition-colors duration-100"
              >
                {/* Account Name */}
                <td className="pl-5 pr-3 py-2.5">
                  <button
                    onClick={() => onAccountClick?.(a)}
                    className="text-[12px] font-medium text-brand-text hover:underline text-left"
                  >
                    {a.accountName}
                  </button>
                </td>
                {/* Type — billing */}
                <td className="px-3 py-2.5 text-center"><Dash tip="Account type (DM / Agent) — requires billing sheet" /></td>
                {/* Location */}
                <td className="px-3 py-2.5 text-[11px] text-brand-muted">
                  {[a.ghlCity, a.ghlState].filter(Boolean).join(', ') || '—'}
                </td>
                {/* Email */}
                <td className="px-3 py-2.5 text-[11px] text-brand-muted truncate max-w-[160px]">
                  {a.ghlEmail || '—'}
                </td>
                {/* Joined GHL */}
                <td className="px-3 py-2.5 text-[11px] text-brand-muted whitespace-nowrap">
                  {a.ghlDateAdded
                    ? new Date(a.ghlDateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </td>
                {/* Total Rev — billing */}
                <td className="px-3 py-2.5 text-right"><Dash tip="Total monthly charges — requires billing sheet" /></td>
                {/* Plan Price — billing */}
                <td className="px-3 py-2.5 text-right"><Dash tip="Base plan price — requires billing sheet" /></td>
                {/* Users — billing */}
                <td className="px-3 py-2.5 text-center"><Dash tip="User seat count — requires billing sheet (live count in account modal)" /></td>
                {/* Transactions — billing */}
                <td className="px-3 py-2.5 text-center"><Dash tip="DataHealthStatus — requires billing sheet" /></td>
                {/* Add-ons — billing */}
                <td className="px-3 py-2.5 text-right"><Dash tip="Add-on charges — requires billing sheet" /></td>
                {/* Annual Subs — billing */}
                <td className="px-3 py-2.5 text-right"><Dash tip="Annual subscriptions — requires billing sheet" /></td>
                {/* GP% — billing */}
                <td className="px-3 py-2.5 text-center"><Dash tip="Gross profit % — requires billing sheet" /></td>
                {/* Multi-Loc — billing */}
                <td className="px-3 py-2.5 text-center"><Dash tip="Multi-location flag — requires billing sheet" /></td>
                {/* Last Activity */}
                <td className="px-3 py-2.5 text-center">
                  <ActivityBadge days={a.ghlDaysSinceUpdate} />
                </td>
                {/* Health */}
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
