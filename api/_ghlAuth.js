// Shared per-location GHL OAuth token helper.
// Same logic as api/ghl-location-data.js and api/token.js — extracted here so
// new API routes (starting with master-leads.js) don't duplicate it a third time.
// Tokens live in the ghl_tokens Supabase table via the kv wrapper in ./_supabase.js.

import { kv } from './_supabase.js'

export const GHL_BASE   = 'https://services.leadconnectorhq.com'
export const GHL_VER    = '2021-07-28'
const COMPANY_ID = 'MKJeZKBhrN9uLt4ZWZCa'

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
        return { ok: false, reason: `Company token expired and refresh failed — ${refreshed.reason}` }
      }
      await kv.set(`ghl:company_token:${COMPANY_ID}`, refreshed.value)
      company = refreshed.value
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

export async function ghlFetch(path, token, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, Version: GHL_VER, 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${GHL_BASE}${path}`, opts)
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, ok: res.ok, json, text: res.ok ? null : text.slice(0, 300) }
}
