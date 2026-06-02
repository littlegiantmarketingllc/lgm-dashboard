import { useEffect, useState } from 'react'

const RANGE_OPTIONS = [
  { label: 'Today',  value: 'today' },
  { label: '2d',     value: '2d' },
  { label: '7d',     value: '7d' },
  { label: '14d',    value: '14d' },
  { label: '30d',    value: '30d' },
  { label: 'All',    value: 'all' },
  { label: 'Custom', value: 'custom' },
]

function RefreshIcon({ spinning }) {
  return (
    <svg className={`w-3.5 h-3.5 ${spinning ? 'animate-spin-slow' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M8 16H3v5"/>
    </svg>
  )
}

function timeAgo(date) {
  if (!date) return '—'
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 10)  return 'just now'
  if (secs < 60)  return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60)  return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Header({
  filter, setFilter,
  lastUpdated, onRefresh, isRefreshing, dataError,
}) {
  const [elapsed, setElapsed] = useState('—')

  useEffect(() => {
    setElapsed(timeAgo(lastUpdated))
    const id = setInterval(() => setElapsed(timeAgo(lastUpdated)), 15_000)
    return () => clearInterval(id)
  }, [lastUpdated])

  const setType = (type) => setFilter(prev => ({ ...prev, type }))

  const isCustom = filter.type === 'custom'

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-brand-border"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Row 1: logo + controls ── */}
        <div className="flex items-center justify-between h-[60px] gap-4">

          {/* Logo + brand */}
          <div className="flex items-center gap-3 min-w-0">
            <img src="/lgm-logo.png" alt="Little Giant Marketing"
              className="h-9 w-auto flex-shrink-0 object-contain"
              onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
            />
            {/* SVG fallback */}
            <div className="flex-shrink-0 items-center gap-2.5 hidden" aria-hidden="true">
              <svg width="38" height="38" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="16" stroke="#4A4A4A" strokeWidth="6" fill="none"/>
                <path d="M29.3 12.7 A11 11 0 1 0 33 22 L23 22"
                  stroke="#8CC63F" strokeWidth="4" strokeLinecap="round" fill="none"/>
              </svg>
              <div className="hidden sm:block leading-tight">
                <p className="text-[13px] font-bold text-[#4A4A4A] leading-none tracking-tight">Little Giant</p>
                <p className="text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: '#8CC63F' }}>Marketing</p>
              </div>
            </div>

            <div className="hidden sm:block leading-tight min-w-0">
              <p className="shimmer-text text-[10px] font-extrabold tracking-[0.2em] uppercase leading-none">
                Little Giant Marketing
              </p>
              <p className="text-brand-heading font-semibold text-[15px] leading-tight mt-0.5 truncate">
                Quality Control Dashboard
              </p>
            </div>
            <p className="sm:hidden text-brand-heading font-semibold text-sm">QC Dashboard</p>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3 flex-shrink-0">

            {/* Live indicator */}
            <div className="hidden md:flex items-center gap-1.5 text-brand-muted text-[11px]">
              {dataError
                ? <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                : <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse inline-block" />
              }
              {lastUpdated ? `Updated ${elapsed}` : 'Loading…'}
            </div>

            {/* Refresh */}
            <button onClick={() => { if (!isRefreshing && onRefresh) onRefresh() }}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 text-brand-muted hover:text-brand-text transition-colors text-[11px] px-2.5 py-1.5 rounded-lg border border-brand-border hover:border-[#C8CCC8] bg-brand-bg disabled:opacity-50">
              <RefreshIcon spinning={isRefreshing} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>

            {/* Date range buttons */}
            <div className="flex items-center gap-0.5 bg-brand-bg border border-brand-border rounded-lg p-0.5 overflow-x-auto max-w-[360px] sm:max-w-none">
              {RANGE_OPTIONS.map(opt => {
                const active = filter.type === opt.value
                return (
                  <button key={opt.value} onClick={() => setType(opt.value)}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                      active ? 'text-white btn-green-active' : 'text-brand-muted hover:text-brand-text hover:bg-white'
                    }`}
                    style={active ? { background: '#8CC63F' } : {}}>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Row 2: custom date pickers (only when Custom active) ── */}
        {isCustom && (
          <div className="border-t border-brand-border/50 py-2.5 flex flex-wrap items-center gap-3">
            <span className="text-brand-muted text-[11px] font-semibold">Date range:</span>

            <div className="flex items-center gap-1.5">
              <label className="text-brand-muted text-[11px]">From</label>
              <input
                type="date"
                value={filter.from}
                max={filter.to || todayStr()}
                onChange={e => setFilter(prev => ({ ...prev, from: e.target.value }))}
                className="text-[12px] text-brand-text border border-brand-border rounded-lg px-2.5 py-1 bg-brand-bg focus:outline-none focus:border-brand-green"
              />
            </div>

            <span className="text-brand-muted text-[11px]">→</span>

            <div className="flex items-center gap-1.5">
              <label className="text-brand-muted text-[11px]">To</label>
              <input
                type="date"
                value={filter.to}
                min={filter.from}
                max={todayStr()}
                onChange={e => setFilter(prev => ({ ...prev, to: e.target.value }))}
                className="text-[12px] text-brand-text border border-brand-border rounded-lg px-2.5 py-1 bg-brand-bg focus:outline-none focus:border-brand-green"
              />
            </div>

            {filter.from && filter.to && (
              <span className="text-brand-muted text-[11px]">
                Showing {filter.from} → {filter.to}
              </span>
            )}
            {(!filter.from || !filter.to) && (
              <span className="text-amber-600 text-[11px]">Select both dates to filter</span>
            )}
          </div>
        )}

      </div>
    </header>
  )
}
