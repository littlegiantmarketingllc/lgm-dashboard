// Same header shell as HealthStandaloneApp.jsx's LogoMark + sticky header
// pattern (logo, green top border, brand wordmark) — deliberately duplicated
// here rather than importing from HealthStandaloneApp.jsx, so this header
// can't ever be affected by changes made for the Health dashboard's own needs
// (login state, its own title text), and vice versa.
function LogoMark() {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <img
        src="/lgm-logo.png"
        alt="Little Giant Marketing"
        className="h-8 sm:h-9 w-auto flex-shrink-0 object-contain"
        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
      />
      <div className="flex-shrink-0 items-center gap-2 hidden" aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="16" stroke="#4A4A4A" strokeWidth="6" fill="none"/>
          <path d="M29.3 12.7 A11 11 0 1 0 33 22 L23 22"
            stroke="#8CC63F" strokeWidth="4" strokeLinecap="round" fill="none"/>
        </svg>
      </div>
      <div className="hidden sm:block leading-tight min-w-0">
        <p className="shimmer-text text-[10px] font-extrabold tracking-[0.2em] uppercase leading-none">
          Little Giant Marketing
        </p>
        <p className="text-brand-heading font-semibold text-[14px] leading-tight mt-0.5 truncate">
          Master Dashboard
        </p>
      </div>
      <p className="sm:hidden text-brand-heading font-semibold text-[13px] whitespace-nowrap">
        Master Dashboard
      </p>
    </div>
  )
}

export default function MasterHeader({ isDemo }) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-brand-border"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderTop: '3px solid #8CC63F' }}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between">
        <LogoMark />
        {isDemo && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-700 uppercase tracking-wider flex-shrink-0">
            Demo Data
          </span>
        )}
      </div>
    </header>
  )
}
