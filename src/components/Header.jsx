import { useState, useEffect } from 'react'

function RefreshIcon({ spinning }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${spinning ? 'animate-spin-slow' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M8 16H3v5"/>
    </svg>
  )
}

function timeAgo(date) {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 10)  return 'just now'
  if (secs < 60)  return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60)  return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

export default function Header({ rangeDays, setRangeDays, rangeOptions }) {
  const [refreshed, setRefreshed] = useState(new Date())
  const [spinning, setSpinning]   = useState(false)
  const [elapsed, setElapsed]     = useState('just now')

  useEffect(() => {
    const id = setInterval(() => setElapsed(timeAgo(refreshed)), 15000)
    setElapsed(timeAgo(refreshed))
    return () => clearInterval(id)
  }, [refreshed])

  const handleRefresh = () => {
    if (spinning) return
    setSpinning(true)
    setTimeout(() => {
      setRefreshed(new Date())
      setSpinning(false)
      setElapsed('just now')
    }, 900)
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-brand-border"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[60px] gap-4">

          {/* ── Logo + brand ── */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Actual LGM logo image */}
            <img
              src="/lgm-logo.png"
              alt="Little Giant Marketing"
              className="h-9 w-auto flex-shrink-0 object-contain"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />

            {/* SVG fallback (hidden unless img fails) */}
            <div className="flex-shrink-0 items-center gap-2.5 hidden" aria-hidden="true">
              <svg width="38" height="38" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="16" stroke="#4A4A4A" strokeWidth="6" fill="none"/>
                <path
                  d="M29.3 12.7 A11 11 0 1 0 33 22 L23 22"
                  stroke="#8CC63F" strokeWidth="4" strokeLinecap="round" fill="none"
                />
              </svg>
              <div className="hidden sm:block leading-tight">
                <p className="text-[13px] font-bold text-[#4A4A4A] leading-none tracking-tight">Little Giant</p>
                <p className="text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: '#8CC63F' }}>Marketing</p>
              </div>
            </div>

            {/* Brand text */}
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

          {/* ── Right controls ── */}
          <div className="flex items-center gap-3 flex-shrink-0">

            {/* Live indicator */}
            <div className="hidden md:flex items-center gap-1.5 text-brand-muted text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
              Updated {elapsed}
            </div>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 text-brand-muted hover:text-brand-text transition-colors text-[11px] px-2.5 py-1.5 rounded-lg border border-brand-border hover:border-[#C8CCC8] bg-brand-bg"
            >
              <RefreshIcon spinning={spinning} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Date range filter */}
            <div className="flex items-center gap-0.5 bg-brand-bg border border-brand-border rounded-lg p-0.5">
              {rangeOptions.map(opt => {
                const active = rangeDays === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setRangeDays(opt.value)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wide transition-all duration-200 ${
                      active
                        ? 'text-white btn-green-active'
                        : 'text-brand-muted hover:text-brand-text hover:bg-white'
                    }`}
                    style={active ? { background: '#8CC63F' } : {}}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

          </div>
        </div>
      </div>
    </header>
  )
}
