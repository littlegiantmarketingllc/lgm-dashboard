import { useMemo, useState } from 'react'
import { aggregateCustomers, RISK_BG, SENTIMENT_BG, uniqueMeetingIds } from '../../lib/qcUtils'

function RiskBadge({ level }) {
  if (!level) return null
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${RISK_BG[level] || 'bg-gray-100 text-gray-600'}`}>
      {level}
    </span>
  )
}

function SentimentBadge({ sentiment }) {
  if (!sentiment) return <span className="text-brand-muted text-[11px]">—</span>
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${SENTIMENT_BG[sentiment] || 'bg-gray-100 text-gray-600'}`}>
      {sentiment}
    </span>
  )
}

function TrendArrow({ trend }) {
  if (trend === 'improving') return <span className="text-green-600 font-bold text-sm" title="Improving">↑</span>
  if (trend === 'declining') return <span className="text-red-600 font-bold text-sm" title="Declining">↓</span>
  return <span className="text-brand-muted text-sm" title="Stable">→</span>
}

const RISK_SORT = { 'High': 0, 'Medium': 1, 'Low': 2, '': 3 }

const PAGE_SIZE = 25

export default function CustomerHealthPage({ calls, onCustomerClick }) {
  const [search, setSearch]       = useState('')
  const [riskFilter, setRisk]     = useState('all')
  const [sortKey, setSortKey]     = useState('risk')
  const [sortDir, setSortDir]     = useState('asc')
  const [page, setPage]           = useState(0)

  const customers = useMemo(() => aggregateCustomers(calls), [calls])

  const filtered = useMemo(() => {
    let c = customers
    if (search) {
      const q = search.toLowerCase()
      c = c.filter(x => x.name.toLowerCase().includes(q))
    }
    if (riskFilter !== 'all') c = c.filter(x => x.riskLevel === riskFilter)
    return c.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'risk') {
        const ra = RISK_SORT[a.riskLevel] ?? 3
        const rb = RISK_SORT[b.riskLevel] ?? 3
        return ra - rb
      }
      if (sortKey === 'name') return dir * a.name.localeCompare(b.name)
      if (sortKey === 'calls') return dir * (a.totalCalls - b.totalCalls)
      if (sortKey === 'date') return dir * a.latestDate.localeCompare(b.latestDate)
      return 0
    })
  }, [customers, search, riskFilter, sortKey, sortDir])

  const atRisk = useMemo(() =>
    customers.filter(c => c.riskLevel === 'High' || c.riskLevel === 'Medium'),
    [customers]
  )

  const paged   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPg = Math.ceil(filtered.length / PAGE_SIZE)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const SortTh = ({ colKey, label }) => (
    <th
      className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-brand-muted cursor-pointer hover:text-brand-heading select-none whitespace-nowrap"
      onClick={() => handleSort(colKey)}
    >
      {label}
      {sortKey === colKey && <span className="ml-1 text-brand-green">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )

  return (
    <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* At-risk highlight */}
      {atRisk.length > 0 && (
        <div className="animate-fade-in-up rounded-2xl border border-red-200 bg-red-50 p-5"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🚨</span>
            <h3 className="font-bold text-red-700 text-sm">At-Risk Clients ({atRisk.length})</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {atRisk.slice(0, 6).map(c => (
              <button
                key={c.name}
                onClick={() => onCustomerClick(c.name)}
                className="text-left p-3 rounded-xl border bg-white hover:border-red-300 transition-colors"
                style={{ borderColor: c.riskLevel === 'High' ? '#FCA5A5' : '#FCD34D' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-brand-heading truncate">{c.name}</span>
                  <RiskBadge level={c.riskLevel} />
                </div>
                <div className="flex items-center gap-2">
                  <SentimentBadge sentiment={c.latestSentiment} />
                  {c.openIssues.length > 0 && (
                    <span className="text-[10px] text-red-600 font-semibold">{c.openIssues.length} open issue{c.openIssues.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          {atRisk.length > 6 && (
            <p className="text-[11px] text-red-600 mt-2">+{atRisk.length - 6} more at-risk clients below</p>
          )}
        </div>
      )}

      {/* Main customer table */}
      <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white overflow-hidden"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-4 border-b border-brand-border flex flex-wrap items-center gap-3">
          <h3 className="font-bold text-brand-heading text-sm">All Customers</h3>
          <span className="text-brand-muted text-[11px]">{customers.length} total</span>
          <div className="flex-1 min-w-[140px] max-w-xs relative">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-muted pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search customers…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              className="w-full text-[11px] pl-6 pr-3 py-1.5 border border-brand-border rounded-lg bg-brand-bg focus:outline-none focus:border-brand-green text-brand-text placeholder-brand-muted"
            />
          </div>
          <select
            value={riskFilter}
            onChange={e => { setRisk(e.target.value); setPage(0) }}
            className="text-[11px] font-semibold border border-brand-border rounded-lg px-2.5 py-1.5 bg-brand-bg focus:outline-none text-brand-muted cursor-pointer"
          >
            <option value="all">All Risk Levels</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>
        </div>

        {!filtered.length ? (
          <div className="p-10 text-center text-brand-muted text-sm">
            {customers.length === 0 ? 'No customer data available.' : 'No customers match the current filters.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-bg">
                    <SortTh colKey="name"  label="Customer" />
                    <SortTh colKey="calls" label="Calls" />
                    <SortTh colKey="date"  label="Last Call" />
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Sentiment</th>
                    <SortTh colKey="risk"  label="Risk" />
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Trend</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Open Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(c => (
                    <tr
                      key={c.name}
                      className={`border-b border-brand-border/40 hover:bg-brand-bg/60 cursor-pointer transition-colors ${
                        c.riskLevel === 'High' ? 'border-l-2 border-l-red-400' : ''
                      }`}
                      onClick={() => onCustomerClick(c.name)}
                    >
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-brand-heading hover:text-brand-green transition-colors">
                          {c.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-brand-muted num">{c.totalCalls}</td>
                      <td className="px-3 py-2.5 text-brand-muted">{c.latestDate || '—'}</td>
                      <td className="px-3 py-2.5">
                        <SentimentBadge sentiment={c.latestSentiment} />
                      </td>
                      <td className="px-3 py-2.5">
                        <RiskBadge level={c.riskLevel} />
                      </td>
                      <td className="px-3 py-2.5">
                        <TrendArrow trend={c.trend} />
                      </td>
                      <td className="px-3 py-2.5">
                        {c.openIssues.length > 0 ? (
                          <span className="text-[11px] font-semibold text-red-600">{c.openIssues.length}</span>
                        ) : (
                          <span className="text-brand-muted text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPg > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-brand-border bg-brand-bg">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-[11px] px-2.5 py-1 rounded border border-brand-border text-brand-muted hover:text-brand-heading disabled:opacity-40 transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-[11px] text-brand-muted">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPg - 1, p + 1))}
                  disabled={page >= totalPg - 1}
                  className="text-[11px] px-2.5 py-1 rounded border border-brand-border text-brand-muted hover:text-brand-heading disabled:opacity-40 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
