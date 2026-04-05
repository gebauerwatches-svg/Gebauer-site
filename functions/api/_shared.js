/**
 * Shared utilities for Cloudflare Pages Functions.
 * Import these in each function file.
 */

/** JSON response helper */
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...headers,
    },
  })
}

/** Redirect helper */
export function redirect(url) {
  return new Response(null, { status: 302, headers: { Location: url } })
}

/** Query Supabase REST API */
export async function supabaseQuery(env, path, options = {}) {
  const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': env.SUPABASE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await resp.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { status: resp.status, data, headers: resp.headers }
}

/**
 * Create an HMAC-signed verification token using Web Crypto API.
 * Encodes the email and timestamp, signs with TOKEN_SECRET.
 */
export async function createVerificationToken(env, email) {
  const secret = env.TOKEN_SECRET || env.SUPABASE_KEY || 'fallback-dev-secret'
  const data = JSON.stringify({ email, ts: Date.now() })
  const encoded = btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded))
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return `${encoded}.${sig}`
}

/**
 * Verify and decode a token. Returns the email or null if invalid/expired.
 * Tokens expire after 48 hours.
 */
export async function verifyToken(env, token) {
  const secret = env.TOKEN_SECRET || env.SUPABASE_KEY || 'fallback-dev-secret'
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [encoded, sig] = parts

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  // Reconstruct sig bytes from base64url
  const sigStr = sig.replace(/-/g, '+').replace(/_/g, '/')
  const sigBytes = Uint8Array.from(atob(sigStr + '=='.slice(0, (4 - sigStr.length % 4) % 4)), c => c.charCodeAt(0))

  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(encoded))
  if (!valid) return null

  try {
    const decoded = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
    const data = JSON.parse(decoded)
    if (Date.now() - data.ts > 48 * 60 * 60 * 1000) return null
    return data.email
  } catch {
    return null
  }
}

/** Generate a random hex string (replacement for crypto.randomBytes) */
export function randomHex(bytes) {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}
