/**
 * POST /api/signup
 *
 * Cloudflare Pages Function.
 * Phase 3 migration (June 20 2026): writes signups to Cloudflare D1.
 * Owns the entire waitlist on Cloudflare. No external email service for storage.
 *
 * Bindings required (set in Cloudflare Pages dashboard or wrangler.toml):
 *   DB             - D1 database binding (database name: gebauer-waitlist)
 *
 * Milestone story (optional) writes to the D1 community_stories table.
 * Phase 4 migration (June 21 2026): no more Supabase votes project dependency.
 */

import { json, randomHex } from './_shared.js'
import { sendWelcomeEmail } from './_welcome.js'


// Save the milestone story to D1 community_stories. Best-effort, swallows errors.
async function saveMilestoneStory(env, email, firstName, story) {
  if (!env.DB) return

  const badWords = ['fuck','shit','bitch','damn','dick','cock','pussy','cunt','fag','nigger','nigga','retard','slut','whore','porn','rape','nazi','hitler','terrorist','bomb']
  const lower = story.toLowerCase()
  if (badWords.some(w => new RegExp(`\\b${w}\\b`, 'i').test(lower))) return

  const now = new Date().toISOString()
  try {
    await env.DB.prepare(`
      INSERT INTO community_stories (email, first_name, story, status, created_at)
      VALUES (?, ?, ?, 'approved', ?)
    `).bind(email, firstName, story.slice(0, 500), now).run()
  } catch (e) {
    // Best-effort: don't fail the signup if the story save errors (e.g. duplicate email)
    console.error('saveMilestoneStory:', e.message)
  }
}


export async function onRequestOptions() {
  return json({}, 200)
}

export async function onRequestPost(context) {
  const { env } = context

  if (!env.DB) {
    return json({ error: 'Server configuration error. Contact hello@gebauerwatches.com.' }, 500)
  }

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request.' }, 400) }

  const { first_name, email, referred_by, honeypot, milestone_story } = body || {}

  if (honeypot) return json({ ok: true })
  if (!email || !first_name) return json({ error: 'Name and email are required.' }, 400)

  const cleanEmail = email.trim().toLowerCase()
  const cleanName = first_name.trim()

  if (cleanName.length < 1 || cleanName.length > 100) {
    return json({ error: 'Name must be between 1 and 100 characters.' }, 400)
  }
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return json({ error: 'Please enter a valid email.' }, 400)
  }

  const disposable = ['tempmail', 'throwaway', 'guerrilla', 'sharklasers', 'mailinator', 'yopmail', 'trashmail', 'fakeinbox', 'grr.la']
  if (disposable.some(d => cleanEmail.includes(d))) {
    return json({ error: 'Please use a real email address.' }, 400)
  }

  try {
    // Already on the waitlist?
    const existing = await env.DB.prepare(
      'SELECT id FROM subscribers WHERE email = ? LIMIT 1'
    ).bind(cleanEmail).first()

    if (existing) {
      return json({ error: "You're already on the waitlist." }, 400)
    }

    // Generate referral code: first six letters of first word + 6 hex chars
    const referralCode = cleanName.split(' ')[0].toUpperCase().slice(0, 6) + '-' + randomHex(3).toUpperCase()
    // Unsubscribe token: 16 random hex chars (96 bits of entropy)
    const unsubscribeToken = randomHex(16)
    const now = new Date().toISOString()

    // Insert subscriber
    await env.DB.prepare(`
      INSERT INTO subscribers
        (email, first_name, referral_code, referred_by, referral_count, waitlist_position, unsubscribe_token, status, subscribed_at)
      VALUES (?, ?, ?, ?, 0, 9999, ?, 'active', ?)
    `).bind(cleanEmail, cleanName, referralCode, referred_by || null, unsubscribeToken, now).run()

    // Credit referrer if there was one (atomic UPDATE, no read-modify-write race)
    if (referred_by) {
      try {
        await env.DB.prepare(`
          UPDATE subscribers
          SET referral_count = referral_count + 1
          WHERE referral_code = ? AND status = 'active'
        `).bind(referred_by).run()
      } catch (e) {
        console.error('Referrer credit failed:', e.message)
      }
    }

    // Milestone story (optional) writes to D1 community_stories.
    if (milestone_story && milestone_story.trim()) {
      try { await saveMilestoneStory(env, cleanEmail, cleanName, milestone_story.trim()) } catch (e) { console.error('Story save failed:', e.message) }
    }

    // Welcome email (best-effort, never blocks the response)
    try {
      const result = await sendWelcomeEmail(env, {
        email: cleanEmail,
        first_name: cleanName,
        unsubscribe_token: unsubscribeToken,
      })
      if (!result.sent) {
        console.log('Welcome skipped:', result.reason, result.error || '')
      }
    } catch (e) {
      console.error('Welcome email error:', e.message)
    }

    return json({ ok: true, verified: true })

  } catch (err) {
    console.error('Signup error:', err.message, err.stack)
    // SQLite UNIQUE constraint violation -> already on the list
    if (err.message && err.message.includes('UNIQUE')) {
      return json({ error: "You're already on the waitlist." }, 400)
    }
    return json({ error: 'Something went wrong. Try again in a moment.' }, 500)
  }
}
