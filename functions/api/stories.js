/**
 * GET /api/stories — fetch submitted milestone stories
 * Uses the votes Supabase project where milestone_stories table lives
 */

import { json } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  const url = env.SUPABASE_VOTES_URL || env.VOTES_URL || env.SUPABASE_URL
  const key = env.SUPABASE_VOTES_KEY || env.VOTES_KEY || env.SUPABASE_KEY

  try {
    const resp = await fetch(
      `${url}/rest/v1/milestone_stories?select=first_name,story&order=created_at.desc&limit=20`,
      { headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' } }
    )

    const data = await resp.json().catch(() => [])

    if (!Array.isArray(data)) {
      return json({ stories: [], count: 0 })
    }

    const stories = data
      .filter(s => s.story && s.story.trim().length > 0)
      .map(s => ({
        name: s.first_name.split(' ')[0],
        story: s.story.trim(),
      }))

    return json({ stories, count: stories.length })
  } catch (err) {
    return json({ error: 'Could not fetch stories', message: err.message }, 500)
  }
}
