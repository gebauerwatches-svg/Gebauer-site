/**
 * GET /api/journal
 *
 * Returns the latest posts from Liam's Substack (gebauerwatches.substack.com).
 * Fetches the RSS feed, parses it, returns JSON. Cached at the edge for 1 hour
 * so we don't hammer Substack on every page load.
 *
 * Response shape:
 *   { posts: [{ title, url, published_at, snippet }] }
 */

import { json } from './_shared.js'

const RSS_URL = 'https://gebauerwatches.substack.com/feed'
const CACHE_TTL_SECONDS = 3600  // 1 hour

function decodeEntities(s) {
  return String(s || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function pick(xml, tag) {
  // Match <tag>...</tag> or <tag><![CDATA[...]]></tag>
  const re = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i')
  const m = xml.match(re)
  return m ? m[1].trim() : ''
}

function parseFeed(xml, limit = 3) {
  // Split into items, parse each
  const items = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRe.exec(xml)) !== null && items.length < limit) {
    const itemXml = match[1]
    const title = decodeEntities(pick(itemXml, 'title'))
    const url = pick(itemXml, 'link')
    const pubDate = pick(itemXml, 'pubDate')
    // Description has HTML body. Strip + truncate.
    const description = decodeEntities(pick(itemXml, 'description'))
    const snippet = stripHtml(description).slice(0, 180)

    if (title && url) {
      items.push({
        title,
        url,
        published_at: pubDate,
        snippet,
      })
    }
  }
  return items
}

export async function onRequestGet(context) {
  try {
    const resp = await fetch(RSS_URL, {
      cf: {
        // Cloudflare edge cache. 1 hour TTL.
        cacheTtl: CACHE_TTL_SECONDS,
        cacheEverything: true,
      },
      headers: {
        // Substack expects a real user agent on RSS requests sometimes
        'User-Agent': 'Mozilla/5.0 (gebauerwatches.com journal feed)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    })

    if (!resp.ok) {
      console.error('Substack RSS fetch failed:', resp.status)
      return json({ posts: [], error: 'Could not load journal posts.' }, 200)
    }

    const xml = await resp.text()
    const posts = parseFeed(xml, 3)

    return json(
      { posts },
      200,
      { 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` }
    )
  } catch (err) {
    console.error('journal error:', err.message)
    return json({ posts: [], error: 'Could not load journal posts.' }, 200)
  }
}
