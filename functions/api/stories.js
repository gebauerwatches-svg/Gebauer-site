/**
 * GET /api/stories — fetch recent submitted milestone stories
 * Returns first names and stories only. No emails.
 */

import { json, supabaseQuery } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context

  try {
    const resp = await supabaseQuery(env,
      `waitlist_signups?select=first_name,milestone_story&milestone_story=not.is.null&milestone_story=neq.&order=created_at.desc&limit=20`
    )

    if (!resp.data || !Array.isArray(resp.data)) {
      return json({ stories: [], count: 0 })
    }

    const stories = resp.data
      .filter(s => s.milestone_story && s.milestone_story.trim().length > 0)
      .map(s => ({
        name: s.first_name.split(' ')[0], // first name only
        story: s.milestone_story.trim(),
      }))

    return json({ stories, count: stories.length })
  } catch (err) {
    return json({ error: 'Could not fetch stories', message: err.message }, 500)
  }
}
