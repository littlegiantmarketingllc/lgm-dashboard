import { useState, useRef, useEffect } from 'react'

// Checkbox-list dropdown — an empty `selected` array means "All" (no filter
// applied), matching the previous single-select's "" = All convention so the
// rest of the filtering logic barely changes.
export default function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggle(option) {
    if (selected.includes(option)) onChange(selected.filter(o => o !== option))
    else onChange([...selected, option])
  }

  const summary = selected.length === 0
    ? 'All'
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`

  return (
    <div className="relative" ref={ref}>
      <label className="flex items-center gap-1.5 text-[11px]">
        <span className="text-brand-muted font-semibold whitespace-nowrap">{label}</span>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border border-brand-border bg-white text-brand-text text-[11px] max-w-[180px] min-w-[110px] cursor-pointer"
        >
          <span className="truncate">{summary}</span>
          <span className="text-brand-muted text-[9px]">▾</span>
        </button>
      </label>

      {open && (
        <div className="absolute z-30 mt-1 w-56 max-h-64 overflow-y-auto rounded-xl border border-brand-border bg-white py-1.5"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          <div className="flex items-center justify-between px-3 py-1 border-b border-brand-border/60 mb-1">
            <button type="button" onClick={() => onChange([])} className="text-[10px] font-semibold text-brand-muted hover:text-brand-heading">
              Clear (All)
            </button>
            <button type="button" onClick={() => onChange(options)} className="text-[10px] font-semibold text-brand-muted hover:text-brand-heading">
              Select all
            </button>
          </div>
          {options.map(o => (
            <label key={o} className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-brand-text hover:bg-brand-bg cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={() => toggle(o)}
                className="accent-[#8CC63F]"
              />
              <span className="truncate">{o}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
