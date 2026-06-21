/**
 * GET /api/stats?email=...
 *
 * Cloudflare Pages Function.
 * Phase 3 migration (June 20 2026): reads from Cloudflare D1.
 */

import { json } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  const url = new URL(context.request.url)
  const email = (url.searchParams.get('email') || '').trim().toLowerCase()

  if (!email) return json({ error: 'Email is required.' }, 400)
  if (!env.DB) return json({ error: 'Server configuration error.' }, 500)

  try {
    const row = await env.DB.prepare(`
      SELECT first_name, email, referral_count, referral_code, waitlist_position, status
      FROM subscribers
      WHERE email = ?
      LIMIT 1
    `).bind(email).first()

    if (!row) {
      return json({ error: 'Email not found on the waitlist.' }, 404)
    }

    if (row.status === 'unsubscribed') {
      return json({ error: 'This email has unsubscribed from the waitlist.' }, 410)
    }

    const position = parseInt(row.waitlist_position || 9999, 10)

    return json({
      first_name: row.first_name,
      email: row.email,
      referral_count: row.referral_count || 0,
      referral_code: row.referral_code || '',
      current_position: position === 9999 ? 0 : position,
    })
  } catch (err) {
    console.error('Stats error:', err.message)
    return json({ error: 'Something went wrong.' }, 500)
  }
}
