import { useState } from 'react'
import styles from './Auth.module.css'

export default function Auth({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const submit = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    const fn = mode === 'signin' ? onSignIn : onSignUp
    const { error } = await fn(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else if (mode === 'signup') {
      setSuccess('Check your email to confirm your account.')
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.eyebrow}>Real Estate Pricing</div>
          <h1 className={styles.title}>Comp Analysis</h1>
        </div>

        <div className={styles.modeTabs}>
          <button
            className={`${styles.modeTab} ${mode === 'signin' ? styles.modeActive : ''}`}
            onClick={() => { setMode('signin'); setError(''); setSuccess('') }}
          >
            Sign In
          </button>
          <button
            className={`${styles.modeTab} ${mode === 'signup' ? styles.modeActive : ''}`}
            onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
          >
            Create Account
          </button>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.successMsg}>{success}</div>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className={styles.note}>
          Your comp pools are private and tied to your account.
        </p>
      </div>
    </div>
  )
}
