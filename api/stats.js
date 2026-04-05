/**
 * GET /api/stats?email=...
 *
 * Returns a subscriber's stats: name, referral count, referral code,
 * position, and verification status. Used by the "My Stats" feature.
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const email = (req.query?.email || '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'Email is required.' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Server configuration error.' })
  }

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/waitlist_signups?email=eq.${encodeURIComponent(email)}&select=first_name,email,referral_count,referral_code,current_position,email_verified`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    )

    const data = await resp.json()
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Email not found on the waitlist.' })
    }

    const user = data[0]
    if (!user.email_verified) {
      return res.status(200).json({ error: 'Check your email to verify your spot first.' })
    }

    return res.status(200).json({
      first_name: user.first_name,
      email: user.email,
      referral_count: user.referral_count || 0,
      referral_code: user.referral_code || '',
      current_position: user.current_position || 0,
    })
  } catch (err) {
    console.error('Stats error:', err.message)
    return res.status(500).json({ error: 'Something went wrong.' })
  }
}
