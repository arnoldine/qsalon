import { useState } from 'react'
import { BadgeCheck, BarChart2, CalendarCheck, Loader2, Lock, Star, User, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { QuickSalonLogo } from '../components/QuickSalonLogo'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function LoginPage() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('Admin@123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      showToast('Signed in successfully.', 'success')
      navigate('/')
    } catch {
      setError('Invalid credentials')
      showToast('Invalid credentials.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-left-panel">
        <div className="login-promo-content">
          <header className="login-brand">
            <QuickSalonLogo size={56} />
            <div>
              <h1>QuickSalon</h1>
              <p>Smart Salon Management</p>
            </div>
          </header>

          <div className="hero-image-wrap">
            <img
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&auto=format&fit=crop"
              alt="Modern salon interior"
              className="hero-image"
            />
            <div className="stats-chip">
              <BadgeCheck size={14} className="stats-chip-icon" />
              Trusted by 10,000+ salons worldwide
            </div>
            <article className="testimonial-card">
              <div className="testimonial-header">
                <div className="avatar-circle">S.M.</div>
                <span className="stars" aria-label="Five star rating">
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                </span>
              </div>
              <p>Bookings are up 40% since switching to QuickSalon</p>
              <strong>Sarah M. - Glow Studio, Austin TX</strong>
            </article>
          </div>

          <ul className="feature-list">
            <li style={{ animationDelay: '80ms' }}>
              <CalendarCheck size={18} />
              <div>
                <strong>Book & manage appointments in seconds</strong>
                <small>Drag, schedule, and remind clients effortlessly.</small>
              </div>
            </li>
            <li style={{ animationDelay: '160ms' }}>
              <Users size={18} />
              <div>
                <strong>Full client & staff management</strong>
                <small>Profiles, loyalty, teams, and role access in one place.</small>
              </div>
            </li>
            <li style={{ animationDelay: '240ms' }}>
              <BarChart2 size={18} />
              <div>
                <strong>Real-time revenue & inventory insights</strong>
                <small>See what sells, what trends, and what to reorder now.</small>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="login-right-panel">
        <form className="login-card" onSubmit={onSubmit}>
          <h2>Welcome back</h2>
          <p>Sign in to your salon dashboard</p>

          <label className="login-field">
            <User size={17} />
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
          </label>

          <label className="login-field">
            <Lock size={17} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
          </label>

          {error ? <div className="error">{error}</div> : null}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? <Loader2 size={18} className="spinning" /> : 'SIGN IN'}
          </button>

          <a href="#" className="forgot-link">Forgot password?</a>
          <footer className="login-footer">QuickSalon © 2026 · All rights reserved</footer>
        </form>
      </section>
    </div>
  )
}
