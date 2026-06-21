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
 * Optional (for milestone story write to the votes Supabase project):
 *   SUPABASE_VOTES_URL, SUPABASE_VOTES_KEY  - already exist for the polls/stories system
 */

import { json, randomHex } from './_shared.js'


// Save the milestone story to the votes Supabase project (separate, untouched).
async function saveMilestoneStory(env, email, firstName, story) {
  const url = env.SUPABASE_VOTES_URL || env.VOTES_URL
  const key = env.SUPABASE_VOTES_KEY || env.VOTES_KEY
  if (!url || !key) return

  const badWords = ['fuck','shit','bitch','damn','dick','cock','pussy','cunt','fag','nigger','nigga','retard','slut','whore','porn','rape','nazi','hitler','terrorist','bomb']
  const lower = story.toLowerCase()
  if (badWords.some(w => new RegExp(`\\b${w}\\b`, 'i').test(lower))) return

  await fetch(`${url}/rest/v1/milestone_stories`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      email,
      first_name: firstName,
      story: story.slice(0, 500),
      status: 'approved',
    }),
  })
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

    // Milestone story still saves to the votes Supabase project (independent system).
    if (milestone_story && milestone_story.trim()) {
      try { await saveMilestoneStory(env, cleanEmail, cleanName, milestone_story.trim()) } catch (e) { console.error('Story save failed:', e.message) }
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
