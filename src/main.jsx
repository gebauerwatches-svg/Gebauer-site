import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './palette.css'
import './index.css'
import App from './App.jsx'

// Error boundary so the page shows the error instead of going blank
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
