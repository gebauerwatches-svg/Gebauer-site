/**
 * Admin auth helpers.
 *
 * Simple model: a single ADMIN_PASSWORD env var (secret). Successful login
 * returns an HMAC-signed cookie that's valid for 24 hours. All admin API
 * routes (functions/admin/api/*) call requireAuth() at the top.
 *
 * NOT enterprise-grade auth. Right tradeoff for a single-user admin where
 * the alternative is more vendor dependencies.
 */

const COOKIE_NAME = 'gebauer_admin'
const SESSION_TTL_MS = 24 * 60 * 60 * 1000  // 24 hours

function toBase64Url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}

async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return toBase64Url(sig)
}

export async function createSessionCookie(env) {
  const secret = env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD
  if (!secret) throw new Error('Missing ADMIN_SESSION_SECRET / ADMIN_PASSWORD')
  const expiresAt = Date.now() + SESSION_TTL_MS
  const payload = JSON.stringify({ exp: expiresAt })
  const payloadEncoded = toBase64Url(new TextEncoder().encode(payload))
  const sig = await hmacSign(secret, payloadEncoded)
  return `${COOKIE_NAME}=${payloadEncoded}.${sig}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}`
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
}

async function verifySession(env, cookieValue) {
  const secret = env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD
  if (!secret || !cookieValue) return false
  const parts = cookieValue.split('.')
  if (parts.length !== 2) return false
  const [payloadEncoded, sig] = parts
  const expected = await hmacSign(secret, payloadEncoded)
  if (sig !== expected) return false
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadEncoded)))
    return payload.exp && payload.exp > Date.now()
  } catch {
    return false
  }
}

function parseCookies(request) {
  const header = request.headers.get('Cookie') || ''
  const out = {}
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name) out[name] = rest.join('=')
  }
  return out
}

export async function isAuthenticated(context) {
  const cookies = parseCookies(context.request)
  return verifySession(context.env, cookies[COOKIE_NAME])
}

export async function requireAuth(context, jsonRespond) {
  const ok = await isAuthenticated(context)
  if (ok) return null
  return jsonRespond({ error: 'Not authenticated', code: 'AUTH_REQUIRED' }, 401)
}
