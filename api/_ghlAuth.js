// Shared per-location GHL OAuth token helper.
// Same logic as api/ghl-location-data.js and api/token.js — extracted here so
// new API routes (starting with master-leads.js) don't duplicate it a third time.
// Tokens live in the ghl_tokens Supabase table via the kv wrapper in ./_supabase.js.

import { kv } from './_supabase.js'

export const GHL_BASE   = 'https://services.leadconnectorhq.com'
export const GHL_VER    = '2021-07-28'
const COMPANY_ID = 'MKJeZKBhrN9uLt4ZWZCa'

// Cheap breadcrumb so a dead token is visible without digging through Vercel
// logs — the dashboard UI reads this to show a "reconnect needed" banner
// instead of silently failing until someone notices. Written on every
// company-token refresh attempt (cron and reactive), not on the more
// frequent per-location calls.
// Tokens are shared across Vercel projects via one Supabase table, but each
// project refreshes using ITS OWN env vars. When those drift apart, GHL
// rejects every refresh with "Invalid client credentials" and the token dies
// at its 24h mark with no way to renew — which is exactly what happened
// undetected for weeks. Recording which credentials issued a token lets the
// refresher detect the mismatch itself instead of failing mysteriously.
//
// The client ID is stored as-is (it is not a secret). The secret is stored
// only as a truncated SHA-256 fingerprint — enough to detect that it changed,
// impossible to recover the value from.
import { createHash } from 'node:crypto'

export function credentialIdentity() {
  const clientId = process.env.GHL_CLIENT_ID || ''
  const secret   = process.env.GHL_CLIENT_SECRET || ''
  return {
    clientId,
    secretFp: secret ? createHash('sha256').update(secret).digest('hex').slice(0, 12) : null,
  }
}

// Returns a human-readable explanation if this deployment's credentials are
// not the ones that issued the stored token, else null. Tokens issued before
// this tracking existed have no issuedBy — treated as unknown, not as drift.
export function credentialDrift(tokenData) {
  const issuedBy = tokenData?.issuedBy
  if (!issuedBy?.clientId) return null

  const mine = credentialIdentity()
  if (mine.clientId && issuedBy.clientId !== mine.clientId) {
    return `GHL_CLIENT_ID on this deployment (…${mine.clientId.slice(-6)}) is not the one that issued this token (…${issuedBy.clientId.slice(-6)}). Refresh will be rejected until they match.`
  }
  if (issuedBy.secretFp && mine.secretFp && issuedBy.secretFp !== mine.secretFp) {
    return `GHL_CLIENT_SECRET on this deployment does not match the one that issued this token (fingerprint ${mine.secretFp} vs ${issuedBy.secretFp}). Refresh will be rejected until they match.`
  }
  return null
}

const STATUS_KEY = 'ghl:token_status'
export async function setTokenStatus(ok, reason = null) {
  try {
    await kv.set(STATUS_KEY, { ok, reason, at: new Date().toISOString() })
  } catch { /* status tracking must never break the actual token flow */ }
}
export async function getTokenStatus() {
  return (await kv.get(STATUS_KEY)) || null
}

// Each step below returns { ok, value, reason } instead of swallowing errors into
// null — a silent null here used to collapse every possible failure (bad creds,
// dead refresh token, app not installed on the location, network error) into the
// same generic "no token found" response, which made this impossible to debug
// from the outside. reason is surfaced up to the API response in master-leads.js.

async function refreshToken(tokenData) {
  try {
    const res = await fetch(`${GHL_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        grant_type:    'refresh_token',
        refresh_token: tokenData.refreshToken,
      }),
    })
    const tokens = await res.json().catch(() => ({}))
    if (!res.ok || !tokens.access_token) {
      return { ok: false, reason: `refresh_token grant failed: HTTP ${res.status} ${JSON.stringify(tokens).slice(0, 200)}` }
    }
    return {
      ok: true,
      value: {
        ...tokenData,
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token || tokenData.refreshToken,
        expiresAt:    Date.now() + (tokens.expires_in * 1000),
      },
    }
  } catch (err) {
    return { ok: false, reason: `refresh_token grant threw: ${err.message}` }
  }
}

async function fetchLocationTokenFromCompany(locationId) {
  try {
    let company = await kv.get(`ghl:company_token:${COMPANY_ID}`)
    if (!company?.accessToken) {
      return { ok: false, reason: 'No company token cached in ghl_tokens table at all.' }
    }

    if (Date.now() > company.expiresAt - 30 * 60 * 1000) {
      const refreshed = await refreshToken(company)
      if (!refreshed.ok) {
        await setTokenStatus(false, refreshed.reason)
        return { ok: false, reason: `Company token expired and refresh failed — ${refreshed.reason}` }
      }
      await kv.set(`ghl:company_token:${COMPANY_ID}`, refreshed.value)
      company = refreshed.value
      await setTokenStatus(true)
    }

    const res = await fetch(`${GHL_BASE}/oauth/locationToken`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${company.accessToken}`,
        Version:        GHL_VER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyId: COMPANY_ID, locationId }),
    })
    const loc = await res.json().catch(() => ({}))
    if (!loc?.access_token) {
      return { ok: false, reason: `/oauth/locationToken failed: HTTP ${res.status} ${JSON.stringify(loc).slice(0, 200)}` }
    }

    const data = {
      accessToken:  loc.access_token,
      refreshToken: loc.refresh_token || company.refreshToken,
      expiresAt:    Date.now() + ((loc.expires_in || 86400) * 1000),
      locationId,
      companyId:    COMPANY_ID,
      tokenType:    'Location',
    }
    await kv.set(`ghl:token:${locationId}`, data)
    return { ok: true, value: data }
  } catch (err) {
    return { ok: false, reason: `fetchLocationTokenFromCompany threw: ${err.message}` }
  }
}

// Returns { token, reason } — token is null and reason explains why on failure.
export async function getLocationAccessToken(locationId) {
  try {
    let data = await kv.get(`ghl:token:${locationId}`)

    if (!data) {
      const fresh = await fetchLocationTokenFromCompany(locationId)
      return fresh.ok ? { token: fresh.value.accessToken, reason: null } : { token: null, reason: fresh.reason }
    }

    if (Date.now() > data.expiresAt - 10 * 60 * 1000) {
      const refreshed = await refreshToken(data)
      if (refreshed.ok) {
        await kv.set(`ghl:token:${locationId}`, refreshed.value)
        return { token: refreshed.value.accessToken, reason: null }
      }
      const fresh = await fetchLocationTokenFromCompany(locationId)
      if (fresh.ok) return { token: fresh.value.accessToken, reason: null }
      if (data.expiresAt && Date.now() < data.expiresAt + 60 * 60 * 1000) {
        return { token: data.accessToken, reason: null } // stale but within grace window
      }
      return { token: null, reason: `Location token expired, refresh failed (${refreshed.reason}), and company-token fallback failed (${fresh.reason})` }
    }

    return { token: data.accessToken, reason: null }
  } catch (err) {
    return { token: null, reason: `getLocationAccessToken threw: ${err.message}` }
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// version override exists because a handful of newer GHL endpoints (e.g.
// /opportunities/pipelines) require a different Version header than the
// 2021-07-28 used everywhere else — defaulting keeps every existing call site
// unaffected.
export async function ghlFetch(path, token, method = 'GET', body = null, retriesLeft = 3, version = GHL_VER) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, Version: version, 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${GHL_BASE}${path}`, opts)

  // GHL rate limits (429) on deep pagination loops — back off and retry rather
  // than failing the whole request over one transient limit.
  if (res.status === 429 && retriesLeft > 0) {
    const retryAfterHeader = res.headers.get('retry-after')
    const waitMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : (4 - retriesLeft) * 1000
    await sleep(waitMs)
    return ghlFetch(path, token, method, body, retriesLeft - 1, version)
  }

  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, ok: res.ok, json, text: res.ok ? null : text.slice(0, 300) }
}
