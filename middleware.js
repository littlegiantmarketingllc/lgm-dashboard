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
    const enc = new TextEncoder()
    // Re-sign the payload with the server secret, then compare to the cookie sig.
    // Avoids atob/Uint8Array decode issues in Edge runtime entirely.
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
    // Convert raw bytes → base64url
    const bytes = new Uint8Array(sigBuf)
    let bin = ''
    bytes.forEach(b => { bin += String.fromCharCode(b) })
    const expected = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return expected === sig
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
