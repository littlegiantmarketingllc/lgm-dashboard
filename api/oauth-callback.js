// GHL OAuth callback — stores company-level token in Supabase ghl_tokens table.
// Redirect URI to register in GHL marketplace app:
//   https://health.littlegiantmarketing.com/api/oauth-callback
import { kv } from './_supabase.js'

const GHL_BASE  = 'https://services.leadconnectorhq.com'
const COMPANY_ID = 'MKJeZKBhrN9uLt4ZWZCa'

export default async function handler(req, res) {
  // Block automated bot traffic immediately before any database or API work
  const ua = (req.headers['user-agent'] || '').toLowerCase()
  if (ua.includes('axios') || ua.includes('python') || ua.includes('curl') || ua.includes('wget') || ua === '') {
    return res.status(403).end()
  }

  const { code, error } = req.query

  if (error) {
    return res.status(400).send(page('Authorization Failed',
      `<p style="color:#e55">GHL returned: ${error}</p>`))
  }
  if (!code) {
    return res.status(400).send(page('Missing Code',
      `<p>No authorization code received. Try <a href="/api/oauth-connect">connecting again</a>.</p>`))
  }

  const tokenRes = await fetch(`${GHL_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GHL_CLIENT_ID,
      client_secret: process.env.GHL_CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  'https://health.littlegiantmarketing.com/api/oauth-callback',
    }),
  })

  const tokens = await tokenRes.json()

  if (!tokenRes.ok || !tokens.access_token) {
    console.error('[oauth-callback] token exchange failed:', tokens)
    return res.status(400).send(page('Token Exchange Failed',
      `<p>Could not exchange code for token. GHL response: <code>${JSON.stringify(tokens)}</code></p>
       <p><a href="/api/oauth-connect">Try again</a></p>`))
  }

  const companyId = tokens.companyId || COMPANY_ID

  await kv.set(`ghl:company_token:${companyId}`, {
    accessToken:  tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt:    Date.now() + (tokens.expires_in * 1000),
    companyId,
    tokenType:    'Company',
  })

  console.log(`[oauth-callback] Company token stored for ${companyId}`)

  return res.status(200).send(page('Connected!', `
    <div style="font-size:64px;font-weight:800;color:#8CC63F;line-height:1;margin:16px 0">✓</div>
    <p>Agency OAuth connected. All ${280}+ client accounts will authenticate automatically on first load.</p>
    <p style="margin-top:20px"><a href="/" style="color:#8CC63F">Go to dashboard</a></p>
  `))
}

function page(title, content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f6f4}.card{text-align:center;background:#fff;padding:48px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.08);max-width:480px;width:90%}h2{color:#8CC63F;margin:0 0 16px}p{color:#555;margin:8px 0;line-height:1.5}code{font-size:11px;background:#f4f4f4;padding:2px 6px;border-radius:4px}a{color:#8CC63F}</style>
</head><body><div class="card"><h2>${title}</h2>${content}</div></body></html>`
}
