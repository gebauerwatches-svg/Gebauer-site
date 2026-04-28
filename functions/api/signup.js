/**
 * POST /api/signup
 *
 * Cloudflare Pages Function.
 * Saves to Supabase as VERIFIED immediately. No verification email.
 * Credits referrer on signup. Health agent cleans fakes later.
 *
 * Environment variables (set in Cloudflare Pages dashboard):
 *   SUPABASE_URL, SUPABASE_KEY
 */

import { json, supabaseQuery, randomHex } from './_shared.js'

export async function onRequestOptions() {
  return json({}, 200)
}

export async function onRequestPost(context) {
  const { env } = context

  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    return json({ error: 'Server configuration error. Contact hello@gebauerwatches.com.' }, 500)
  }

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request.' }, 400) }

  const { first_name, email, referred_by, honeypot } = body || {}

  if (honeypot) return json({ ok: true })
  if (!email || !first_name) return json({ error: 'Name and email are required.' }, 400)

  const cleanEmail = email.trim().toLowerCase()
  const cleanName = first_name.trim()

  if (cleanName.length < 1 || cleanName.length > 100) {
    return json({ error: 'Name must be between 1 and 100 characters.' }, 400)
  }

  // Basic email validation
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return json({ error: 'Please enter a valid email.' }, 400)
  }

  // Block obvious disposable email domains
  const disposable = ['tempmail', 'throwaway', 'guerrilla', 'sharklasers', 'mailinator', 'yopmail', 'trashmail', 'fakeinbox', 'grr.la']
  if (disposable.some(d => cleanEmail.includes(d))) {
    return json({ error: 'Please use a real email address.' }, 400)
  }

  try {
    // Check for existing signup
    const existing = await supabaseQuery(env,
      `waitlist_signups?email=eq.${encodeURIComponent(cleanEmail)}&select=email,email_verified,first_name`
    )

    if (existing.data && Array.isArray(existing.data) && existing.data.length > 0) {
      return json({ error: "You're already on the waitlist." }, 400)
    }

    // Generate referral code
    const referralCode = cleanName.split(' ')[0].toUpperCase().slice(0, 6) + '-' + randomHex(3).toUpperCase()

    // Insert into Supabase — VERIFIED IMMEDIATELY
    const insert = await supabaseQuery(env, 'waitlist_signups', {
      method: 'POST',
      body: {
        first_name: cleanName,
        email: cleanEmail,
        email_verified: true,
        flagged: false,
        referral_count: 0,
        referral_code: referralCode,
        referred_by: referred_by || null,
        current_position: 9999,
        verified_at: new Date().toISOString(),
      },
    })

    if (insert.status >= 400) {
      console.error('Supabase insert error:', JSON.stringify(insert.data))
      if (typeof insert.data === 'object' && insert.data?.message?.includes('unique')) {
        return json({ error: "You're already on the waitlist." }, 400)
      }
      return json({ error: 'Could not save your signup. Try again in a moment.' }, 500)
    }

    // Credit referrer immediately
    if (referred_by) {
      const referrerLookup = await supabaseQuery(env,
        `waitlist_signups?referral_code=eq.${encodeURIComponent(referred_by)}&select=email,referral_count`
      )

      if (referrerLookup.data && referrerLookup.data.length > 0) {
        const referrer = referrerLookup.data[0]
        await supabaseQuery(env,
          `waitlist_signups?email=eq.${encodeURIComponent(referrer.email)}`,
          { method: 'PATCH', body: { referral_count: (referrer.referral_count || 0) + 1 } }
        )
      }
    }

    // No verification email. They're in.
    return json({ ok: true, verified: true })

  } catch (err) {
    console.error('Signup error:', err.message, err.stack)
    return json({ error: 'Something went wrong. Try again in a moment.' }, 500)
  }
}
