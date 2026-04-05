/**
 * GET /api/leaderboard
 *
 * Returns the top 10 referrers from the waitlist (verified only).
 * Used by the landing page and Layer 2 leaderboard.
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Server configuration error.' })
  }

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/waitlist_signups?select=first_name,referral_count&email_verified=eq.true&referral_count=gt.0&order=referral_count.desc&limit=10`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    )

    const data = await resp.json()

    // Only send first names and counts, nothing sensitive
    const leaderboard = (data || []).map(r => ({
      name: r.first_name || 'Anonymous',
      referrals: r.referral_count || 0,
    }))

    // Also get total verified count
    const countResp = await fetch(
      `${SUPABASE_URL}/rest/v1/waitlist_signups?select=id&email_verified=eq.true`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'count=exact',
        },
      }
    )
    const countHeader = countResp.headers.get('content-range') || ''
    const total = parseInt(countHeader.split('/')[1]) || 0

    return res.status(200).json({ leaderboard, total })
  } catch (err) {
    console.error('Leaderboard error:', err.message)
    return res.status(500).json({ error: 'Something went wrong.' })
  }
}
