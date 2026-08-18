// Secure token endpoint for n8n and internal automation workflows.
// Returns a fresh, auto-refreshed GHL OAuth access token for any sub-account.
//
// Request:  GET /api/token?locationId=<ghl_location_id>
//           Authorization: Bearer <N8N_API_SECRET>
//
// Response: { accessToken, expiresAt, locationId }
//           or { error } with 400 / 401 / 404 / 500

import { kv } from './_supabase.js'

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
  } catch { return null }
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
  } catch { return null }
}

async function getLocationToken(locationId) {
  let data = await kv.get(`ghl:token:${locationId}`)

  if (!data) {
    return await fetchLocationTokenFromCompany(locationId)
  }

  if (Date.now() > data.expiresAt - 10 * 60 * 1000) {
    const refreshed = await refreshToken(data)
    if (refreshed) {
      await kv.set(`ghl:token:${locationId}`, refreshed)
      return refreshed
    }
    const fresh = await fetchLocationTokenFromCompany(locationId)
    if (fresh) return fresh
    if (Date.now() < data.expiresAt + 60 * 60 * 1000) return data
    return null
  }

  return data
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.N8N_API_SECRET
  if (!secret) return res.status(500).json({ error: 'N8N_API_SECRET not configured on server' })

  const authHeader = req.headers['authorization'] || ''
  if (authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { locationId } = req.query
  if (!locationId) return res.status(400).json({ error: 'locationId query param is required' })

  try {
    const tokenData = await getLocationToken(locationId)
    if (!tokenData) {
      return res.status(404).json({
        error: `No OAuth token found for location "${locationId}". Ensure our GHL app is installed at that sub-account.`,
      })
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      accessToken: tokenData.accessToken,
      expiresAt:   tokenData.expiresAt,
      locationId,
    })
  } catch (err) {
    console.error('[/api/token]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
