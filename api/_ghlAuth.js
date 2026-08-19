// Shared per-location GHL OAuth token helper.
// Same logic as api/ghl-location-data.js and api/token.js — extracted here so
// new API routes (starting with master-leads.js) don't duplicate it a third time.
// Tokens live in the ghl_tokens Supabase table via the kv wrapper in ./_supabase.js.

import { kv } from './_supabase.js'

export const GHL_BASE   = 'https://services.leadconnectorhq.com'
export const GHL_VER    = '2021-07-28'
const COMPANY_ID = 'MKJeZKBhrN9uLt4ZWZCa'

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
    const tokens = await res.json()
    if (!res.ok || !tokens.access_token) return null
    return {
      ...tokenData,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token || tokenData.refreshToken,
      expiresAt:    Date.now() + (tokens.expires_in * 1000),
    }
  } catch {
    return null
  }
}

async function fetchLocationTokenFromCompany(locationId) {
  try {
    let company = await kv.get(`ghl:company_token:${COMPANY_ID}`)
    if (!company?.accessToken) return null

    if (Date.now() > company.expiresAt - 30 * 60 * 1000) {
      const refreshed = await refreshToken(company)
      if (refreshed) {
        await kv.set(`ghl:company_token:${COMPANY_ID}`, refreshed)
        company = refreshed
      }
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
    const loc = await res.json()
    if (!loc?.access_token) return null

    const data = {
      accessToken:  loc.access_token,
      refreshToken: loc.refresh_token || company.refreshToken,
      expiresAt:    Date.now() + ((loc.expires_in || 86400) * 1000),
      locationId,
      companyId:    COMPANY_ID,
      tokenType:    'Location',
    }
    await kv.set(`ghl:token:${locationId}`, data)
    return data
  } catch {
    return null
  }
}

// Returns a valid access token string for the given locationId, refreshing
// or re-deriving from the agency company token as needed.
export async function getLocationAccessToken(locationId) {
  try {
    let data = await kv.get(`ghl:token:${locationId}`)

    if (!data) {
      const fresh = await fetchLocationTokenFromCompany(locationId)
      return fresh?.accessToken || null
    }

    if (Date.now() > data.expiresAt - 10 * 60 * 1000) {
      const refreshed = await refreshToken(data)
      if (refreshed) {
        await kv.set(`ghl:token:${locationId}`, refreshed)
        return refreshed.accessToken
      }
      const fresh = await fetchLocationTokenFromCompany(locationId)
      if (fresh) return fresh.accessToken
      if (data.expiresAt && Date.now() < data.expiresAt + 60 * 60 * 1000) {
        return data.accessToken
      }
      return null
    }

    return data.accessToken
  } catch {
    return null
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
