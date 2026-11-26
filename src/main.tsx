import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import PasswordGate from './components/PasswordGate'
import { CategoriesProvider } from './store/useCategories'
import './styles.css'

function Root() {
  const [unlocked, setUnlocked] = useState(false)

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  return (
    <div className="unlocked-app">
      <HashRouter>
        <CategoriesProvider>
          <App />
        </CategoriesProvider>
      </HashRouter>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI).toString()).catch(() => undefined)
  })
} else if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister()))
}
