import { useState } from 'react'

function toISO(d) { return d.toISOString().slice(0, 10) }

function presetRange(key) {
  const now = new Date()
  const to = new Date(now)
  let from

  switch (key) {
    case 'mtd': {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    }
    case 'prev_month': {
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0) // last day of previous month
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { from: toISO(from), to: toISO(prevMonthEnd) }
    }
    case '30d': from = new Date(now); from.setDate(from.getDate() - 30); break
    case '60d': from = new Date(now); from.setDate(from.getDate() - 60); break
    case '90d': from = new Date(now); from.setDate(from.getDate() - 90); break
    default: from = new Date(now); from.setDate(from.getDate() - 90)
  }
  return { from: toISO(from), to: toISO(to) }
}

const PRESETS = [
  { key: 'mtd',        label: 'Month to Date' },
  { key: 'prev_month', label: 'Previous Month' },
  { key: '30d',        label: 'Last 30 Days' },
  { key: '60d',        label: 'Last 60 Days' },
  { key: '90d',        label: 'Last 90 Days' },
]

// Date-range picker for the whole dashboard — presets cover the common cases,
// "Custom" drops to two raw date inputs for anything else. Selecting anything
// here re-fetches from /api/master-leads (a new date range means new data to
// pull from GHL, not just a client-side filter like Owner/Source).
export default function DateFilterBar({ value, onChange }) {
  const [activePreset, setActivePreset] = useState('90d')
  const [showCustom, setShowCustom] = useState(false)

  function selectPreset(key) {
    setActivePreset(key)
    setShowCustom(false)
    onChange(presetRange(key))
  }

  function selectCustom() {
    setActivePreset(null)
    setShowCustom(true)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(p => (
        <button
          key={p.key}
          onClick={() => selectPreset(p.key)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
            activePreset === p.key
              ? 'text-white border-transparent'
              : 'text-brand-muted border-brand-border bg-white hover:bg-brand-bg'
          }`}
          style={activePreset === p.key ? { background: '#8CC63F' } : undefined}
        >
          {p.label}
        </button>
      ))}
      <button
        onClick={selectCustom}
        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
          showCustom
            ? 'text-white border-transparent'
            : 'text-brand-muted border-brand-border bg-white hover:bg-brand-bg'
        }`}
        style={showCustom ? { background: '#8CC63F' } : undefined}
      >
        Custom
      </button>

      {showCustom && (
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={value.from}
            onChange={e => onChange({ from: e.target.value, to: value.to })}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-brand-border bg-white text-brand-text"
          />
          <span className="text-brand-muted text-[11px]">to</span>
          <input
            type="date"
            value={value.to}
            onChange={e => onChange({ from: value.from, to: e.target.value })}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-brand-border bg-white text-brand-text"
          />
        </div>
      )}
    </div>
  )
}
