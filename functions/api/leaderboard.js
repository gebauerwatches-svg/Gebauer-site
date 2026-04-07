/**
 * GET /api/leaderboard
 *
 * Cloudflare Pages Function.
 * Returns top 10 referrers and total verified subscriber count.
 */

import { json, supabaseQuery } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context

  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return json({ error: 'Server configuration error.' }, 500)

  try {
    const resp = await supabaseQuery(env,
      `waitlist_signups?select=first_name,referral_count&email_verified=eq.true&referral_count=gt.0&order=referral_count.desc&limit=100`
    )

    const leaderboard = (resp.data || []).map(r => ({
      name: r.first_name || 'Anonymous',
      referrals: r.referral_count || 0,
    }))

    // Get total verified count
    const countResp = await supabaseQuery(env,
      `waitlist_signups?select=id&email_verified=eq.true`,
      { prefer: 'count=exact' }
    )
    const countHeader = countResp.headers.get('content-range') || ''
    const total = parseInt(countHeader.split('/')[1]) || 0

    return json({ leaderboard, total })
  } catch (err) {
    console.error('Leaderboard error:', err.message)
    return json({ error: 'Something went wrong.' }, 500)
  }
}
