const G = '#8CC63F'

const DATE_OPTIONS = [
  { label: 'All Time',    value: 'all'        },
  { label: 'This Month',  value: 'this_month' },
  { label: 'Last Month',  value: 'last_month' },
  { label: 'Last 30d',    value: 'last_30'    },
  { label: 'Last 90d',    value: 'last_90'    },
  { label: 'Custom',      value: 'custom'     },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY = { search: '', typeFilter: 'all', bandFilter: 'all', dateRange: { type: 'all', from: '', to: '' } }

export default function HealthFilterBar({ filters, setFilters, accountTypes, totalShowing, totalAll }) {
  const { search, typeFilter, bandFilter, dateRange } = filters

  const set    = (patch) => setFilters(f => ({ ...f, ...patch }))
  const setDR  = (patch) => setFilters(f => ({ ...f, dateRange: { ...f.dateRange, ...patch } }))
  const isDirty = search || typeFilter !== 'all' || bandFilter !== 'all' || dateRange.type !== 'all'

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2 sm:gap-3">

        {/* Search */}
        <input
          type="text"
          placeholder="Search accounts…"
          value={search}
          onChange={e => set({ search: e.target.value })}
          className="text-[12px] border border-brand-border rounded-lg px-3 py-1.5 bg-brand-bg focus:outline-none focus:border-brand-green flex-shrink-0 w-[175px]"
        />

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => set({ typeFilter: e.target.value })}
          className="text-[11px] font-semibold border border-brand-border rounded-lg px-2.5 py-1.5 bg-brand-bg focus:outline-none cursor-pointer flex-shrink-0 transition-colors duration-150"
          style={{
            color:       typeFilter !== 'all' ? '#3a6b10' : '#6B7280',
            background:  typeFilter !== 'all' ? `${G}10`  : '#F4F6F4',
            borderColor: typeFilter !== 'all' ? `${G}50`  : '#E5E7E5',
          }}
        >
          <option value="all">All Types</option>
          {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Band filter */}
        <select
          value={bandFilter}
          onChange={e => set({ bandFilter: e.target.value })}
          className="text-[11px] font-semibold border border-brand-border rounded-lg px-2.5 py-1.5 bg-brand-bg focus:outline-none cursor-pointer flex-shrink-0 transition-colors duration-150"
          style={{
            color:       bandFilter !== 'all' ? '#3a6b10' : '#6B7280',
            background:  bandFilter !== 'all' ? `${G}10`  : '#F4F6F4',
            borderColor: bandFilter !== 'all' ? `${G}50`  : '#E5E7E5',
          }}
        >
          <option value="all">All Health</option>
          <option value="healthy">Healthy (80+)</option>
          <option value="watch">Watch (50–79)</option>
          <option value="at_risk">At-Risk (&lt;50)</option>
        </select>

        {/* Divider */}
        <div className="w-px h-5 bg-brand-border flex-shrink-0 hidden sm:block" />

        {/* Date range pills */}
        <div className="flex items-center gap-0.5 bg-brand-bg border border-brand-border rounded-lg p-0.5 flex-shrink-0 overflow-x-auto">
          {DATE_OPTIONS.map(opt => {
            const active = dateRange.type === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setDR({ type: opt.value })}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                  active ? 'text-white btn-green-active' : 'text-brand-muted hover:text-brand-text hover:bg-white'
                }`}
                style={active ? { background: G } : {}}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Result count + Reset */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {isDirty && (
            <span className="text-[11px] text-brand-muted">
              <span className="font-semibold text-brand-text">{totalShowing}</span> of {totalAll} accounts
            </span>
          )}
          {isDirty && (
            <button
              onClick={() => setFilters(EMPTY)}
              className="text-[11px] font-semibold text-brand-muted hover:text-brand-text border border-brand-border rounded-lg px-2.5 py-1.5 bg-brand-bg transition-colors flex-shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Custom date row */}
      {dateRange.type === 'custom' && (
        <div className="border-t border-brand-border/50 px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-brand-muted text-[11px] font-semibold flex-shrink-0">Filter by Stripe Start Date:</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <label className="text-brand-muted text-[11px]">From</label>
            <input
              type="date"
              value={dateRange.from}
              max={dateRange.to || todayStr()}
              onChange={e => setDR({ from: e.target.value })}
              className="text-[12px] text-brand-text border border-brand-border rounded-lg px-2.5 py-1 bg-brand-bg focus:outline-none focus:border-brand-green w-[140px]"
            />
          </div>
          <span className="text-brand-muted text-[11px]">→</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <label className="text-brand-muted text-[11px]">To</label>
            <input
              type="date"
              value={dateRange.to}
              min={dateRange.from}
              onChange={e => setDR({ to: e.target.value })}
              className="text-[12px] text-brand-text border border-brand-border rounded-lg px-2.5 py-1 bg-brand-bg focus:outline-none focus:border-brand-green w-[140px]"
            />
          </div>
          {(!dateRange.from || !dateRange.to) && (
            <span className="text-amber-600 text-[11px]">Select both dates to filter</span>
          )}
        </div>
      )}
    </div>
  )
}
