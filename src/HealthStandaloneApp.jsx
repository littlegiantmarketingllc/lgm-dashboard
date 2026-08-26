import { useState, useEffect } from 'react'
import { ClerkProvider, SignedIn, SignedOut, SignIn, useUser, useClerk } from '@clerk/clerk-react'
import { RoleContext } from './contexts/RoleContext'
import HealthDashboard from './components/health/HealthDashboard'
import LoginPage       from './components/health/LoginPage'

// Clerk activates automatically when this env var is set in Vercel project settings.
// Without it the app falls back to the existing password+cookie auth — no regression.
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const COOKIE = 'lgm-health-auth'
function getSessionCookie() {
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(COOKIE + '='))
    ?.slice(COOKIE.length + 1) || null
}

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
          Customer Health
        </p>
      </div>
      <p className="sm:hidden text-brand-heading font-semibold text-[13px] whitespace-nowrap">
        Customer Health
      </p>
    </div>
  )
}

// ─── Shared dashboard shell (header + footer + HealthDashboard) ───────────────
function DashboardShell({ onSignOut }) {
  const [healthFilters, setHealthFilters] = useState({
    search: '', typeFilter: 'all', bandFilter: 'all', billingFilter: 'all',
    dateRange: { type: 'all', from: '', to: '' },
  })
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <header className="sticky top-0 z-50 bg-white border-b border-brand-border"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderTop: '3px solid #8CC63F' }}>
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between">
          <LogoMark />
          <button
            onClick={onSignOut}
            className="text-[11px] text-brand-muted hover:text-brand-heading transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-bg border border-transparent hover:border-brand-border"
          >
            Sign out
          </button>
        </div>
      </header>
      <HealthDashboard filters={healthFilters} setFilters={setHealthFilters} />
      <footer className="mt-12 py-5 border-t border-brand-border text-center text-[11px] text-brand-muted/60 tracking-widest uppercase">
        Little Giant Marketing &mdash; Customer Health Dashboard
      </footer>
    </div>
  )
}

// ─── Reads role from Clerk publicMetadata — must be inside <ClerkProvider> ────
function ClerkRoleProvider({ children }) {
  const { user, isLoaded } = useUser()
  const role = !isLoaded ? 'account_manager'
             : (user?.publicMetadata?.role || 'account_manager')
  return (
    <RoleContext.Provider value={{ role, isAdmin: role === 'admin', isLoaded }}>
      {children}
    </RoleContext.Provider>
  )
}

// ─── Clerk sign-in page styling ───────────────────────────────────────────────
const clerkAppearance = {
  elements: {
    rootBox: 'w-full',
    card: 'shadow-none border border-brand-border rounded-2xl bg-white',
    headerTitle: 'text-brand-heading font-bold',
    headerSubtitle: 'text-brand-muted',
    formButtonPrimary: 'bg-[#8CC63F] hover:bg-[#7ab535] text-white',
    footerActionLink: 'text-[#8CC63F] hover:text-[#7ab535]',
  },
}

// ─── Clerk-powered auth + role gating ────────────────────────────────────────
function ClerkAuthApp() {
  const { signOut } = useClerk()
  return (
    <ClerkRoleProvider>
      <SignedOut>
        <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg p-4">
          <div className="mb-8 flex justify-center">
            <LogoMark />
          </div>
          <div className="w-full max-w-sm">
            <SignIn routing="hash" afterSignInUrl="/" appearance={clerkAppearance} />
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <DashboardShell onSignOut={() => signOut({ redirectUrl: '/' })} />
      </SignedIn>
    </ClerkRoleProvider>
  )
}

// ─── Legacy password+cookie auth (used when Clerk is not configured) ──────────
function LegacyAuthApp() {
  const params      = new URLSearchParams(window.location.search)
  const loginForced = params.get('login') === '1'
  const hasCookie   = !!getSessionCookie()
  const [authed, setAuthed] = useState(!loginForced && hasCookie)

  function handleLoginSuccess() {
    setAuthed(true)
    const url = new URL(window.location.href)
    url.searchParams.delete('login')
    window.history.replaceState({}, '', url.toString())
  }

  if (!authed) return <LoginPage onSuccess={handleLoginSuccess} />

  // Legacy users always get admin — existing behavior unchanged
  return (
    <RoleContext.Provider value={{ role: 'admin', isAdmin: true, isLoaded: true }}>
      <DashboardShell onSignOut={() => { window.location.href = '/api/auth?logout=1' }} />
    </RoleContext.Provider>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function HealthStandaloneApp() {
  useEffect(() => { document.title = 'LGM — Customer Health Dashboard' }, [])

  if (CLERK_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_KEY}>
        <ClerkAuthApp />
      </ClerkProvider>
    )
  }

  return <LegacyAuthApp />
}
