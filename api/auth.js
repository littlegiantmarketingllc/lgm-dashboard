// Vercel serverless function — login / logout / session check.
// POST /api/auth         { password }  → set session cookie
// GET  /api/auth?logout=1              → clear cookie + redirect to login
// GET  /api/auth?check=1               → 200 ok | 401 not authenticated

const COOKIE_NAME = 'lgm-health-auth'
const MAX_AGE     = 60 * 60 * 24 * 365  // 1 year — recognized device stays logged in

function cookieHeader(value, maxAge) {
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Strict; Secure`
}

export default async function handler(req, res) {
  const secret   = process.env.SESSION_SECRET
  const password = process.env.DASHBOARD_PASSWORD

  if (!secret || !password) {
    return res.status(500).json({ error: 'Auth env vars not configured (SESSION_SECRET, DASHBOARD_PASSWORD)' })
  }

  // ── POST: login ───────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    if (body?.password === password) {
      res.setHeader('Set-Cookie', cookieHeader(secret, MAX_AGE))
      return res.status(200).json({ ok: true })
    }
    // Rate-limit hint via 429 after wrong password
    return res.status(401).json({ error: 'Incorrect password' })
  }

  // ── GET: check or logout ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    if (req.query.logout === '1') {
      res.setHeader('Set-Cookie', cookieHeader('', 0))
      return res.redirect(302, '/?login=1')
    }

    const cookie = req.cookies?.[COOKIE_NAME]
    if (cookie === secret) {
      return res.status(200).json({ ok: true })
    }
    return res.status(401).json({ error: 'Not authenticated' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
