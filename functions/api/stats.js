/**
 * GET /api/stats?email=...
 *
 * Cloudflare Pages Function.
 * Returns subscriber stats for the My Stats feature.
 *
 * Phase 2 migration (June 13 2026): reads from MailerLite, not Supabase.
 *
 * Environment variables:
 *   ML_KEY              — MailerLite API key
 *   WAITLIST_GROUP_ID   — Gebauer Pre Launch group ID (used for membership check)
 */

import { json } from './_shared.js'

const ML_BASE = 'https://connect.mailerlite.com/api'

export async function onRequestGet(context) {
  const { env } = context
  const url = new URL(context.request.url)
  const email = (url.searchParams.get('email') || '').trim().toLowerCase()

  if (!email) return json({ error: 'Email is required.' }, 400)
  if (!env.ML_KEY) return json({ error: 'Server configuration error.' }, 500)

  try {
    const resp = await fetch(`${ML_BASE}/subscribers/${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.ML_KEY}`,
        'Accept': 'application/json',
      },
    })

    if (resp.status === 404) {
      return json({ error: 'Email not found on the waitlist.' }, 404)
    }
    if (!resp.ok) {
      console.error('MailerLite stats lookup error:', resp.status, await resp.text())
      return json({ error: 'Something went wrong.' }, 500)
    }

    const body = await resp.json()
    const sub = body?.data
    if (!sub) return json({ error: 'Email not found on the waitlist.' }, 404)

    const fields = sub.fields || {}
    const position = parseInt(fields.waitlist_position || 9999, 10)

    return json({
      first_name: fields.name || '',
      email: sub.email,
      referral_count: parseInt(fields.referral_count || 0, 10),
      referral_code: fields.referral_code || '',
      current_position: position === 9999 ? 0 : position,
    })
  } catch (err) {
    console.error('Stats error:', err.message)
    return json({ error: 'Something went wrong.' }, 500)
  }
}
