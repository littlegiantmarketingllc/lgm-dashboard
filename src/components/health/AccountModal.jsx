import { useEffect, useState, useCallback } from 'react'
import { differenceInDays, parseISO, isValid, format } from 'date-fns'
import { recommendAction } from '../../lib/healthEngine'
import GHLInfoPanel from './GHLInfoPanel'
import InfoTip from './InfoTip'

const NOISE = /\b(agency|llc|inc|corp|insurance|marketing|services|group|associates|co\.?|ltd|the)\b/gi
function buildGHLQuery(name) {
  return name.replace(NOISE, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 2).join(' ')
}

const G   = '#8CC63F'
const AMB = '#EAB308'
const RED = '#EF4444'

function bandColor(band) {
  if (band === 'healthy') return G
  if (band === 'watch')   return AMB
  return RED
}
function bandLabel(band) {
  if (band === 'healthy') return 'Active'
  if (band === 'watch')   return 'Slowing'
  return 'Stale'
}

function SubScoreBar({ label, score }) {
  const pct   = Math.round(score ?? 0)
  const color = pct >= 70 ? G : pct >= 40 ? AMB : RED
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-brand-muted">{label}</span>
        <span className="num font-bold" style={{ color }}>{pct}</span>
      </div>
      <div className="h-1.5 rounded-full bg-brand-border overflow-hidden">
        <div className="h-full rounded-full score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function AccountModal({ account, onClose }) {
  const [ghlData,    setGhlData]    = useState(null)
  const [ghlLoading, setGhlLoading] = useState(false)
  const [ghlError,   setGhlError]   = useState(null)

  const [liveMetrics,        setLiveMetrics]        = useState(null)
  const [liveMetricsLoading, setLiveMetricsLoading] = useState(true)
  const [liveMetricsError,   setLiveMetricsError]   = useState(null)

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

  // Auto-fetch per-location metrics (users, contacts, opportunities) via OAuth KV
  useEffect(() => {
    if (!account.ghlId) { setLiveMetricsLoading(false); return }
    setLiveMetricsLoading(true)
    setLiveMetricsError(null)
    fetch(`/api/ghl-location-data?locationId=${encodeURIComponent(account.ghlId)}`)
      .then(r => r.json())
      .then(data => { setLiveMetrics(data); setLiveMetricsLoading(false) })
      .catch(err => { setLiveMetricsError(err.message); setLiveMetricsLoading(false) })
  }, [account.ghlId])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!account) return null

  const { score, parts, band } = account._health || { score: 0, parts: {}, band: 'at_risk' }
  const color  = bandColor(band)
  const action = recommendAction(account)

  const dateAdded = account.ghlDateAdded
  let tenureDays = null, joinFormatted = null
  if (dateAdded) {
    try {
      const d = parseISO(dateAdded)
      if (isValid(d)) {
        tenureDays    = differenceInDays(new Date(), d)
        joinFormatted = format(d, 'MMM d, yyyy')
      }
    } catch {}
  }

  const initials = account.accountName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const days     = account.ghlDaysSinceUpdate
  const actColor = days <= 7 ? G : days <= 30 ? AMB : RED

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.20)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
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
                {days !== null && days !== undefined && (
                  <span className="text-[11px] text-brand-muted">
                    Last activity: <span className="font-semibold" style={{ color: actColor }}>
                      {days === 0 ? 'today' : `${days}d ago`}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors text-base flex-shrink-0">
            ✕
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-5">

          {/* Health score */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-bg rounded-xl p-3 border border-brand-border text-center relative">
              <div className="absolute top-2 right-2">
                <InfoTip text="Composite health: 50% how long they've been in GHL (tenure) + 50% how recently their account was updated (activity). Active = 70+, Slowing = 40–69, Stale < 40." position="top-end" />
              </div>
              <p className="num text-base font-bold" style={{ color }}>{score}/100</p>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">Health Score</p>
            </div>
            <div className="bg-brand-bg rounded-xl p-3 border border-brand-border text-center">
              <p className="num text-base font-bold text-brand-text">
                {tenureDays !== null ? `${tenureDays}d` : '—'}
              </p>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">Tenure in GHL</p>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="rounded-xl border border-brand-border p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-1">Score Breakdown</p>
            <SubScoreBar label="Tenure (how long in GHL) — 50%" score={parts.tenure} />
            <SubScoreBar label="Activity (days since last update) — 50%" score={parts.activity} />
            <div className="mt-3 pt-3 border-t border-brand-border">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-brand-muted font-semibold">Composite</span>
                <span className="num font-bold text-[14px]" style={{ color }}>{score}/100</span>
              </div>
              <div className="h-2 rounded-full bg-brand-border overflow-hidden">
                <div className="h-full rounded-full score-bar-fill" style={{ width: `${score}%`, background: color }} />
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="rounded-xl border px-4 py-3" style={{
            borderColor: `${color}30`, background: `${color}08`
          }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color }}>Recommended Action</p>
            <p className="text-[12px]" style={{ color: band === 'at_risk' ? RED : band === 'watch' ? AMB : '#3a6b10' }}>
              {action}
            </p>
          </div>

          {/* GHL location details */}
          <div className="rounded-xl border border-brand-border p-4 grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Joined GHL</p>
              <p className="font-medium text-brand-text mt-0.5">{joinFormatted || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Last Updated</p>
              <p className="num font-medium mt-0.5" style={{ color: actColor }}>
                {days !== null && days !== undefined ? (days === 0 ? 'Today' : `${days} days ago`) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Email</p>
              <p className="font-medium text-brand-text mt-0.5 truncate">{account.ghlEmail || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Phone</p>
              <p className="font-medium text-brand-text mt-0.5">{account.ghlPhone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Location</p>
              <p className="font-medium text-brand-text mt-0.5">
                {[account.ghlCity, account.ghlState].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Timezone</p>
              <p className="font-medium text-brand-text mt-0.5">{account.ghlTimezone || '—'}</p>
            </div>
            {account.ghlWebsite && (
              <div className="col-span-2">
                <p className="text-[10px] text-brand-muted uppercase tracking-wider">Website</p>
                <a href={account.ghlWebsite} target="_blank" rel="noopener noreferrer"
                  className="font-medium text-brand-text mt-0.5 hover:underline truncate block"
                  style={{ color: G }}>
                  {account.ghlWebsite}
                </a>
              </div>
            )}
          </div>

          {/* Live Metrics — users, contacts, opportunities via OAuth KV */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">Live Account Metrics</p>
            {liveMetricsLoading ? (
              <div className="rounded-xl border border-brand-border p-4 flex items-center gap-2 text-[11px] text-brand-muted">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-border border-t-brand-green animate-spin flex-shrink-0" />
                Fetching live data from GHL…
              </div>
            ) : liveMetricsError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
                Could not load live metrics: {liveMetricsError}
              </div>
            ) : liveMetrics && !liveMetrics.oauthConnected ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-700">
                OAuth token not yet available for this location. Once the marketplace app is installed for this account, metrics will appear here automatically.
              </div>
            ) : liveMetrics ? (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Team Members', value: liveMetrics.users,         icon: '👤' },
                  { label: 'Contacts',     value: liveMetrics.contacts,      icon: '📋' },
                  { label: 'Opportunities',value: liveMetrics.opportunities,  icon: '🎯' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-brand-bg rounded-xl border border-brand-border p-3 text-center">
                    <div className="text-base mb-0.5">{icon}</div>
                    <p className="num text-sm font-bold text-brand-text">
                      {value === null ? '—' : value.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-brand-muted mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Live GHL CRM */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">CRM Contact Lookup</p>
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
