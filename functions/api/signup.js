/**
 * POST /api/signup
 *
 * Cloudflare Pages Function.
 * Saves to Supabase (unverified), sends verification email via Resend.
 * Referral only counts after email verification (handled in verify.js).
 *
 * Environment variables (set in Cloudflare Pages dashboard):
 *   SUPABASE_URL, SUPABASE_KEY, RESEND_API_KEY, SITE_URL, TOKEN_SECRET
 */

import { json, supabaseQuery, createVerificationToken, randomHex } from './_shared.js'

export async function onRequestOptions() {
  return json({}, 200)
}

export async function onRequestPost(context) {
  const { env } = context

  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    return json({ error: 'Server configuration error. Contact hello@gebauerwatches.com.' }, 500)
  }
  if (!env.RESEND_API_KEY) {
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

  try {
    // Check for existing signup
    const existing = await supabaseQuery(env,
      `waitlist_signups?email=eq.${encodeURIComponent(cleanEmail)}&select=email,email_verified,first_name`
    )

    if (existing.data && Array.isArray(existing.data) && existing.data.length > 0) {
      const user = existing.data[0]
      if (user.email_verified) {
        return json({ error: "You're already on the waitlist." }, 400)
      }
      const token = await createVerificationToken(env, cleanEmail)
      await sendVerificationEmail(env, cleanEmail, user.first_name || cleanName, token)
      return json({ ok: true, needs_verification: true })
    }

    // Generate referral code
    const referralCode = cleanName.split(' ')[0].toUpperCase().slice(0, 6) + '-' + randomHex(3).toUpperCase()

    // Insert into Supabase (unverified)
    const insert = await supabaseQuery(env, 'waitlist_signups', {
      method: 'POST',
      body: {
        first_name: cleanName,
        email: cleanEmail,
        email_verified: false,
        flagged: false,
        referral_count: 0,
        referral_code: referralCode,
        referred_by: referred_by || null,
        current_position: 9999,
      },
    })

    if (insert.status >= 400) {
      console.error('Supabase insert error:', JSON.stringify(insert.data))
      if (typeof insert.data === 'object' && insert.data?.message?.includes('unique')) {
        return json({ error: "You're already on the waitlist." }, 400)
      }
      return json({ error: 'Could not save your signup. Try again in a moment.' }, 500)
    }

    const token = await createVerificationToken(env, cleanEmail)
    await sendVerificationEmail(env, cleanEmail, cleanName, token)

    return json({ ok: true, needs_verification: true })

  } catch (err) {
    console.error('Signup error:', err.message, err.stack)
    return json({ error: 'Something went wrong. Try again in a moment.' }, 500)
  }
}

async function sendVerificationEmail(env, email, name, token) {
  const siteUrl = env.SITE_URL || 'https://gebauerwatches.com'
  const verifyUrl = `${siteUrl}/api/verify?token=${encodeURIComponent(token)}`
  const firstName = name.split(' ')[0]

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Liam from Gebauer <hello@gebauerwatches.com>',
        to: [email],
        subject: 'Verify your spot on the Gebauer waitlist',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1A1128;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hey ${firstName},</p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">You just signed up for the Gebauer waitlist. Click below to verify your email and lock in your spot.</p>
            <a href="${verifyUrl}" style="display: inline-block; background: #D4A62A; color: #1A1128; padding: 16px 40px; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase;">Verify My Spot</a>
            <p style="font-size: 14px; line-height: 1.6; margin-top: 32px; color: #6B6080;">This link expires in 48 hours. If you didn't sign up, just ignore this.</p>
            <p style="font-size: 14px; line-height: 1.6; margin-top: 24px;">Liam</p>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error('Resend error:', err.message)
  }
}
