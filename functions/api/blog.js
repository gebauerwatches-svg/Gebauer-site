/**
 * GET /api/blog
 *
 * Cloudflare Pages Function.
 * Returns all published blog posts ordered by created_at descending.
 */

import { json, supabaseQuery } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context

  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return json({ error: 'Server configuration error.' }, 500)

  try {
    const resp = await supabaseQuery(env,
      `blog_posts?select=id,title,slug,excerpt,author,created_at&published=eq.true&order=created_at.desc`
    )

    return json({ posts: resp.data || [] })
  } catch (err) {
    console.error('Blog error:', err.message)
    return json({ error: 'Something went wrong.' }, 500)
  }
}
