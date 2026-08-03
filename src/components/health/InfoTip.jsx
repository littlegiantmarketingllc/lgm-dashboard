import { useState } from 'react'

export default function InfoTip({ text, position = 'top-end' }) {
  const [show, setShow] = useState(false)

  const posClass = {
    'top-end':    'bottom-full right-0 mb-2',
    'top-start':  'bottom-full left-0 mb-2',
    'bottom-end': 'top-full right-0 mt-2',
  }[position] ?? 'bottom-full right-0 mb-2'

  return (
    <div className="relative inline-flex flex-shrink-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <button
        className="w-4 h-4 rounded-full border border-brand-border bg-brand-bg text-brand-muted text-[9px] font-bold flex items-center justify-center cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
        tabIndex={0}
        aria-label="More info"
        type="button"
      >
        ?
      </button>
      {show && (
        <div
          className={`absolute z-[60] w-56 text-[11px] leading-relaxed text-brand-heading bg-white border border-brand-border rounded-xl px-3 py-2.5 pointer-events-none ${posClass}`}
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
        >
          {text}
        </div>
      )}
    </div>
  )
}
