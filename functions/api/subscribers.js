/**
 * GET /api/subscribers
 *
 * Read-only export of the waitlist, for broadcast.py. This is the endpoint
 * broadcast.py has always said it needed:
 *
 *   "Does NOT pull from D1 directly ... For a real launch we need a small
 *    read-only /api/subscribers endpoint protected by a token."
 *
 * Until this existed there was no way to email the 137 people who signed up.
 * The list was collectable and not reachable.
 *
 * This is the only endpoint on the site that returns personal data in bulk, so
 * it is the one worth being paranoid about:
 *
 *   - Requires a bearer token. If SUBSCRIBERS_TOKEN is not set it returns 503
 *     rather than serving the list. Fails CLOSED. A missing secret must never
 *     mean an open door.
 *   - Constant-time token comparison, so a wrong guess cannot be narrowed down
 *     by timing the response.
 *   - No CORS headers, so a browser on another origin cannot read it even with
 *     a stolen token pasted into a fetch.
 *   - no-store, so nothing caches a copy of the list at the edge.
 *   - Returns unsubscribed rows only when explicitly asked, and never emails
 *     to a log line.
 *
 * Returns unsubscribe_token per row on purpose: the broadcast needs it to build
 * a working per-recipient unsubscribe link, which CAN-SPAM requires.
 */

import { json } from './_shared.js'

const MAX_LIMIT = 1000

function timingSafeEqual(a, b) {
  // Not crypto.timingSafeEqual, which Workers does not expose here. Comparing
  // every character regardless of mismatch is enough to stop a timing oracle
  // on a token this size. Length is compared first and leaks only length.
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function deny(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

export async function onRequestGet(context) {
  const { env, request } = context

  if (!env.SUBSCRIBERS_TOKEN) {
    // Fail closed. An unset secret is a misconfiguration, not permission.
    return deny(503, 'Subscriber export is not configured on this deployment.')
  }
  if (!env.DB) {
    return deny(503, 'Database unavailable.')
  }

  const auth = request.headers.get('Authorization') || ''
  const presented = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!presented || !timingSafeEqual(presented, env.SUBSCRIBERS_TOKEN)) {
    return deny(401, 'Unauthorized.')
  }

  const url = new URL(request.url)
  const includeUnsubscribed = url.searchParams.get('include_unsubscribed') === 'true'
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get('limit') || String(MAX_LIMIT), 10) || MAX_LIMIT, 1),
    MAX_LIMIT,
  )
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0)

  const where = includeUnsubscribed ? '' : "WHERE status = 'active'"

  try {
    const { results } = await env.DB.prepare(`
      SELECT email, first_name, status, unsubscribe_token, subscribed_at,
             referral_count, waitlist_position
      FROM subscribers
      ${where}
      ORDER BY subscribed_at ASC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()

    const countRow = await env.DB.prepare(`
      SELECT COUNT(*) AS cnt FROM subscribers ${where}
    `).first()

    // Deliberately logs the count and never the addresses. An access log that
    // contains the mailing list defeats the point of protecting the endpoint.
    console.log(`[subscribers] export ok: ${results.length} row(s) of ${countRow?.cnt ?? '?'}`)

    return new Response(JSON.stringify({
      total: countRow?.cnt ?? results.length,
      returned: results.length,
      offset,
      subscribers: results,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  } catch (err) {
    console.log(`[subscribers] export FAILED: ${err && err.message}`)
    return deny(500, 'Export failed.')
  }
}
