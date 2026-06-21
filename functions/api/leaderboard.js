/**
 * GET /api/leaderboard
 *
 * Cloudflare Pages Function.
 * Phase 3 migration (June 20 2026): reads from Cloudflare D1 with proper SQL.
 * Fast and indexed, unlike the prior client-side sort over the MailerLite group.
 */

import { json } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context

  if (!env.DB) return json({ error: 'Server configuration error.' }, 500)

  try {
    // Top 100 referrers with referral_count > 0
    const top = await env.DB.prepare(`
      SELECT first_name, referral_count
      FROM subscribers
      WHERE status = 'active' AND referral_count > 0
      ORDER BY referral_count DESC
      LIMIT 100
    `).all()

    // Total active subscriber count
    const totalRow = await env.DB.prepare(`
      SELECT COUNT(*) as cnt FROM subscribers WHERE status = 'active'
    `).first()

    const leaderboard = (top.results || []).map(r => ({
      name: r.first_name || 'Anonymous',
      referrals: r.referral_count || 0,
    }))

    return json({
      leaderboard,
      total: totalRow ? totalRow.cnt : 0,
    })
  } catch (err) {
    console.error('Leaderboard error:', err.message)
    return json({ error: 'Something went wrong.' }, 500)
  }
}
