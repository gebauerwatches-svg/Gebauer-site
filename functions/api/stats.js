/**
 * GET /api/stats?email=...
 *
 * Cloudflare Pages Function.
 * Returns subscriber stats for the My Stats feature.
 */

import { json, supabaseQuery } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  const url = new URL(context.request.url)
  const email = (url.searchParams.get('email') || '').trim().toLowerCase()

  if (!email) return json({ error: 'Email is required.' }, 400)
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return json({ error: 'Server configuration error.' }, 500)

  try {
    const resp = await supabaseQuery(env,
      `waitlist_signups?email=eq.${encodeURIComponent(email)}&select=first_name,email,referral_count,referral_code,current_position,email_verified`
    )

    if (!resp.data || resp.data.length === 0) {
      return json({ error: 'Email not found on the waitlist.' }, 404)
    }

    const user = resp.data[0]
    if (!user.email_verified) {
      return json({ error: 'Check your email to verify your spot first.' })
    }

    return json({
      first_name: user.first_name,
      email: user.email,
      referral_count: user.referral_count || 0,
      referral_code: user.referral_code || '',
      current_position: user.current_position || 0,
    })
  } catch (err) {
    console.error('Stats error:', err.message)
    return json({ error: 'Something went wrong.' }, 500)
  }
}
