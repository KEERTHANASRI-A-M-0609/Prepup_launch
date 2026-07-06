import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../store/AppContext'
import type { UserProfile } from '../types'
import { saveAccount, findAccount, hashPw } from '../services/authStore'
import { storePendingPassword, loginMongo, registerMongo } from '../services/mongoSync'
import { ArrowRight, Eye, EyeOff, ChevronLeft } from 'lucide-react'
import PrepUpLogo from '../components/brand/PrepUpLogo'

type Mode = 'login' | 'register'

export default function Auth() {
  const { setView, setUser, resetAssessmentNudge } = useApp()
  const [mode, setMode] = useState<Mode>('login')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginNameHint, setLoginNameHint] = useState('')
  const [success, setSuccess] = useState('')

  const set = (k: keyof typeof form, v: string) => { setForm(f => ({ ...f, [k]: v })); setError(''); setSuccess('') }
  const switchMode = (m: Mode) => {
    setMode(m); setError(''); setSuccess(''); setLoginNameHint('')
    setForm({ name: '', email: '', phone: '', password: '' })
  }

  const checkEmailForLogin = (email: string) => {
    const account = findAccount(email)
    setLoginNameHint(account?.name ?? '')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = form.email.trim().toLowerCase()
    const name  = form.name.trim()
    const pw    = form.password
    const phone = form.phone.trim()

    if (!email || !pw) { setError('Please fill in all fields.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return }
    if (pw.length < 6) { setError('Password must be at least 6 characters.'); return }

    if (mode === 'register') {
      if (!name) { setError('Please enter your full name.'); return }
      if (findAccount(email)) { setError('An account with this email already exists. Sign in instead.'); return }
    } else {
      if (!findAccount(email)) {
        setError('No account found. Please create an account first.')
        return
      }
    }

    setLoading(true)
    await new Promise(r => setTimeout(r, 300))

    try {
      if (mode === 'register') {
        const profile: UserProfile = {
          name, email, phone,
          college: '', branch: '', graduationYear: '', cgpa: '',
          goal: '', domain: '',
          level: 'intermediate', weeklyHours: '', targetCompanies: [],
        }
        saveAccount({ name, email, phone, passwordHash: hashPw(pw), profile })
        storePendingPassword(pw)
        await registerMongo(profile, pw)
        setMode('login')
        setForm({ name: '', email, phone: '', password: '' })
        setSuccess(`Account created for ${name}. Sign in to continue.`)
        checkEmailForLogin(email)
      } else {
        const account = findAccount(email)!
        if (account.passwordHash !== hashPw(pw)) {
          setError('Incorrect password.')
          setLoading(false); return
        }
        const profile: UserProfile = {
          ...(account.profile ?? {}),
          name: account.profile?.name || account.name,
          email,
          phone: account.profile?.phone || account.phone || '',
          college: account.profile?.college ?? '',
          branch: account.profile?.branch ?? '',
          graduationYear: account.profile?.graduationYear ?? '',
          cgpa: account.profile?.cgpa ?? '',
          goal: account.profile?.goal ?? '',
          domain: account.profile?.domain ?? '',
          level: account.profile?.level ?? 'intermediate',
          weeklyHours: account.profile?.weeklyHours ?? '',
          targetCompanies: account.profile?.targetCompanies ?? [],
        }
        if (!profile.name?.trim()) {
          setError('Account profile is incomplete. Please contact support or re-register.')
          setLoading(false); return
        }
        storePendingPassword(pw)
        await loginMongo(email, pw)
        setUser(profile)
        resetAssessmentNudge()
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission()
        }
        setView(profile.domain ? 'app' : 'onboarding')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f1f3f6' }}>
      <div style={{ background: 'var(--commerce-blue)' }}>
        <div className="page-container h-14 flex items-center justify-between gap-2">
          <button type="button" onClick={() => setView('landing')}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white/90 hover:text-white transition-colors shrink-0">
            <ChevronLeft size={16} /> <span className="hidden sm:inline">Back to </span>home
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <PrepUpLogo size={32} />
            <span className="font-semibold text-white text-base sm:text-lg truncate">PrepUp</span>
          </div>
          <div className="w-16 sm:w-28 shrink-0" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:p-4">
        <div className="w-full max-w-md min-w-0">
          <div className="flex rounded-xl p-1 mb-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: mode === m ? 'var(--commerce-blue)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-2)',
                }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={mode}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
              <form onSubmit={submit} className="card p-5 sm:p-8 space-y-5">
                <div>
                  <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text)' }}>
                    {mode === 'login' ? 'Welcome back' : 'Create your account'}
                  </h1>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
                    {mode === 'login'
                      ? 'Sign in with your registered email and password.'
                      : 'Track your placement readiness — free, no card needed.'}
                  </p>
                </div>

                {success && <div className="p-3 rounded-lg text-sm" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>{success}</div>}

                {error && <div className="alert-danger p-3 rounded-lg text-sm">{error}</div>}

                <div className="space-y-4">
                  {mode === 'register' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--text-2)' }}>Full Name *</label>
                      <input type="text" placeholder="Arjun Sharma" value={form.name}
                        onChange={e => set('name', e.target.value)}
                        className="input" autoFocus />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: 'var(--text-2)' }}>Email Address</label>
                    <input type="email" placeholder="you@example.com" value={form.email}
                      onChange={e => set('email', e.target.value)}
                      onBlur={() => mode === 'login' && checkEmailForLogin(form.email.trim().toLowerCase())}
                      className="input" autoFocus={mode === 'login'} />
                    {mode === 'login' && loginNameHint && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: '#059669' }}>
                        Account found — signing in as {loginNameHint}
                      </p>
                    )}
                    {mode === 'login' && form.email && !loginNameHint && findAccount(form.email.trim().toLowerCase()) === undefined && (
                      <p className="text-xs mt-1.5" style={{ color: '#DC2626' }}>
                        No account with this email. Create an account first.
                      </p>
                    )}
                  </div>
                  {mode === 'register' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--text-2)' }}>
                        WhatsApp Number <span className="normal-case font-normal" style={{ color: 'var(--text-3)' }}>(optional — for notifications)</span>
                      </label>
                      <input type="tel" placeholder="+91 98765 43210" value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        className="input" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: 'var(--text-2)' }}>Password</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} placeholder="Min. 6 characters"
                        value={form.password} onChange={e => set('password', e.target.value)}
                        className="input pr-10" />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-3)' }}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="btn-commerce w-full justify-center py-3 text-sm">
                  {loading
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Please wait...</span>
                    : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={15} /></>
                  }
                </button>

                <p className="text-sm text-center" style={{ color: 'var(--text-2)' }}>
                  {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                    className="font-semibold hover:underline" style={{ color: 'var(--commerce-blue)' }}>
                    {mode === 'login' ? 'Create one' : 'Sign in'}
                  </button>
                </p>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
