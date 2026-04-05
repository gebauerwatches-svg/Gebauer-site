/**
 * POST /api/signup
 *
 * Handles waitlist signups:
 * 1. Validates input (name, email, optional referral code)
 * 2. Checks for duplicates
 * 3. Inserts into Supabase with email_verified = false
 * 4. Generates a signed verification token (HMAC)
 * 5. Sends a verification email via Resend
 *
 * The subscriber does NOT count toward the waitlist or referral
 * totals until they click the verification link.
 */

import crypto from 'crypto'

// These come from Vercel environment variables (set in dashboard or .env.local)
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const SITE_URL = process.env.SITE_URL || 'https://gebauerwatches.com'

// Secret used to sign verification tokens. Set this in Vercel env vars.
// If not set, falls back to a hash of the Supabase key (not ideal for prod).
const TOKEN_SECRET = process.env.TOKEN_SECRET || SUPABASE_KEY

/**
 * Create an HMAC-signed token encoding the email.
 * This avoids needing a separate tokens table in the database.
 */
function createVerificationToken(email) {
  const data = JSON.stringify({ email, ts: Date.now() })
  const encoded = Buffer.from(data).toString('base64url')
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

/**
 * Verify and decode a token. Returns the email or null if invalid.
 * Tokens expire after 48 hours.
 */
export function verifyToken(token) {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [encoded, sig] = parts
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url')

  if (sig !== expectedSig) return null

  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString())
    // Expire after 48 hours
    if (Date.now() - data.ts > 48 * 60 * 60 * 1000) return null
    return data.email
  } catch {
    return null
  }
}

/**
 * Helper to query Supabase REST API.
 */
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
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { first_name, email, referred_by, honeypot } = req.body || {}

  // Honeypot check (bots fill this hidden field)
  if (honeypot) return res.status(200).json({ ok: true })

  // Validate
  if (!email || !first_name) {
    return res.status(400).json({ error: 'Name and email are required.' })
  }

  const cleanEmail = email.trim().toLowerCase()
  const cleanName = first_name.trim()

  if (cleanName.length < 1 || cleanName.length > 100) {
    return res.status(400).json({ error: 'Name must be between 1 and 100 characters.' })
  }

  // Check for existing signup
  const existing = await supabase(
    `waitlist_signups?email=eq.${encodeURIComponent(cleanEmail)}&select=email,email_verified`
  )

  if (existing.data && existing.data.length > 0) {
    const user = existing.data[0]
    if (user.email_verified) {
      return res.status(400).json({ error: "You're already on the waitlist." })
    }
    // Already signed up but not verified: resend the verification email
    const token = createVerificationToken(cleanEmail)
    await sendVerificationEmail(cleanEmail, cleanName, token)
    return res.status(200).json({ ok: true, needs_verification: true })
  }

  // Generate a referral code for this new subscriber
  const referralCode = cleanName.split(' ')[0].toUpperCase().slice(0, 6) +
    '-' + crypto.randomBytes(3).toString('hex').toUpperCase()

  // Insert into Supabase (unverified)
  const insert = await supabase('waitlist_signups', {
    method: 'POST',
    body: {
      first_name: cleanName,
      email: cleanEmail,
      email_verified: false,
      flagged: false,
      referral_count: 0,
      referral_code: referralCode,
      referred_by: referred_by || null,
      current_position: 9999, // Temporary, gets recalculated after verification
    },
  })

  if (insert.status >= 400) {
    console.error('Supabase insert failed:', insert.data)
    return res.status(500).json({ error: 'Something went wrong. Try again.' })
  }

  // Send verification email
  const token = createVerificationToken(cleanEmail)
  const emailResult = await sendVerificationEmail(cleanEmail, cleanName, token)

  if (!emailResult.ok) {
    console.error('Resend failed:', emailResult.error)
    // Don't fail the signup, they can request a resend later
  }

  return res.status(200).json({ ok: true, needs_verification: true })
}

/**
 * Send the verification email via Resend.
 */
async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `${SITE_URL}/api/verify?token=${encodeURIComponent(token)}`

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Liam from Gebauer <hello@gebauerwatches.com>',
      to: [email],
      subject: 'Verify your spot on the Gebauer waitlist',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1A1128;">
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Hey ${name.split(' ')[0]},
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            You just signed up for the Gebauer waitlist. Click below to verify your email and lock in your spot.
          </p>
          <a href="${verifyUrl}" style="display: inline-block; background: #D4A62A; color: #1A1128; padding: 16px 40px; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase;">
            Verify My Spot
          </a>
          <p style="font-size: 14px; line-height: 1.6; margin-top: 32px; color: #6B6080;">
            This link expires in 48 hours. If you didn't sign up, just ignore this.
          </p>
          <p style="font-size: 14px; line-height: 1.6; margin-top: 24px;">
            Liam
          </p>
        </div>
      `,
    }),
  })

  if (resp.ok) return { ok: true }
  const err = await resp.text()
  return { ok: false, error: err }
}
