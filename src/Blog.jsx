import { useState, useEffect } from 'react'
import logo from './assets/gebauer-logo.svg'
import './Blog.css'

export default function Blog() {
  const [posts, setPosts] = useState([])
  const [activePost, setActivePost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subEmail, setSubEmail] = useState('')
  const [subStatus, setSubStatus] = useState('')
  const [subLoading, setSubLoading] = useState(false)

  // Check URL for slug
  const slug = window.location.pathname.replace('/blog/', '').replace('/blog', '')

  useEffect(() => {
    if (slug && slug !== '' && slug !== '/') {
      // Fetch single post
      fetch(`/api/blog-post?slug=${encodeURIComponent(slug)}`)
        .then(r => r.json())
        .then(data => {
          if (data.post) setActivePost(data.post)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      // Fetch all posts
      fetch('/api/blog')
        .then(r => {
          const ct = r.headers.get('content-type') || ''
          if (!ct.includes('application/json')) throw new Error('Not JSON')
          return r.json()
        })
        .then(data => {
          if (data.posts && Array.isArray(data.posts)) setPosts(data.posts)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [slug])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!subEmail) return
    setSubLoading(true)
    setSubStatus('')
    try {
      const resp = await fetch('/api/blog-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subEmail }),
      })
      const data = await resp.json()
      setSubStatus(data.message || data.error || 'Done.')
      if (data.ok) setSubEmail('')
    } catch { setSubStatus('Something went wrong.') }
    finally { setSubLoading(false) }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Single post view
  if (activePost) {
    return (
      <div className="blog">
        <header className="blog-header">
          <a href="/" className="blog-home-link">
            <img src={logo} alt="Gebauer" className="blog-logo" />
          </a>
          <a href="/blog" className="blog-back">All Posts</a>
        </header>

        <article className="blog-article">
          <p className="blog-article-date">{formatDate(activePost.created_at)}</p>
          <h1 className="blog-article-title">{activePost.title}</h1>
          <p className="blog-article-author">by {activePost.author}</p>
          <div className="blog-article-content" dangerouslySetInnerHTML={{ __html: activePost.content.replace(/\n/g, '<br/>') }} />
        </article>

        <div className="blog-subscribe">
          <h3>Want Liam's posts in your inbox?</h3>
          <form className="blog-subscribe-form" onSubmit={handleSubscribe}>
            <input type="email" placeholder="Your email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} required />
            <button type="submit" disabled={subLoading}>{subLoading ? '...' : 'Subscribe'}</button>
          </form>
          {subStatus && <p className="blog-subscribe-status">{subStatus}</p>}
        </div>

        <footer className="blog-footer">
          <a href="/">gebauerwatches.com</a>
        </footer>
      </div>
    )
  }

  // Post list view
  return (
    <div className="blog">
      <header className="blog-header">
        <a href="/" className="blog-home-link">
          <img src={logo} alt="Gebauer" className="blog-logo" />
        </a>
      </header>

      <div className="blog-list-header">
        <h1 className="blog-title">From the Workshop</h1>
        <p className="blog-subtitle">Behind the scenes. Updates. The story as it happens.</p>
      </div>

      {loading ? (
        <p className="blog-loading">Loading...</p>
      ) : posts.length === 0 ? (
        <div className="blog-empty">
          <p>No posts yet. First one coming soon.</p>
          <a href="/" className="blog-empty-link">Back to Gebauer</a>
        </div>
      ) : (
        <div className="blog-list">
          {posts.map(post => (
            <a key={post.id} href={`/blog/${post.slug}`} className="blog-card">
              <span className="blog-card-date">{formatDate(post.created_at)}</span>
              <h2 className="blog-card-title">{post.title}</h2>
              {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
              <span className="blog-card-read">Read</span>
            </a>
          ))}
        </div>
      )}

      <div className="blog-subscribe">
        <h3>Want Liam's posts in your inbox?</h3>
        <form className="blog-subscribe-form" onSubmit={handleSubscribe}>
          <input type="email" placeholder="Your email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} required />
          <button type="submit" disabled={subLoading}>{subLoading ? '...' : 'Subscribe'}</button>
        </form>
        {subStatus && <p className="blog-subscribe-status">{subStatus}</p>}
      </div>

      <footer className="blog-footer">
        <a href="/">gebauerwatches.com</a>
      </footer>
    </div>
  )
}
