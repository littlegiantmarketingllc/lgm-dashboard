// Vercel Cron target — proactively refreshes the shared GHL company token
// well before its 24h expiry, instead of waiting for it to fully lapse and
// then trying to refresh a token that's been dead for a day+. GHL's
// refresh_token grant appears to only work within a short window after
// expiry, not indefinitely — every real-world failure we've hit was a
// refresh attempted long after the access token had already expired, never
// one attempted while still fresh. Refreshing on a schedule sidesteps that
// entirely rather than depending on someone actually using the dashboard
// often enough to trigger a timely reactive refresh.
import { kv } from './_supabase.js'
import { setTokenStatus } from './_ghlAuth.js'

const GHL_BASE   = 'https://services.leadconnectorhq.com'
const COMPANY_ID = 'MKJeZKBhrN9uLt4ZWZCa'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function attemptRefresh(refreshToken) {
  const tokenRes = await fetch(`${GHL_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GHL_CLIENT_ID,
      client_secret: process.env.GHL_CLIENT_SECRET,
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  const tokens = await tokenRes.json().catch(() => ({}))
  return { ok: tokenRes.ok && !!tokens.access_token, tokens }
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization'] || ''
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const company = await kv.get(`ghl:company_token:${COMPANY_ID}`)
    if (!company?.refreshToken) {
      await setTokenStatus(false, 'No company token found to refresh')
      return res.status(404).json({ error: 'No company token found to refresh' })
    }

    // One retry after a short pause before giving up — covers a transient
    // network/5xx blip on GHL's side rather than treating it the same as a
    // genuinely dead refresh token (e.g. invalidated by a GHL Marketplace
    // app version change, which no retry will fix).
    let { ok, tokens } = await attemptRefresh(company.refreshToken)
    if (!ok) {
      await sleep(3000)
      ;({ ok, tokens } = await attemptRefresh(company.refreshToken))
    }

    if (!ok) {
      console.error('[cron-refresh-token] refresh failed after retry:', tokens)
      await setTokenStatus(false, `refresh_token grant failed: ${JSON.stringify(tokens).slice(0, 300)}`)
      return res.status(502).json({ error: 'Refresh failed', detail: tokens })
    }

    await kv.set(`ghl:company_token:${COMPANY_ID}`, {
      ...company,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token || company.refreshToken,
      expiresAt:    Date.now() + (tokens.expires_in * 1000),
    })
    await setTokenStatus(true)

    console.log('[cron-refresh-token] Company token refreshed successfully')
    return res.status(200).json({ ok: true, refreshedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[cron-refresh-token] error:', err.message)
    await setTokenStatus(false, err.message)
    return res.status(500).json({ error: err.message })
  }
}
