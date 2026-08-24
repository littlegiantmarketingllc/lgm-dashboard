import { useState } from 'react'

function toISO(d) { return d.toISOString().slice(0, 10) }

function presetRange(key) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const to = toISO(now)

  switch (key) {
    case 'today':
      return { from: toISO(todayStart), to }

    case 'yesterday': {
      const yStart = new Date(todayStart); yStart.setDate(yStart.getDate() - 1)
      const yEnd   = new Date(todayStart); yEnd.setDate(yEnd.getDate() - 1)
      return { from: toISO(yStart), to: toISO(yEnd) }
    }

    case '7d': {
      const f = new Date(todayStart); f.setDate(f.getDate() - 7)
      return { from: toISO(f), to }
    }

    case 'mtd':
      return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to }

    case 'prev_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end   = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: toISO(start), to: toISO(end) }
    }

    case '30d': {
      const f = new Date(todayStart); f.setDate(f.getDate() - 30)
      return { from: toISO(f), to }
    }

    case '60d': {
      const f = new Date(todayStart); f.setDate(f.getDate() - 60)
      return { from: toISO(f), to }
    }

    case '90d':
    default: {
      const f = new Date(todayStart); f.setDate(f.getDate() - 90)
      return { from: toISO(f), to }
    }
  }
}

const PRESETS = [
  { key: 'today',      label: 'Today' },
  { key: 'yesterday',  label: 'Yesterday' },
  { key: '7d',         label: '7 Days' },
  { key: 'mtd',        label: 'This Month' },
  { key: 'prev_month', label: 'Last Month' },
  { key: '30d',        label: '30 Days' },
  { key: '60d',        label: '60 Days' },
  { key: '90d',        label: '90 Days' },
]

export default function DateFilterBar({ value, onChange }) {
  const [activePreset, setActivePreset] = useState(() => {
    // Initialize to '90d' and fire immediately so the parent gets a real date range on mount
    return '90d'
  })
  const [showCustom, setShowCustom] = useState(false)

  // Fire the default range on first render so the API always gets explicit dates
  const [initialized, setInitialized] = useState(false)
  if (!initialized) {
    setInitialized(true)
    // Use setTimeout to avoid setState-during-render warning
    setTimeout(() => onChange(presetRange('90d')), 0)
  }

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
    <div className="flex flex-wrap items-center gap-1.5">
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
          <button
            onClick={() => { if (value.from && value.to) onChange(value) }}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-white border-transparent"
            style={{ background: '#8CC63F' }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
