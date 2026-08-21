/**
 * POST /api/submit-story - save a milestone story for an existing user
 *
 * Phase 4 migration (June 21 2026): writes to D1 community_stories.
 * Filters inappropriate content before insert.
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
  return BAD_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(lower))
}

export async function onRequestPost(context) {
  const { env } = context
  if (!env.DB) return json({ error: 'Server configuration error.' }, 500)

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request' }, 400) }

  const { email, first_name, story } = body || {}
  if (!email || !story) return json({ error: 'Missing email or story' }, 400)

  if (containsBadWords(story) || containsBadWords(first_name || '')) {
    return json({ error: 'Please keep your submission appropriate.' }, 400)
  }

  const cleanEmail = email.trim().toLowerCase()
  const cleanName = (first_name || 'Anonymous').trim()
  const cleanStory = story.trim().slice(0, 500)
  const now = new Date().toISOString()

  try {
    // Idempotent: if they already submitted, return ok with a flag
    const existing = await env.DB.prepare(
      'SELECT id FROM community_stories WHERE email = ? LIMIT 1'
    ).bind(cleanEmail).first()

    if (existing) {
      // Was: return ok and silently discard. The site optimistically shows the
      // new text either way, so someone editing their moment saw it appear and
      // then vanish on refresh. Changing your mind about the moment you would
      // relive is a reasonable thing to do, so this now updates it.
      await env.DB.prepare(
        'UPDATE community_stories SET story = ?, first_name = ?, created_at = ? WHERE id = ?'
      ).bind(cleanStory, cleanName, now, existing.id).run()
      return json({ ok: true, updated: true })
    }

    await env.DB.prepare(`
      INSERT INTO community_stories (email, first_name, story, status, created_at)
      VALUES (?, ?, ?, 'approved', ?)
    `).bind(cleanEmail, cleanName, cleanStory, now).run()

    return json({ ok: true })
  } catch (err) {
    console.error('submit-story error:', err.message)
    return json({ error: 'Could not save story', message: err.message }, 500)
  }
}
