import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PASSWORD_SHA256 } from '../config'

type PasswordGateProps = {
  onUnlock: () => void
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export default function PasswordGate({ onUnlock }: PasswordGateProps) {
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [exiting, setExiting] = useState(false)
  const cardRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const timersRef = useRef<number[]>([])

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const rejectPassword = (message: string) => {
    setError(message)
    setPassword('')
    navigator.vibrate?.([30, 40, 30])

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cardRef.current?.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)', offset: .2 },
        { transform: 'translateX(10px)', offset: .4 },
        { transform: 'translateX(-10px)', offset: .6 },
        { transform: 'translateX(10px)', offset: .8 },
        { transform: 'translateX(0)' },
      ], { duration: 450, easing: 'ease-out' })
    }

    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return
    if (!password) {
      rejectPassword('Enter the password first.')
      return
    }

    submittingRef.current = true
    try {
      if (await sha256(password) !== PASSWORD_SHA256) {
        rejectPassword('Wrong password. Try again.')
        submittingRef.current = false
        return
      }

      setError('')
      setUnlocking(true)
      inputRef.current?.blur()
      navigator.vibrate?.(20)
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      timersRef.current.push(window.setTimeout(() => setExiting(true), reducedMotion ? 0 : 650))
      timersRef.current.push(window.setTimeout(onUnlock, reducedMotion ? 180 : 1100))
    } catch {
      rejectPassword('Unable to verify the password. Try again.')
      submittingRef.current = false
    }
  }

  return (
    <main className="password-gate">
      <div className="gate-blob gate-blob-violet" aria-hidden="true" />
      <div className="gate-blob gate-blob-pink" aria-hidden="true" />
      <div className="gate-blob gate-blob-sky" aria-hidden="true" />

      <form
        ref={cardRef}
        className={`password-card ${error ? 'has-error' : ''} ${unlocking ? 'is-unlocked' : ''} ${exiting ? 'is-exiting' : ''}`}
        onSubmit={submit}
        autoComplete="off"
        noValidate
      >
        <div className="password-badge" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4.5" y="11" width="15" height="10" rx="3" fill="currentColor" stroke="none" />
            <path className="password-shackle" d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </div>

        <h1>Enter password</h1>
        <p className="password-lead">This app is private. Type the password to continue.</p>

        <div className="password-field-group">
          <label htmlFor="app-password">Password</label>
          <div className="password-field">
            <input
              ref={inputRef}
              id="app-password"
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              enterKeyHint="go"
              autoFocus
              value={password}
              disabled={unlocking}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'password-error' : undefined}
              onChange={(event) => {
                setPassword(event.target.value)
                if (error) setError('')
              }}
            />
            <button
              className="password-toggle"
              type="button"
              aria-pressed={visible}
              onClick={() => setVisible((current) => !current)}
              disabled={unlocking}
            >
              {visible ? 'Hide' : 'Show'}
            </button>
          </div>
          {error && <div id="password-error" className="password-error" role="alert">{error}</div>}
        </div>

        <button className="password-submit" type="submit" disabled={unlocking}>
          {unlocking ? 'Unlocked' : 'Unlock'}
        </button>
        <p className="password-note">Ask the owner if you don’t have it.</p>
      </form>
    </main>
  )
}
