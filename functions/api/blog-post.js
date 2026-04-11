/**
 * GET /api/blog-post?slug=...
 *
 * Returns a single published blog post by slug, including full content.
 */

import { json, supabaseQuery } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  const url = new URL(context.request.url)
  const slug = url.searchParams.get('slug')

  if (!slug) return json({ error: 'Slug is required.' }, 400)
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return json({ error: 'Server configuration error.' }, 500)

  try {
    const resp = await supabaseQuery(env,
      `blog_posts?select=id,title,slug,content,excerpt,author,created_at&slug=eq.${encodeURIComponent(slug)}&published=eq.true`
    )

    if (!resp.data || resp.data.length === 0) {
      return json({ error: 'Post not found.' }, 404)
    }

    return json({ post: resp.data[0] })
  } catch (err) {
    console.error('Blog post error:', err.message)
    return json({ error: 'Something went wrong.' }, 500)
  }
}
