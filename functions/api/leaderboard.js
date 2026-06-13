/**
 * GET /api/leaderboard
 *
 * Cloudflare Pages Function.
 * Returns top 10 referrers and total subscriber count.
 *
 * Phase 2 migration (June 13 2026): reads from MailerLite, not Supabase.
 *
 * Performance note: MailerLite doesn't sort by custom field server-side,
 * so we pull the group's subscribers and sort client-side. With ~135-300
 * subscribers this is fine. If the list grows past 1000, add Cloudflare KV
 * cache with ~60s TTL.
 */

import { json } from './_shared.js'

const ML_BASE = 'https://connect.mailerlite.com/api'

async function listGroupSubscribers(key, groupId, limit = 1000) {
  const subscribers = []
  let cursor = null
  while (subscribers.length < limit) {
    const params = new URLSearchParams({ limit: String(Math.min(100, limit - subscribers.length)) })
    if (cursor) params.set('cursor', cursor)
    const resp = await fetch(`${ML_BASE}/groups/${groupId}/subscribers?${params}`, {
      headers: { 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
    })
    if (!resp.ok) break
    const body = await resp.json()
    subscribers.push(...(body.data || []))
    cursor = body.meta?.next_cursor
    if (!cursor) break
  }
  return subscribers
}

export async function onRequestGet(context) {
  const { env } = context

  if (!env.ML_KEY || !env.WAITLIST_GROUP_ID) {
    return json({ error: 'Server configuration error.' }, 500)
  }

  try {
    const subs = await listGroupSubscribers(env.ML_KEY, env.WAITLIST_GROUP_ID, 1000)

    // Build the leaderboard from referral_count custom field
    const ranked = subs
      .map(s => ({
        name: s.fields?.name || 'Anonymous',
        referrals: parseInt(s.fields?.referral_count || 0, 10),
      }))
      .filter(r => r.referrals > 0)
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 100)

    return json({
      leaderboard: ranked,
      total: subs.length,
    })
  } catch (err) {
    console.error('Leaderboard error:', err.message)
    return json({ error: 'Something went wrong.' }, 500)
  }
}
