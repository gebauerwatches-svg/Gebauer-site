import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './palette.css'
import './index.css'
import App from './App.jsx'
import Vote from './Vote.jsx'
import Privacy from './Privacy.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', color: '#ff4444', background: '#1a1128', minHeight: '100vh' }}>
          <h1 style={{ color: '#D4A62A', marginBottom: '16px' }}>Something broke</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', opacity: 0.6, marginTop: '12px' }}>{this.state.error.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

// Simple path-based routing (no react-router needed)
const path = window.location.pathname
// /blog route removed Aug 1 2026. Nothing linked to it, it was not in the
// sitemap, and it carried six posts written by blog_agent under Liam's
// byline. Substack is the publication. Removing the route also drops
// posts.js and Blog.jsx out of the bundle entirely, so the text stops
// shipping to every visitor. Both files stay in the repo.
const isVote = path === '/vote' || path.startsWith('/vote/')
const isPrivacy = path === '/privacy' || path.startsWith('/privacy/')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {isPrivacy ? <Privacy /> : isVote ? <Vote /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
