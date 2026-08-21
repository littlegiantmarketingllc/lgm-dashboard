import { useState, useMemo } from 'react'
import InfoTip from '../health/InfoTip'

function fmtMoney(n) { return n > 0 ? '$' + Math.round(n).toLocaleString() : '$0' }
function fmtPct(n) { return n === null || n === undefined ? '—' : Math.round(n * 10) / 10 + '%' }
function fmtNum(n, decimals = 0) { return n === null || n === undefined ? '—' : n.toFixed(decimals) }

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="text-brand-border ml-0.5 text-[9px]">↕</span>
  return <span className="ml-0.5 text-[9px]" style={{ color: '#8CC63F' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

const COLS = [
  { key: 'label',        label: 'Name',      align: 'left',  fmt: v => v },
  { key: 'leadCount',     label: 'Leads',     align: 'right', fmt: v => v.toLocaleString() },
  { key: 'saleCount',     label: 'Sale Count', align: 'right', fmt: v => v.toLocaleString() },
  { key: 'wonPremium',    label: 'Premium',   align: 'right', fmt: fmtMoney },
  { key: 'dispoRate',     label: 'Dispo Rate', align: 'right', fmt: fmtPct, tip: 'Blocked until the custom-fields OAuth scope is enabled.' },
  { key: 'callsPerLead',  label: 'Calls/Lead', align: 'right', fmt: v => fmtNum(v, 2), tip: 'Blocked until the custom-fields OAuth scope is enabled.' },
]

// Generic pivot table — takes rows already shaped by pivotBySource()/pivotByOwner()
// in lib/masterMetrics.js. Same sortable-header pattern as MasterAccountsTable.jsx
// in the Health dashboard, so both parts of the app read as one product.
export default function PivotTable({ title, subtitle, rows, delay = 0 }) {
  const [sortCol, setSortCol] = useState('leadCount')
  const [sortDir, setSortDir] = useState('desc')

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol]
      if (av === null || av === undefined) av = -Infinity
      if (bv === null || bv === undefined) bv = -Infinity
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, sortCol, sortDir])

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir(col === 'label' ? 'asc' : 'desc') }
  }

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>

      <div className="px-4 sm:px-5 py-3.5 border-b border-brand-border">
        <h2 className="text-brand-heading font-semibold text-sm">{title}</h2>
        <p className="text-brand-muted text-[10px] mt-0.5">{subtitle} · click a column to sort</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/50">
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-3 py-2 first:pl-5 last:pr-4 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap select-none cursor-pointer hover:text-brand-heading text-brand-muted text-${col.align}`}
                >
                  <span className="inline-flex items-center gap-0.5">
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
            {sorted.length === 0 && (
              <tr><td colSpan={COLS.length} className="py-10 text-center text-brand-muted text-sm">No data for this window.</td></tr>
            )}
            {sorted.map(row => (
              <tr key={row.label} className="border-b border-brand-border/40 hover:bg-brand-bg/60 transition-colors duration-100">
                {COLS.map(col => (
                  <td key={col.key}
                    className={`px-3 py-2 first:pl-5 last:pr-4 text-[11px] text-${col.align} ${col.key === 'label' ? 'font-medium text-brand-text truncate max-w-[220px]' : 'num text-brand-text'}`}
                  >
                    {row[col.key] === null || row[col.key] === undefined
                      ? <span className="text-brand-border">—</span>
                      : col.fmt(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
