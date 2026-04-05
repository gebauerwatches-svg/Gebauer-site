/**
 * GET /api/verify?token=...
 *
 * Handles email verification:
 * 1. Decodes and validates the HMAC-signed token
 * 2. Marks the subscriber as email_verified = true
 * 3. If they were referred by someone, increments that person's referral_count
 * 4. Redirects to the site with a success message
 */

import { verifyToken } from './signup.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const SITE_URL = process.env.SITE_URL || 'https://gebauerwatches.com'

async function supabase(path, options = {}) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers,
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await resp.text()
  return { status: resp.status, data: text ? JSON.parse(text) : null }
}

export default async function handler(req, res) {
  const token = req.query?.token

  if (!token) {
    return res.redirect(302, `${SITE_URL}?error=missing-token`)
  }

  // Decode and validate the token
  const email = verifyToken(token)

  if (!email) {
    return res.redirect(302, `${SITE_URL}?error=invalid-token`)
  }

  // Find the subscriber
  const lookup = await supabase(
    `waitlist_signups?email=eq.${encodeURIComponent(email)}&select=email,email_verified,referred_by,first_name`
  )

  if (!lookup.data || lookup.data.length === 0) {
    return res.redirect(302, `${SITE_URL}?error=not-found`)
  }

  const subscriber = lookup.data[0]

  // Already verified? Just redirect to success
  if (subscriber.email_verified) {
    return res.redirect(302, `${SITE_URL}?verified=already`)
  }

  // Mark as verified
  const update = await supabase(
    `waitlist_signups?email=eq.${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      body: {
        email_verified: true,
        verified_at: new Date().toISOString(),
      },
    }
  )

  if (update.status >= 400) {
    console.error('Failed to verify:', update.data)
    return res.redirect(302, `${SITE_URL}?error=verify-failed`)
  }

  // If they were referred by someone, credit the referrer
  if (subscriber.referred_by) {
    // Find the referrer by their referral_code
    const referrerLookup = await supabase(
      `waitlist_signups?referral_code=eq.${encodeURIComponent(subscriber.referred_by)}&select=email,referral_count`
    )

    if (referrerLookup.data && referrerLookup.data.length > 0) {
      const referrer = referrerLookup.data[0]
      const newCount = (referrer.referral_count || 0) + 1

      await supabase(
        `waitlist_signups?email=eq.${encodeURIComponent(referrer.email)}`,
        {
          method: 'PATCH',
          body: { referral_count: newCount },
        }
      )
    }
  }

  // Redirect to the site with success
  return res.redirect(302, `${SITE_URL}?verified=true`)
}
