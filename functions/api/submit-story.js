/**
 * POST /api/submit-story — save a milestone story for an existing user
 * Uses the votes Supabase project. Filters inappropriate content.
 */

import { json } from './_shared.js'

const BAD_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'dick', 'cock', 'pussy',
  'cunt', 'fag', 'nigger', 'nigga', 'retard', 'slut', 'whore', 'porn',
  'sex', 'kill', 'die', 'rape', 'nazi', 'hitler', 'terrorist', 'bomb',
  'drugs', 'weed', 'cocaine', 'heroin', 'meth',
]

function containsBadWords(text) {
  const lower = text.toLowerCase()
  return BAD_WORDS.some(w => {
    const regex = new RegExp(`\\b${w}\\b`, 'i')
    return regex.test(lower)
  })
}

export async function onRequestPost(context) {
  const { env } = context
  const url = env.SUPABASE_VOTES_URL || env.VOTES_URL || env.SUPABASE_URL
  const key = env.SUPABASE_VOTES_KEY || env.VOTES_KEY || env.SUPABASE_KEY

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request' }, 400) }

  const { email, first_name, story } = body || {}
  if (!email || !story) return json({ error: 'Missing email or story' }, 400)

  // Content moderation
  if (containsBadWords(story) || containsBadWords(first_name || '')) {
    return json({ error: 'Please keep your submission appropriate.' }, 400)
  }

  try {
    // Check if they already submitted a story
    const existing = await fetch(
      `${url}/rest/v1/milestone_stories?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
      { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
    )
    const existingData = await existing.json().catch(() => [])
    if (Array.isArray(existingData) && existingData.length > 0) {
      return json({ ok: true, already_submitted: true })
    }

    // Insert story
    const resp = await fetch(`${url}/rest/v1/milestone_stories`, {
      method: 'POST',
      headers: {
        'apikey': key, 'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json', 'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        first_name: (first_name || 'Anonymous').trim(),
        story: story.trim().slice(0, 500),
      }),
    })

    if (resp.status >= 400) {
      return json({ error: 'Could not save story' }, 500)
    }

    return json({ ok: true })
  } catch (err) {
    return json({ error: 'Could not save story', message: err.message }, 500)
  }
}
