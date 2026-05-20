/**
 * GET /api/check-story?email=... — check if a user has submitted a milestone story
 */

import { json } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  const url = env.SUPABASE_VOTES_URL || env.VOTES_URL || env.SUPABASE_URL
  const key = env.SUPABASE_VOTES_KEY || env.VOTES_KEY || env.SUPABASE_KEY

  const email = new URL(context.request.url).searchParams.get('email')
  if (!email) return json({ has_story: false })

  try {
    const resp = await fetch(
      `${url}/rest/v1/milestone_stories?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&select=id,story&order=created_at.desc&limit=1`,
      { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
    )
    const data = await resp.json().catch(() => [])
    const has = Array.isArray(data) && data.length > 0
    return json({ has_story: has, story: has ? data[0].story : '' })
  } catch {
    return json({ has_story: false, story: '' })
  }
}
