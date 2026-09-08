// Vercel Edge Middleware — gates the AI Team Assistant dashboard.
// Only active when AUTH_ENABLED=true is set in the Vercel project env vars.

export const config = {
  matcher: ['/((?!api/|assets/|_vercel|favicon\\.ico|lgm-logo\\.png).*)'],
}

const COOKIE = 'lgm-team-auth'

async function verifyToken(cookieValue, secret) {
  if (!cookieValue?.startsWith('g.')) return false
  const parts = cookieValue.split('.')
  if (parts.length !== 3) return false
  const [, payload, sig] = parts
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const b64 = sig.replace(/-/g, '+').replace(/_/g, '/')
    const sigBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload))
  } catch {
    return false
  }
}

export default async function middleware(request) {
  if (!process.env.AUTH_ENABLED) return

  const url = new URL(request.url)
  if (url.searchParams.get('login') === '1') return

  const cookieHeader = request.headers.get('cookie') || ''
  const sessionValue = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)

  const secret  = process.env.SESSION_SECRET
  const isValid = secret ? await verifyToken(sessionValue, secret) : false
  if (isValid) return

  const loginUrl = new URL(request.url)
  loginUrl.pathname = '/'
  loginUrl.search = '?login=1'
  return Response.redirect(loginUrl, 302)
}
