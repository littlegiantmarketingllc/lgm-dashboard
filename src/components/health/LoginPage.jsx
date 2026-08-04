import { useState } from 'react'

const G = '#8CC63F'

export default function LoginPage({ onSuccess }) {
  const [password, setPassword]   = useState('')
  const [loading,  setLoading]    = useState(false)
  const [error,    setError]      = useState('')
  const [attempts, setAttempts]   = useState(0)

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading || !password.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const n = attempts + 1
        setAttempts(n)
        setError(n >= 3
          ? 'Incorrect password. Contact your administrator if you need access.'
          : 'Incorrect password. Please try again.'
        )
        setPassword('')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-4">

      {/* Top accent bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px]" style={{ background: G }} />

      <div className="w-full max-w-sm">

        {/* Logo / brand */}
        <div className="text-center mb-8">
          <img
            src="/lgm-logo.png"
            alt="Little Giant Marketing"
            className="h-12 mx-auto mb-4 object-contain"
            onError={e => { e.target.style.display = 'none' }}
          />
          <h1 className="text-brand-heading font-bold text-xl tracking-tight">Customer Health</h1>
          <p className="text-brand-muted text-[13px] mt-1">Internal dashboard — LGM team access only</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-brand-border p-7"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)' }}>

          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-5">
            Enter your access password
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Password"
                autoComplete="current-password"
                autoFocus
                className="w-full rounded-xl border border-brand-border bg-brand-bg px-4 py-3 text-[14px] text-brand-text placeholder-brand-muted/60 outline-none focus:border-[#8CC63F] focus:ring-2 transition-all"
                style={{ focusRingColor: `${G}30` }}
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full rounded-xl py-3 text-white text-[14px] font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? '#aaa' : G,
                boxShadow: loading ? 'none' : `0 2px 12px ${G}50`,
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Verifying…
                </span>
              ) : 'Sign In'}
            </button>

          </form>
        </div>

        <p className="text-center text-[11px] text-brand-muted/50 mt-6">
          Little Giant Marketing &mdash; Internal Use Only
        </p>
      </div>
    </div>
  )
}
