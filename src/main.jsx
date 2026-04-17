import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './palette.css'
import './index.css'
import App from './App.jsx'
import Blog from './Blog.jsx'
import Vote from './Vote.jsx'

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
const isBlog = path.startsWith('/blog')
const isVote = path.startsWith('/vote')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {isVote ? <Vote /> : isBlog ? <Blog /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
