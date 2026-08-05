import { useEffect, useState, useCallback } from 'react'
import { differenceInDays, parseISO, isValid, format } from 'date-fns'
import { isAtRisk, isUpsellReady, suggestAddon, recommendAction } from '../../lib/healthEngine'
import GHLInfoPanel from './GHLInfoPanel'
import InfoTip from './InfoTip'

// Strip noise words before searching GHL so "Pontes Agency LLC" → "Pontes"
const NOISE = /\b(agency|llc|inc|corp|insurance|marketing|services|group|associates|co\.?|ltd|the)\b/gi
function buildGHLQuery(name) {
  return name.replace(NOISE, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 2).join(' ')
}

const G   = '#8CC63F'
const AMB = '#EAB308'
const RED = '#EF4444'

function fmt(n)   { return '$' + Math.round(n).toLocaleString() }
function fmtGP(n) { return n ? `${(n * 100).toFixed(0)}%` : '—' }

function bandColor(band) {
  if (band === 'healthy') return G
  if (band === 'watch')   return AMB
  return RED
}

function bandLabel(band) {
  if (band === 'healthy') return 'Healthy'
  if (band === 'watch')   return 'Watch'
  return 'At-Risk'
}

function SubScoreBar({ label, score, weight }) {
  const pct  = Math.round(score ?? 0)
  const color = pct >= 80 ? G : pct >= 50 ? AMB : RED
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-brand-muted">{label} <span className="text-brand-border">({(weight * 100).toFixed(0)}%)</span></span>
        <span className="num font-bold" style={{ color }}>{pct}</span>
      </div>
      <div className="h-1.5 rounded-full bg-brand-border overflow-hidden">
        <div className="h-full rounded-full score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function StatBlock({ label, value }) {
  return (
    <div className="bg-brand-bg rounded-xl p-3 border border-brand-border text-center">
      <p className="num text-base font-bold text-brand-text">{value}</p>
      <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}

export default function AccountModal({ account, onClose }) {
  const [ghlData,    setGhlData]    = useState(null)
  const [ghlLoading, setGhlLoading] = useState(false)
  const [ghlError,   setGhlError]   = useState(null)

  const fetchGHLInfo = useCallback(async () => {
    if (ghlLoading) return
    setGhlLoading(true)
    setGhlError(null)
    try {
      const q = buildGHLQuery(account.accountName)
      const res = await fetch(`/api/ghl-contact?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGhlData(data)
    } catch (err) {
      setGhlError(err.message)
    } finally {
      setGhlLoading(false)
    }
  }, [account.accountName, ghlLoading])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!account) return null

  const { score, parts, band } = account._health || { score: 0, parts: {}, band: 'at_risk' }
  const color   = bandColor(band)
  const atRisk  = isAtRisk(account)
  const upsell  = isUpsellReady(account)
  const action  = recommendAction(account)
  const addon   = upsell ? suggestAddon(account) : null

  let tenureDays = null
  let startFormatted = null
  if (account.stripeStartDate) {
    try {
      const d = parseISO(account.stripeStartDate)
      if (isValid(d)) {
        tenureDays = differenceInDays(new Date(), d)
        startFormatted = format(d, 'MMM d, yyyy')
      }
    } catch {}
  }

  const initials = account.accountName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.20)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-brand-border px-5 sm:px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: color }}>{initials}</div>
            <div className="min-w-0">
              <h2 className="text-brand-heading font-bold text-base truncate">{account.accountName}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ color, background: `${color}12`, borderColor: `${color}30` }}>
                  {bandLabel(band)}
                </span>
                <span className="text-[11px] text-brand-muted">{account.accountType}</span>
                {atRisk  && <span className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">⚠ At-Risk</span>}
                {upsell  && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border" style={{ color: G, background: `${G}10`, borderColor: `${G}28` }}>📈 Upsell Ready</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors text-base flex-shrink-0">
            ✕
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-5">

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-brand-bg rounded-xl p-3 border border-brand-border text-center relative">
              <div className="absolute top-2 right-2">
                <InfoTip text="Composite health score 0–100. Weighted: DataHealthStatus 40%, Users 20%, Revenue 15%, Tenure 15%, Login Activity 10%. Healthy = 80+, Watch = 50–79, At-Risk < 50." position="top-end" />
              </div>
              <p className="num text-base font-bold" style={{ color }}>{score}/100</p>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">Health Score</p>
            </div>
            <div className="bg-brand-bg rounded-xl p-3 border border-brand-border text-center relative">
              <div className="absolute top-2 right-2">
                <InfoTip text="DataHealthStatus score × 1000. Reported by GHL — reflects how actively the client is using LC platform features (AI, SMS, calls, etc.). Below 3,500 = at-risk threshold. 'All Good!' = 5,000." position="top-end" />
              </div>
              <p className="num text-base font-bold text-brand-text">{account.transactions.toLocaleString()}</p>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">Transactions</p>
            </div>
            <div className="bg-brand-bg rounded-xl p-3 border border-brand-border text-center relative">
              <div className="absolute top-2 right-2">
                <InfoTip text="GHL Adjusted User Count — the number of active user seats on this sub-account as reported by GoHighLevel. Clients pay a per-user monthly fee above the included seat count." position="top-end" />
              </div>
              <p className="num text-base font-bold text-brand-text">{account.users}</p>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">Users</p>
            </div>
            <div className="bg-brand-bg rounded-xl p-3 border border-brand-border text-center relative">
              <div className="absolute top-2 right-2">
                <InfoTip text="Total Monthly Charges — sum of Plan Price + User Seat Fees + Add-ons + LC Platform Usage + Annual Subs. This is the gross revenue LGM earns from this client per month." position="top-end" />
              </div>
              <p className="num text-base font-bold text-brand-text">{fmt(account.totalRev)}</p>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">Total Rev</p>
            </div>
          </div>

          {/* Health score breakdown */}
          <div className="rounded-xl border border-brand-border p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">Health Score Components</p>
              <InfoTip text="Each component is scored 0–100 then weighted. If Login Activity data is missing, its 10% weight is redistributed proportionally to the other four components." position="top-end" />
            </div>
            <div className="space-y-3">
              <SubScoreBar label="Transaction Volume (DataHealthStatus)" score={parts.txn}      weight={0.40} />
              <SubScoreBar label="User Adoption (GHL Adj. Users)"        score={parts.users}    weight={0.20} />
              <SubScoreBar label="Revenue Level (vs. portfolio max)"      score={parts.rev}      weight={0.15} />
              <SubScoreBar label="Account Tenure (days since start)"      score={parts.tenure}   weight={0.15} />
              {parts.activity !== null && (
                <SubScoreBar label="Login Activity"                       score={parts.activity} weight={0.10} />
              )}
            </div>
            {/* Composite bar */}
            <div className="mt-4 pt-3 border-t border-brand-border">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-brand-muted font-semibold">Composite Health Score</span>
                <span className="num font-bold text-[14px]" style={{ color }}>{score}/100</span>
              </div>
              <div className="h-2 rounded-full bg-brand-border overflow-hidden">
                <div className="h-full rounded-full score-bar-fill" style={{ width: `${score}%`, background: color }} />
              </div>
            </div>
          </div>

          {/* Billing breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">Billing Breakdown</p>
              <InfoTip text="All billing fields come from the LGM billing sheet (Google Sheets). They reflect the most recent data export — not real-time Stripe figures." position="top-start" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: 'Plan Price',       value: fmt(account.planPrice),                                      tip: 'Base monthly SaaS subscription fee for this client\'s GHL plan.' },
                { label: 'Monthly User Sub', value: fmt(account.monthlyUserSub),                                 tip: 'Monthly per-user charges for seats above the included plan limit.' },
                { label: 'Add-ons',          value: account.addOns ? fmt(account.addOns) : '—',                  tip: 'Custom add-on products billed monthly on top of the base plan.' },
                { label: 'LC Wallet',        value: account.lcWalletCharges ? fmt(account.lcWalletCharges) : '—', tip: 'LC Agent / platform usage charges — AI, SMS, calls, email, and other GHL-native features consumed by this sub-account.' },
                { label: 'Annual Subs',      value: account.annualSubs ? fmt(account.annualSubs) : '—',           tip: 'Annual subscription charges for this account, if applicable.' },
                { label: 'Gross Profit',     value: fmtGP(account.gp),                                           tip: 'Agency Gross Profit — the margin LGM earns after platform costs. Pulled from the "Agency Gross Profit" column in the billing sheet.' },
              ].map(({ label, value, tip }) => (
                <div key={label} className="rounded-lg bg-brand-bg border border-brand-border px-3 py-2.5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-[10px] text-brand-muted uppercase tracking-wider">{label}</p>
                    <InfoTip text={tip} position="top-end" />
                  </div>
                  <p className="num text-[13px] font-semibold text-brand-text">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Account details */}
          <div className="rounded-xl border border-brand-border p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Start Date</p>
              <p className="font-medium text-brand-text mt-0.5">{startFormatted || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Tenure</p>
              <p className="num font-medium text-brand-text mt-0.5">{tenureDays !== null ? `${tenureDays}d` : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Multi-Location</p>
              <p className="font-medium text-brand-text mt-0.5">{account.multiLocation ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Sub-Acnt Count</p>
              <p className="num font-medium text-brand-text mt-0.5">{account.subAcntCount.toLocaleString()}</p>
            </div>
          </div>

          {/* Rules triggered */}
          <div className="space-y-2.5">
            {atRisk && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">⚠ At-Risk Rule Triggered</p>
                <p className="text-[12px] text-red-700">{account.transactions < 3500
                  ? `Transactions (${account.transactions.toLocaleString()}) below 3,500 threshold`
                  : `Health score (${score}) below 50 watch threshold`}
                </p>
                <p className="text-[11px] text-red-600 mt-1.5 font-semibold">Recommended: {action}</p>
              </div>
            )}
            {upsell && addon && (
              <div className="rounded-xl border px-4 py-3" style={{ borderColor: `${G}30`, background: `${G}08` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: G }}>📈 Upsell Rule Triggered</p>
                <p className="text-[12px]" style={{ color: '#3a6b10' }}>
                  {account.transactions.toLocaleString()} txns &gt; 3,500 AND {account.users} users &gt; 3
                </p>
                <p className="text-[11px] mt-1.5 font-semibold" style={{ color: G }}>
                  Suggested: {addon.label} — +${addon.estExtra}/mo
                </p>
              </div>
            )}
          </div>

          {/* GHL CRM on-demand lookup */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">Live GHL CRM Data</p>
            <GHLInfoPanel
              data={ghlData}
              loading={ghlLoading}
              error={ghlError}
              onFetch={fetchGHLInfo}
            />
          </div>

        </div>
      </div>
    </div>
  )
}
