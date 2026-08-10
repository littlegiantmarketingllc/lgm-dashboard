import { useState, useEffect, useCallback, useRef } from 'react'
import { useGHLAccounts } from './useGHLAccounts'

const STRIPE_REFRESH_MS = 300_000 // 5 min — match GHL cadence

function useStripeBilling() {
  const [byEmail,  setByEmail]  = useState({})
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [syncedAt, setSyncedAt] = useState(null)
  const timerRef = useRef(null)

  const doFetch = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe-billing')
      if (!res.ok) throw new Error(`Stripe billing API returned HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setByEmail(data.byEmail || {})
      setSyncedAt(data.syncedAt ? new Date(data.syncedAt) : new Date())
      setError(null)
    } catch (err) {
      console.warn('[useStripeBilling] fetch failed:', err.message)
      setError(err.message)
      // Keep stale data if we already had some
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    doFetch()
    timerRef.current = setInterval(doFetch, STRIPE_REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [doFetch])

  return { byEmail, loading, error, syncedAt }
}

export function useMergedHealthData() {
  const ghl    = useGHLAccounts()
  const stripe = useStripeBilling()

  const accounts = (ghl.accounts || []).map(g => {
    // Join by email — normalize both sides to lowercase
    const email   = (g.ghlEmail || '').toLowerCase().trim()
    const billing = stripe.byEmail[email] || null

    return {
      // ── Identity ──────────────────────────────────────────
      id:               g.ghlId,
      accountName:      g.ghlName,
      locationId:       g.ghlId,
      ghlId:            g.ghlId,

      // ── GHL fields ────────────────────────────────────────
      ghlEmail:         g.ghlEmail,
      ghlPhone:         g.ghlPhone,
      ghlCity:          g.ghlCity,
      ghlState:         g.ghlState,
      ghlCountry:       g.ghlCountry,
      ghlWebsite:       g.ghlWebsite,
      ghlTimezone:      g.ghlTimezone,
      ghlDateAdded:     g.ghlDateAdded,
      ghlDateUpdated:   g.ghlDateUpdated,
      ghlDaysSinceUpdate: g.ghlDaysSinceUpdate,
      ghlPermissions:   g.ghlPermissions,
      ghlSnapshotId:    g.ghlSnapshotId,

      // ── Health scoring inputs ──────────────────────────────
      // Prefer Stripe start date (actual payment start) over GHL create date
      stripeStartDate:  billing?.stripeStartDate || g.ghlDateAdded,
      lastActivity:     g.ghlDaysSinceUpdate,

      // ── Stripe / billing fields ───────────────────────────
      stripeCustomerId:     billing?.stripeCustomerId     || null,
      stripeCustomerName:   billing?.stripeCustomerName   || null,
      stripeStatus:         billing?.stripeStatus         || null,
      stripeSubscriptionId: billing?.stripeSubscriptionId || null,
      planNickname:         billing?.planNickname         || null,
      planInterval:         billing?.planInterval         || null,

      // ── Monetary fields (all in $/month) ──────────────────
      totalRev:        billing?.totalRev        ?? 0,
      planPrice:       billing?.planPrice       ?? 0,
      monthlyUserSub:  billing?.monthlyUserSub  ?? 0,
      addOns:          billing?.addOns          ?? 0,
      lcWalletCharges: billing?.lcWalletCharges ?? 0, // pending: GHL Payments API
      annualSubs:      billing?.planInterval === 'year'
        ? Math.round((billing?.planPrice ?? 0) * 12 * 100) / 100
        : 0,

      // ── Non-monetary billing fields ───────────────────────
      users:        billing?.users        ?? 0,
      transactions: billing?.transactions ?? 0, // pending: Cliff's DataHealthStatus
      gp:           billing?.gp           ?? 0, // pending: cost data
      multiLocation: false,
      accountType:  billing?.accountType  || (billing ? 'Agent' : 'Unknown'),

      // Internal flag — true when Stripe data was matched
      _stripeBound: !!billing,
    }
  })

  const matched   = accounts.filter(a => a._stripeBound).length
  const unmatched = accounts.length - matched

  const dataSourceStatus = {
    ghlTotal:    ghl.accounts.length,
    stripeTotal: Object.keys(stripe.byEmail).length,
    matched,
    unmatched,
    ghlSyncedAt:    ghl.syncedAt,
    stripeSyncedAt: stripe.syncedAt,
  }

  return {
    accounts,
    loading:      ghl.loading,   // show spinner only for GHL (primary source)
    stripeLoading: stripe.loading,
    ghlLoading:   ghl.loading,
    error:        ghl.error,
    ghlError:     ghl.error,
    stripeError:  stripe.error,
    lastUpdated:  ghl.syncedAt,
    refetch:      ghl.refetch,
    retrying:     false,
    dataSourceStatus,
  }
}
