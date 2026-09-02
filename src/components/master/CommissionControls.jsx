const G = '#8CC63F'

// Two John-requested controls: commission rate as an editable variable
// (was hardcoded at 10.5%) and a "Lead Buying" toggle — when off, cost-driven
// metrics (Lead Cost, Profit, PPL, CPP) don't apply and are hidden across the
// cards and pivot tables, while Written Premium and Commission still show.
export default function CommissionControls({ commissionRate, onCommissionRateChange, leadBuyingEnabled, onLeadBuyingChange }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <label className="flex items-center gap-2 text-[11px] font-semibold text-brand-muted">
        Commission Rate
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={Math.round(commissionRate * 1000) / 10}
            onChange={e => {
              const pct = Number(e.target.value)
              if (!Number.isNaN(pct)) onCommissionRateChange(pct / 100)
            }}
            className="w-16 text-[11px] px-2 py-1 rounded-lg border border-brand-border bg-white text-brand-text text-right"
          />
          <span className="text-brand-muted">%</span>
        </div>
      </label>

      <label className="flex items-center gap-2 text-[11px] font-semibold text-brand-muted cursor-pointer select-none">
        Lead Buying
        <button
          type="button"
          role="switch"
          aria-checked={leadBuyingEnabled}
          onClick={() => onLeadBuyingChange(!leadBuyingEnabled)}
          className="relative w-9 h-5 rounded-full transition-colors"
          style={{ background: leadBuyingEnabled ? G : '#D1D5DB' }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
            style={{ transform: leadBuyingEnabled ? 'translateX(16px)' : 'translateX(0)' }}
          />
        </button>
        <span className={leadBuyingEnabled ? 'text-brand-text' : 'text-brand-muted'}>{leadBuyingEnabled ? 'On' : 'Off'}</span>
      </label>
    </div>
  )
}
