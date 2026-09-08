// GET /api/auth-team-logout — clears the team dashboard session cookie
export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'lgm-team-auth=; Path=/; Max-Age=0; SameSite=Strict; Secure')
  res.redirect(302, '/?login=1')
}
