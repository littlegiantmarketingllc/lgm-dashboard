// Vercel Edge Middleware — gates the Customer Health dashboard.
// Only active when AUTH_ENABLED=true is set in the Vercel project env vars.
// Set AUTH_ENABLED=true on lgm-customer-health only; leave unset on lgm-dashboard.

export const config = {
  matcher: ['/((?!api/|assets/|_vercel|favicon\\.ico|lgm-logo\\.png).*)'],
}

export default function middleware(request) {
  // Skip auth if not enabled for this project
  if (!process.env.AUTH_ENABLED) return

  const url = new URL(request.url)

  // Parse the session cookie from the Cookie header
  const cookieHeader = request.headers.get('cookie') || ''
  const sessionValue = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('lgm-health-auth='))
    ?.slice('lgm-health-auth='.length)

  // Valid session — let the request through
  if (sessionValue && sessionValue === process.env.SESSION_SECRET) return

  // Already on the login page — let it through so the login form can render
  if (url.searchParams.get('login') === '1') return

  // Block everything else — redirect to login
  const loginUrl = new URL(request.url)
  loginUrl.pathname = '/'
  loginUrl.search = '?login=1'
  return Response.redirect(loginUrl, 302)
}
