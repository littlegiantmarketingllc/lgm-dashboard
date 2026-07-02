const G = '#8CC63F'
const TABS = [
  { id: 'qc',     label: 'Team AI Assistant' },
  { id: 'health', label: 'Customer Health' },
]

export default function TabSwitcher({ activeTab, setActiveTab }) {
  return (
    <div className="bg-white border-b border-brand-border">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1">
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-3 text-[13px] font-semibold transition-all duration-200 whitespace-nowrap ${
                  active ? 'text-brand-text' : 'text-brand-muted hover:text-brand-heading'
                }`}
              >
                {tab.label}
                {active && (
                  <span
                    className="animate-scale-in absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                    style={{ background: G, transformOrigin: 'left center' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
