// Matches QuickSight's tab structure (Lead Details, Sales Board, Lead
// Analytics, etc.) so the eventual full build has the same shape — but
// styled in LGM's own brand system rather than copying QuickSight's dark
// navy look, same "custom because branding matters" rule as everything
// else in this dashboard. Only "Lead Details" has content; every other tab
// is a placeholder until it gets built out.
export const TABS = [
  { key: 'lead-details',       label: 'Lead Details' },
  { key: 'sales-board',        label: 'Sales Board' },
  { key: 'lead-analytics',     label: 'Lead Analytics' },
  { key: 'bad-lead-trends',    label: 'Bad Lead Trends' },
  { key: 'marketing-weekly',   label: 'Marketing Weekly' },
  { key: 'sales-weekly',       label: 'Sales Weekly' },
  { key: 'marketing-monthly',  label: 'Marketing Monthly' },
  { key: 'sales-monthly',      label: 'Sales Monthly' },
  { key: 'marketing-quarterly',label: 'Marketing Quarterly' },
  { key: 'sales-quarterly',    label: 'Sales Quarterly' },
  { key: '12-week-plan',       label: '12-Week Plan' },
  { key: 'cohort',             label: 'Cohort' },
  { key: 'trends',             label: 'Trends' },
]

export default function MasterTabBar({ active, onChange }) {
  return (
    <div className="bg-white border-b border-brand-border overflow-x-auto">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 min-w-max">
        {TABS.map(tab => {
          const isActive = tab.key === active
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'text-brand-heading'
                  : 'text-brand-muted border-transparent hover:text-brand-heading'
              }`}
              style={isActive ? { borderColor: '#8CC63F' } : undefined}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
