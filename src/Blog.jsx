import { useState } from 'react'
import logo from './assets/gebauer-logo.svg'
import posts from './posts.js'
import './Blog.css'

function SubscribeBlock({ subDone, subEmail, setSubEmail, subLoading, handleSubscribe }) {
  if (subDone) {
    return (
      <div className="blog-subscribed">
        <h2>You're in.</h2>
        <p className="blog-subscribed-text">When Liam writes something new, you'll get it. Behind-the-scenes updates, design decisions, the story as it happens.</p>
        <div className="blog-subscribed-links">
          <a href="/blog" className="blog-subscribed-link">Back to the blog</a>
          <a href="/" className="blog-subscribed-link blog-subscribed-home">Go to Gebauer</a>
        </div>
      </div>
    )
  }

  return (
    <div className="blog-subscribe">
      <h3>Want Liam's posts in your inbox?</h3>
      <p className="blog-subscribe-desc">Behind-the-scenes updates, design decisions, and the Gebauer story as it happens. No spam.</p>
      <form className="blog-subscribe-form" onSubmit={handleSubscribe}>
        <input type="email" placeholder="Your email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} required />
        <button type="submit" disabled={subLoading}>{subLoading ? '...' : 'Subscribe'}</button>
      </form>
    </div>
  )
}

export default function Blog() {
  const [subEmail, setSubEmail] = useState('')
  const [subDone, setSubDone] = useState(false)
  const [subLoading, setSubLoading] = useState(false)

  const slug = window.location.pathname.replace('/blog/', '').replace('/blog', '')
  const activePost = slug ? posts.find(p => p.slug === slug) : null

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!subEmail) return
    setSubLoading(true)
    try {
      const resp = await fetch('/api/blog-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subEmail }),
      })
      const ct = resp.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        await resp.json()
      }
    } catch {}
    setSubDone(true)
    setSubLoading(false)
  }

  const subProps = { subDone, subEmail, setSubEmail, subLoading, handleSubscribe }

  // Single post
  if (activePost) {
    return (
      <div className="blog">
        <header className="blog-header">
          <a href="/" className="blog-home-link"><img src={logo} alt="Gebauer" className="blog-logo" /></a>
          <a href="/blog" className="blog-back">All Posts</a>
        </header>
        <article className="blog-article">
          <p className="blog-article-date">{activePost.date}</p>
          <h1 className="blog-article-title">{activePost.title}</h1>
          <p className="blog-article-author">by {activePost.author || 'Liam'}</p>
          <div className="blog-article-content">
            {activePost.content.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
          </div>
        </article>
        <SubscribeBlock {...subProps} />
        <footer className="blog-footer"><a href="/">gebauerwatches.com</a></footer>
      </div>
    )
  }

  // 404
  if (slug && slug !== '' && slug !== '/') {
    return (
      <div className="blog">
        <header className="blog-header">
          <a href="/" className="blog-home-link"><img src={logo} alt="Gebauer" className="blog-logo" /></a>
          <a href="/blog" className="blog-back">All Posts</a>
        </header>
        <div className="blog-empty"><p>Post not found.</p><a href="/blog" className="blog-empty-link">Back to all posts</a></div>
        <footer className="blog-footer"><a href="/">gebauerwatches.com</a></footer>
      </div>
    )
  }

  // Post list
  return (
    <div className="blog">
      <header className="blog-header">
        <a href="/" className="blog-home-link"><img src={logo} alt="Gebauer" className="blog-logo" /></a>
      </header>
      <div className="blog-list-header">
        <h1 className="blog-title">From Our Kitchen Table</h1>
        <p className="blog-subtitle">The story of building a watch brand from scratch. As it happens.</p>
      </div>
      {posts.length === 0 ? (
        <div className="blog-empty"><p>No posts yet. First one coming soon.</p><a href="/" className="blog-empty-link">Back to Gebauer</a></div>
      ) : (
        <div className="blog-list">
          {posts.map(post => (
            <a key={post.slug} href={`/blog/${post.slug}`} className="blog-card">
              <span className="blog-card-date">{post.date}</span>
              <h2 className="blog-card-title">{post.title}</h2>
              {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
              <span className="blog-card-read">Read</span>
            </a>
          ))}
        </div>
      )}
      <SubscribeBlock {...subProps} />
      <footer className="blog-footer"><a href="/">gebauerwatches.com</a></footer>
    </div>
  )
}
