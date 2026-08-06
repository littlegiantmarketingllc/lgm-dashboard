// Per-location GHL data via OAuth tokens stored in Vercel KV.
// Returns user count, contact total, and open opportunity count for one sub-account.
// Tokens are written by the goals-dashboard marketplace OAuth flow and shared via the
// same Upstash KV store (both projects connected to the same store in Vercel Storage).

import { kv } from '@vercel/kv'

const GHL_BASE   = 'https://services.leadconnectorhq.com'
const GHL_VER    = '2021-07-28'
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

async function getOAuthToken(locationId) {
  try {
    let data = await kv.get(`ghl:token:${locationId}`)

    if (!data) {
      data = await fetchLocationTokenFromCompany(locationId)
      if (!data) return null
    }

    if (Date.now() > data.expiresAt - 10 * 60 * 1000) {
      const refreshed = await refreshToken(data)
      if (refreshed) {
        await kv.set(`ghl:token:${locationId}`, refreshed)
        data = refreshed
      }
    }

    return data.accessToken
  } catch {
    return null
  }
}

async function ghlFetch(path, token, method = 'GET', body = null) {
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

export default async function handler(req, res) {
  const { locationId } = req.query
  if (!locationId) return res.status(400).json({ error: 'Missing locationId' })

  res.setHeader('Cache-Control', 'no-store')

  const token = await getOAuthToken(locationId)
  if (!token) {
    return res.json({
      locationId,
      oauthConnected: false,
      users:         null,
      contacts:      null,
      opportunities: null,
    })
  }

  const [usersR, contactsR, oppsR] = await Promise.allSettled([
    ghlFetch(`/users/?locationId=${locationId}`, token),
    ghlFetch(`/contacts/?locationId=${locationId}&limit=1`, token),
    // opportunities/search is a POST endpoint
    ghlFetch(`/opportunities/search`, token, 'POST', { location_id: locationId, limit: 1 }),
  ])

  const users    = usersR.status    === 'fulfilled' ? usersR.value    : null
  const contacts = contactsR.status === 'fulfilled' ? contactsR.value : null
  const opps     = oppsR.status     === 'fulfilled' ? oppsR.value     : null

  // Extract counts, trying multiple known GHL response shapes
  const userCount    = users?.json?.users?.length            ?? null
  const contactCount = contacts?.json?.total ?? contacts?.json?.meta?.total ?? contacts?.json?.count ?? null
  const oppsCount    = opps?.json?.total    ?? opps?.json?.meta?.total     ?? opps?.json?.opportunities?.total ?? null

  res.json({
    locationId,
    oauthConnected: true,
    users:         userCount,
    contacts:      contactCount,
    opportunities: oppsCount,
    // Debug info — shows raw status and error bodies so we can diagnose null fields
    _debug: {
      users:         { status: users?.status,    error: users?.text    },
      contacts:      { status: contacts?.status, error: contacts?.text },
      opportunities: { status: opps?.status,     error: opps?.text     },
    },
  })
}
