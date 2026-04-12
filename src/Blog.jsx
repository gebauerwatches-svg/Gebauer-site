import { useState } from 'react'
import logo from './assets/gebauer-logo.svg'
import posts from './posts.js'
import './Blog.css'

export default function Blog() {
  const [subEmail, setSubEmail] = useState('')
  const [subStatus, setSubStatus] = useState('')
  const [subLoading, setSubLoading] = useState(false)

  // Check URL for slug
  const slug = window.location.pathname.replace('/blog/', '').replace('/blog', '')
  const activePost = slug ? posts.find(p => p.slug === slug) : null

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!subEmail) return
    setSubLoading(true)
    // Save to localStorage since Supabase blog table isn't working yet
    const subs = JSON.parse(localStorage.getItem('gebauer_blog_subs') || '[]')
    if (subs.includes(subEmail.toLowerCase())) {
      setSubStatus("You're already subscribed.")
    } else {
      subs.push(subEmail.toLowerCase())
      localStorage.setItem('gebauer_blog_subs', JSON.stringify(subs))
      setSubStatus('Subscribed. You\'ll hear from Liam.')
      setSubEmail('')
    }
    setSubLoading(false)
  }

  // Single post view
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
        <div className="blog-subscribe">
          <h3>Want Liam's posts in your inbox?</h3>
          <form className="blog-subscribe-form" onSubmit={handleSubscribe}>
            <input type="email" placeholder="Your email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} required />
            <button type="submit" disabled={subLoading}>{subLoading ? '...' : 'Subscribe'}</button>
          </form>
          {subStatus && <p className="blog-subscribe-status">{subStatus}</p>}
        </div>
        <footer className="blog-footer"><a href="/">gebauerwatches.com</a></footer>
      </div>
    )
  }

  // 404 if slug doesn't match
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

  // Post list view
  return (
    <div className="blog">
      <header className="blog-header">
        <a href="/" className="blog-home-link"><img src={logo} alt="Gebauer" className="blog-logo" /></a>
      </header>
      <div className="blog-list-header">
        <h1 className="blog-title">From the Workshop</h1>
        <p className="blog-subtitle">Behind the scenes. Updates. The story as it happens.</p>
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
      <div className="blog-subscribe">
        <h3>Want Liam's posts in your inbox?</h3>
        <form className="blog-subscribe-form" onSubmit={handleSubscribe}>
          <input type="email" placeholder="Your email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} required />
          <button type="submit" disabled={subLoading}>{subLoading ? '...' : 'Subscribe'}</button>
        </form>
        {subStatus && <p className="blog-subscribe-status">{subStatus}</p>}
      </div>
      <footer className="blog-footer"><a href="/">gebauerwatches.com</a></footer>
    </div>
  )
}
