import { useState, useMemo } from 'react'
import InfoTip from '../health/InfoTip'

function fmtMoney(n) { return n > 0 ? '$' + Math.round(n).toLocaleString() : '$0' }
function fmtPct(n) { return n === null || n === undefined ? '—' : Math.round(n * 10) / 10 + '%' }
function fmtNum(n, decimals = 0) { return n === null || n === undefined ? '—' : n.toFixed(decimals) }

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="text-brand-border ml-0.5 text-[9px]">↕</span>
  return <span className="ml-0.5 text-[9px]" style={{ color: '#8CC63F' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function fmtSignedMoney(n) { if (n === null || n === undefined) return '—'; const s = n < 0 ? '-$' : '$'; return s + Math.round(Math.abs(n)).toLocaleString() }

// Full column set matches QuickSight's Lead Source / Assigned Owner / Lead
// Profile matrices exactly (per Steve's spec + the screenshots John/Steve
// shared) — every metric computeOverview() already produces per group. This
// table scrolls horizontally within its own card (overflow-x-auto below);
// the page itself never scrolls sideways since each table is full-width and
// stacked (see MasterDashboard.jsx).
const COLS = [
  { key: 'label',            label: 'Name',           align: 'left',  fmt: v => v },
  { key: 'leadCount',        label: 'Leads',          align: 'right', fmt: v => v.toLocaleString() },
  { key: 'leadCost',         label: 'Lead Cost',      align: 'right', fmt: fmtMoney },
  { key: 'dispoRate',        label: 'Dispo Rate',     align: 'right', fmt: fmtPct },
  { key: 'smsReplyRate',     label: 'SMS Reply',      align: 'right', fmt: fmtPct },
  { key: 'optOutRate',       label: 'Opt Out',        align: 'right', fmt: fmtPct },
  { key: 'quoteRate',        label: 'Quote Rate',     align: 'right', fmt: fmtPct },
  { key: 'callsPerLead',     label: 'Calls/Lead',     align: 'right', fmt: v => fmtNum(v, 2) },
  { key: 'badLeadRate',      label: 'Bad Lead',       align: 'right', fmt: fmtPct },
  { key: 'rateTooHighRate',  label: 'Rate Too High',  align: 'right', fmt: fmtPct },
  { key: 'newCustomers',     label: 'Customers',      align: 'right', fmt: v => v.toLocaleString() },
  { key: 'quotesToCloseRate',label: 'Quotes→Close',   align: 'right', fmt: fmtPct },
  { key: 'closeRate',        label: 'Close Rate',     align: 'right', fmt: fmtPct },
  { key: 'callsToClose',     label: 'Calls to Close', align: 'right', fmt: v => fmtNum(v, 2) },
  { key: 'cpp',              label: 'CPP',            align: 'right', fmt: fmtMoney },
  { key: 'writtenPremium',   label: 'Premium',        align: 'right', fmt: fmtMoney },
  { key: 'commission',       label: 'Commission',     align: 'right', fmt: fmtMoney },
  { key: 'profit',           label: 'Profit',         align: 'right', fmt: fmtSignedMoney },
  { key: 'ppl',              label: 'PPL',            align: 'right', fmt: fmtSignedMoney },
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
                  className={`px-3 py-2 first:pl-5 last:pr-4 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap select-none cursor-pointer hover:text-brand-heading text-brand-muted text-${col.align} ${col.key === 'label' ? 'sticky left-0 z-20 bg-brand-bg border-r border-brand-border' : ''}`}
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
              <tr key={row.label} className="group border-b border-brand-border/40 hover:bg-brand-bg/60 transition-colors duration-100">
                {COLS.map(col => (
                  <td key={col.key}
                    className={`px-3 py-2 first:pl-5 last:pr-4 text-[11px] text-${col.align} ${col.key === 'label' ? 'font-medium text-brand-text truncate max-w-[220px] sticky left-0 z-10 bg-white group-hover:bg-[#f3f6f2] border-r border-brand-border' : 'num text-brand-text'}`}
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
