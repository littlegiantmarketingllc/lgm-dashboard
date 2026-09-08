import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif', background: '#F4F6F4', padding: '2rem',
        }}>
          <div style={{
            background: '#fff', border: '1px solid #E5E7E5', borderRadius: '16px',
            padding: '2rem', maxWidth: '480px', width: '100%',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            borderTop: '3px solid #8CC63F',
          }}>
            <h2 style={{ color: '#4A4A4A', margin: '0 0 0.5rem' }}>Something went wrong</h2>
            <p style={{ color: '#6B7280', fontSize: '13px', margin: '0 0 1rem' }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#8CC63F', color: '#fff', border: 'none',
                borderRadius: '10px', padding: '0.6rem 1.5rem',
                fontWeight: '600', cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
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
