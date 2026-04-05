/**
 * GET /api/verify?token=...
 *
 * Cloudflare Pages Function.
 * Validates token, marks email_verified=true, credits referrer.
 */

import { redirect, supabaseQuery, verifyToken } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  const url = new URL(context.request.url)
  const token = url.searchParams.get('token')
  const siteUrl = env.SITE_URL || 'https://gebauerwatches.com'

  if (!token) return redirect(`${siteUrl}?error=missing-token`)

  const email = await verifyToken(env, token)
  if (!email) return redirect(`${siteUrl}?error=invalid-token`)

  // Find subscriber
  const lookup = await supabaseQuery(env,
    `waitlist_signups?email=eq.${encodeURIComponent(email)}&select=email,email_verified,referred_by,first_name`
  )

  if (!lookup.data || lookup.data.length === 0) {
    return redirect(`${siteUrl}?error=not-found`)
  }

  const subscriber = lookup.data[0]

  if (subscriber.email_verified) {
    return redirect(`${siteUrl}?verified=already`)
  }

  // Mark as verified
  const update = await supabaseQuery(env,
    `waitlist_signups?email=eq.${encodeURIComponent(email)}`,
    { method: 'PATCH', body: { email_verified: true, verified_at: new Date().toISOString() } }
  )

  if (update.status >= 400) {
    console.error('Verify failed:', update.data)
    return redirect(`${siteUrl}?error=verify-failed`)
  }

  // Credit referrer
  if (subscriber.referred_by) {
    const referrerLookup = await supabaseQuery(env,
      `waitlist_signups?referral_code=eq.${encodeURIComponent(subscriber.referred_by)}&select=email,referral_count`
    )

    if (referrerLookup.data && referrerLookup.data.length > 0) {
      const referrer = referrerLookup.data[0]
      await supabaseQuery(env,
        `waitlist_signups?email=eq.${encodeURIComponent(referrer.email)}`,
        { method: 'PATCH', body: { referral_count: (referrer.referral_count || 0) + 1 } }
      )
    }
  }

  return redirect(`${siteUrl}?verified=true`)
}
