/**
 * POST /api/signup
 *
 * Handles waitlist signups:
 * 1. Validates input (name, email, optional referral code)
 * 2. Checks for duplicates in Supabase
 * 3. Inserts into Supabase with email_verified = false
 * 4. Generates a signed verification token (HMAC)
 * 5. Sends a verification email via Resend
 *
 * The subscriber does NOT count toward the waitlist or referral
 * totals until they click the verification link.
 */

import crypto from 'crypto'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const SITE_URL = process.env.SITE_URL || 'https://gebauerwatches.com'
const TOKEN_SECRET = process.env.TOKEN_SECRET || SUPABASE_KEY || 'fallback-dev-secret'

/**
 * Create an HMAC-signed token encoding the email.
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
    if (Date.now() - data.ts > 48 * 60 * 60 * 1000) return null
    return data.email
  } catch {
    return null
  }
}

/**
 * Helper to query Supabase REST API.
 */
async function supabaseQuery(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`
  const resp = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await resp.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { status: resp.status, data }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Check that env vars are configured
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('MISSING ENV: SUPABASE_URL or SUPABASE_KEY not set')
    return res.status(500).json({ error: 'Server configuration error. Contact hello@gebauerwatches.com.' })
  }

  if (!RESEND_API_KEY) {
    console.error('MISSING ENV: RESEND_API_KEY not set')
    return res.status(500).json({ error: 'Server configuration error. Contact hello@gebauerwatches.com.' })
  }

  // Parse body
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid request.' }) }
  }

  const { first_name, email, referred_by, honeypot } = body || {}

  // Honeypot check
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

  try {
    // Check for existing signup
    const existing = await supabaseQuery(
      `waitlist_signups?email=eq.${encodeURIComponent(cleanEmail)}&select=email,email_verified,first_name`
    )

    if (existing.data && Array.isArray(existing.data) && existing.data.length > 0) {
      const user = existing.data[0]
      if (user.email_verified) {
        return res.status(400).json({ error: "You're already on the waitlist." })
      }
      // Already signed up but not verified: resend the verification email
      const token = createVerificationToken(cleanEmail)
      await sendVerificationEmail(cleanEmail, user.first_name || cleanName, token)
      return res.status(200).json({ ok: true, needs_verification: true })
    }

    // Generate a referral code
    const referralCode = cleanName.split(' ')[0].toUpperCase().slice(0, 6) +
      '-' + crypto.randomBytes(3).toString('hex').toUpperCase()

    // Insert into Supabase (unverified)
    const insert = await supabaseQuery('waitlist_signups', {
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
      // Check for common issues
      if (typeof insert.data === 'object' && insert.data?.message) {
        // Could be a column mismatch or constraint violation
        if (insert.data.message.includes('duplicate') || insert.data.message.includes('unique')) {
          return res.status(400).json({ error: "You're already on the waitlist." })
        }
      }
      return res.status(500).json({ error: 'Could not save your signup. Try again in a moment.' })
    }

    // Send verification email
    const token = createVerificationToken(cleanEmail)
    const emailResult = await sendVerificationEmail(cleanEmail, cleanName, token)

    if (!emailResult.ok) {
      console.error('Resend error:', emailResult.error)
      // Signup saved, email failed. Still tell the user to check email.
    }

    return res.status(200).json({ ok: true, needs_verification: true })

  } catch (err) {
    console.error('Signup handler error:', err.message, err.stack)
    return res.status(500).json({ error: 'Something went wrong. Try again in a moment.' })
  }
}

/**
 * Send the verification email via Resend.
 */
async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `${SITE_URL}/api/verify?token=${encodeURIComponent(token)}`
  const firstName = name.split(' ')[0]

  try {
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
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1A1128;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Hey ${firstName},
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
    const errText = await resp.text()
    return { ok: false, error: errText }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}
