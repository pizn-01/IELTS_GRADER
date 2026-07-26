import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider, useAuth } from './context/AuthContext'
import App from './App.jsx'
import './index.css'

/**
 * Fires after auth bootstrap + meaningful DOM content so Puppeteer
 * snapshots real page HTML (not the empty shell or auth spinner).
 */
function PrerenderSignal() {
  const { isLoading } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (isLoading) return undefined

    let cancelled = false
    let intervalId = 0
    document.documentElement.dataset.prerenderReady = '0'

    const ready = () => {
      const root = document.getElementById('root')
      const text = root?.innerText?.replace(/\s+/g, ' ').trim() || ''
      const spinningOnly = Boolean(root?.querySelector('.animate-spin')) && text.length < 40
      return text.length > 80 && !spinningOnly
    }

    const fire = () => {
      if (cancelled) return
      document.documentElement.dataset.prerenderReady = '1'
      document.dispatchEvent(new Event('render-event'))
    }

    if (ready()) {
      const t = window.setTimeout(fire, 50)
      return () => {
        cancelled = true
        window.clearTimeout(t)
      }
    }

    intervalId = window.setInterval(() => {
      if (ready()) {
        window.clearInterval(intervalId)
        window.setTimeout(fire, 50)
      }
    }, 50)

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId)
      fire()
    }, 10000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [isLoading, location.pathname])

  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <PrerenderSignal />
          <App />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
