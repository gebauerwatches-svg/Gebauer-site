import { useState } from 'react'
import logo from './assets/gebauer-logo.svg'
import posts from './posts.js'
import './Blog.css'

const FREE_PREVIEW_COUNT = 2 // How many posts non-subscribers can see

function SubscribeGate({ subEmail, setSubEmail, subLoading, handleSubscribe }) {
  return (
    <div className="blog-gate">
      <div className="blog-gate-inner">
        <h2 className="blog-gate-title">There's more where that came from.</h2>
        <p className="blog-gate-text">
          Sign up to unlock the full archive, plus get every new post from Liam straight to your inbox. No spam. Just the story of a watch brand being built from a kitchen table.
        </p>
        <form className="blog-subscribe-form" onSubmit={handleSubscribe}>
          <input type="email" placeholder="Your email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} required />
          <button type="submit" disabled={subLoading}>{subLoading ? '...' : 'Join the Family'}</button>
        </form>
        <p className="blog-gate-count">{posts.length - FREE_PREVIEW_COUNT} more posts waiting for you.</p>
      </div>
    </div>
  )
}

function SubscribeBlock({ subDone, subEmail, setSubEmail, subLoading, handleSubscribe }) {
  if (subDone) {
    return (
      <div className="blog-subscribed">
        <h2>You're in.</h2>
        <p className="blog-subscribed-text">Every new post goes straight to your inbox. Plus you've got the full archive now.</p>
        <div className="blog-subscribed-links">
          <a href="/blog" className="blog-subscribed-link">See all posts</a>
          <a href="/" className="blog-subscribed-link blog-subscribed-home">Go to Gebauer</a>
        </div>
      </div>
    )
  }

  return (
    <div className="blog-subscribe">
      <h3>Get every post in your inbox.</h3>
      <p className="blog-subscribe-desc">New posts from Liam, straight to you. The story as it happens.</p>
      <form className="blog-subscribe-form" onSubmit={handleSubscribe}>
        <input type="email" placeholder="Your email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} required />
        <button type="submit" disabled={subLoading}>{subLoading ? '...' : 'Subscribe'}</button>
      </form>
    </div>
  )
}

export default function Blog() {
  const [subEmail, setSubEmail] = useState('')
  const [subDone, setSubDone] = useState(() => localStorage.getItem('gebauer_blog_sub') === 'true')
  const [subLoading, setSubLoading] = useState(false)

  const slug = window.location.pathname.replace('/blog/', '').replace('/blog', '')
  const activePost = slug ? posts.find(p => p.slug === slug) : null

  // Check if this post is behind the gate
  const postIndex = activePost ? posts.indexOf(activePost) : -1
  const isGated = activePost && postIndex >= FREE_PREVIEW_COUNT && !subDone

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
    localStorage.setItem('gebauer_blog_sub', 'true')
    setSubDone(true)
    setSubLoading(false)
  }

  const subProps = { subDone, subEmail, setSubEmail, subLoading, handleSubscribe }

  // Gated post: show excerpt then subscribe wall
  if (isGated) {
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
          <div className="blog-article-content blog-article-fade">
            {activePost.content.split('\n\n').slice(0, 2).map((para, i) => <p key={i}>{para}</p>)}
          </div>
        </article>
        <SubscribeGate subEmail={subEmail} setSubEmail={setSubEmail} subLoading={subLoading} handleSubscribe={handleSubscribe} />
        <footer className="blog-footer"><a href="/">gebauerwatches.com</a></footer>
      </div>
    )
  }

  // Full single post (either free or subscriber)
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
  const visiblePosts = subDone ? posts : posts.slice(0, FREE_PREVIEW_COUNT)
  const lockedCount = posts.length - FREE_PREVIEW_COUNT

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
        <>
          <div className="blog-list">
            {visiblePosts.map(post => (
              <a key={post.slug} href={`/blog/${post.slug}`} className="blog-card">
                <span className="blog-card-date">{post.date}</span>
                <h2 className="blog-card-title">{post.title}</h2>
                {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
                <span className="blog-card-read">Read</span>
              </a>
            ))}
          </div>
          {!subDone && lockedCount > 0 && (
            <>
              <div className="blog-locked-preview">
                {posts.slice(FREE_PREVIEW_COUNT).map(post => (
                  <div key={post.slug} className="blog-card-locked">
                    <h2 className="blog-card-title">{post.title}</h2>
                    <span className="blog-card-locked-label">Members only</span>
                  </div>
                ))}
              </div>
              <SubscribeGate subEmail={subEmail} setSubEmail={setSubEmail} subLoading={subLoading} handleSubscribe={handleSubscribe} />
            </>
          )}
        </>
      )}
      {subDone && <SubscribeBlock {...subProps} />}
      <footer className="blog-footer"><a href="/">gebauerwatches.com</a></footer>
    </div>
  )
}
