/**
 * POST /api/signup
 *
 * Cloudflare Pages Function.
 * Phase 1 migration (June 13 2026): writes signups directly to MailerLite.
 * No more Supabase dependency for the waitlist.
 *
 * Environment variables (set in Cloudflare Pages dashboard):
 *   MAILERLITE_API_KEY  — already exists
 *   WAITLIST_GROUP_ID   — MUST be added (MailerLite group ID for "Gebauer Waitlist")
 *
 * Optional (for milestone story write to the votes Supabase project):
 *   SUPABASE_VOTES_URL, SUPABASE_VOTES_KEY  — already exist for the polls/stories system
 */

import { json, randomHex } from './_shared.js'

const ML_BASE = 'https://connect.mailerlite.com/api'

function mlHeaders(key) {
  return {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

// Look up a MailerLite subscriber by email. Returns null if not found.
async function findSubscriber(key, email) {
  const resp = await fetch(`${ML_BASE}/subscribers/${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: mlHeaders(key),
  })
  if (resp.status === 404) return null
  if (!resp.ok) return null
  const body = await resp.json().catch(() => null)
  return body?.data || null
}

// Create or upsert a MailerLite subscriber with our custom fields.
async function upsertSubscriber(key, payload) {
  const resp = await fetch(`${ML_BASE}/subscribers`, {
    method: 'POST',
    headers: mlHeaders(key),
    body: JSON.stringify(payload),
  })
  return { status: resp.status, data: await resp.json().catch(() => null) }
}

// Assign a subscriber to a MailerLite group.
async function assignToGroup(key, subscriberId, groupId) {
  await fetch(`${ML_BASE}/subscribers/${subscriberId}/groups/${groupId}`, {
    method: 'POST',
    headers: mlHeaders(key),
  })
}

// Increment the referrer's referral_count by 1.
async function creditReferrer(key, referralCode) {
  // Find the subscriber whose referral_code custom field matches.
  // MailerLite doesn't expose a search-by-custom-field endpoint cleanly,
  // so we use the filter param on the subscribers list.
  const search = await fetch(
    `${ML_BASE}/subscribers?filter[search]=${encodeURIComponent(referralCode)}&limit=10`,
    { method: 'GET', headers: mlHeaders(key) },
  )
  if (!search.ok) return
  const body = await search.json().catch(() => null)
  const matches = (body?.data || []).filter(
    s => s.fields?.referral_code === referralCode
  )
  if (matches.length === 0) return

  const referrer = matches[0]
  const currentCount = parseInt(referrer.fields?.referral_count || 0, 10)
  await fetch(`${ML_BASE}/subscribers/${referrer.id}`, {
    method: 'PUT',
    headers: mlHeaders(key),
    body: JSON.stringify({
      fields: { referral_count: currentCount + 1 },
    }),
  })
}

// Save the milestone story to the votes Supabase project (separate from waitlist).
async function saveMilestoneStory(env, email, firstName, story) {
  const url = env.SUPABASE_VOTES_URL || env.VOTES_URL
  const key = env.SUPABASE_VOTES_KEY || env.VOTES_KEY
  if (!url || !key) return

  // Cheap profanity guard. Same list as before.
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

  if (!env.MAILERLITE_API_KEY || !env.WAITLIST_GROUP_ID) {
    // Diagnostic — strip after debugging.
    const mlType = typeof env.MAILERLITE_API_KEY
    const mlLen = env.MAILERLITE_API_KEY ? env.MAILERLITE_API_KEY.length : 0
    const grpType = typeof env.WAITLIST_GROUP_ID
    const grpLen = env.WAITLIST_GROUP_ID ? env.WAITLIST_GROUP_ID.length : 0
    return json({
      error: 'Server configuration error.',
      diag: {
        MAILERLITE_API_KEY: { type: mlType, length: mlLen },
        WAITLIST_GROUP_ID:  { type: grpType, length: grpLen },
      }
    }, 500)
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

  const mlKey = env.MAILERLITE_API_KEY
  const groupId = env.WAITLIST_GROUP_ID

  try {
    // Already on the waitlist?
    const existing = await findSubscriber(mlKey, cleanEmail)
    if (existing) {
      return json({ error: "You're already on the waitlist." }, 400)
    }

    // Generate the referral code in the same format the old function used.
    const referralCode = cleanName.split(' ')[0].toUpperCase().slice(0, 6) + '-' + randomHex(3).toUpperCase()

    // Create the subscriber in MailerLite with custom fields.
    const upsertPayload = {
      email: cleanEmail,
      fields: {
        name: cleanName,
        referral_code: referralCode,
        referral_count: 0,
        waitlist_position: 9999,
        referred_by: referred_by || '',
      },
      status: 'active',
    }
    const result = await upsertSubscriber(mlKey, upsertPayload)
    if (result.status >= 400) {
      console.error('MailerLite upsert error:', JSON.stringify(result.data))
      return json({ error: 'Could not save your signup. Try again in a moment.' }, 500)
    }

    const subscriberId = result.data?.data?.id
    if (subscriberId) {
      await assignToGroup(mlKey, subscriberId, groupId)
    }

    // Credit the referrer if there was one.
    if (referred_by) {
      try { await creditReferrer(mlKey, referred_by) } catch (e) { console.error('Referrer credit failed:', e.message) }
    }

    // Save milestone story (still in the votes Supabase project — independent system).
    if (milestone_story && milestone_story.trim()) {
      try { await saveMilestoneStory(env, cleanEmail, cleanName, milestone_story.trim()) } catch (e) { console.error('Story save failed:', e.message) }
    }

    return json({ ok: true, verified: true })

  } catch (err) {
    console.error('Signup error:', err.message, err.stack)
    return json({ error: 'Something went wrong. Try again in a moment.' }, 500)
  }
}
