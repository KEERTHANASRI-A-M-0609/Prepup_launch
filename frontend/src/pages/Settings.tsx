import { useState, useEffect, type ReactNode } from 'react'
import { useApp } from '../store/AppContext'
import { Sun, Moon, Bell, User, Palette, MessageCircle, Send, Loader2 } from 'lucide-react'
import { mongoAPI, isMongoTokenValid, clearMongoTokenIfInvalid } from '../services/mongoAPI'

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} type="button"
      className={`relative w-10 h-5 rounded-full transition-colors ${on ? 'bg-[var(--accent)]' : 'bg-stone-200 dark:bg-slate-600'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}

type ChannelRow = {
  key: keyof import('../services/whatsappService').WhatsAppPrefs
  label: string
}

const NOTIFICATION_ROWS: ChannelRow[] = [
  { key: 'enabled', label: 'WhatsApp notifications' },
  { key: 'urgentAlerts', label: 'Urgent alerts + in-app popups' },
  { key: 'applicationAlerts', label: 'Application updates' },
  { key: 'dailyDigest', label: 'Daily digest' },
  { key: 'weeklyReport', label: 'Weekly report' },
  { key: 'inactiveReminders', label: 'Inactive reminders' },
]

export default function Settings() {
  const { user, theme, toggleTheme, setView, whatsappPrefs, setWhatsappPrefs, signOut, reconnectMongo } = useApp()
  const [sending, setSending] = useState<'digest' | 'reconnect' | null>(null)
  const [status, setStatus] = useState('')
  const [whatsappConfigured, setWhatsappConfigured] = useState(false)
  const [serverLinked, setServerLinked] = useState(() => isMongoTokenValid())

  const authHint = (msg: string) =>
    msg.includes('Invalid or expired token') || msg.includes('Missing or invalid authorization')
      ? 'Server session expired — use Reconnect below, or sign out and sign in again.'
      : msg.includes('Route not found')
        ? 'Backend route missing — restart backend: cd backend && npm run dev'
        : msg

  const loadChannelStatus = () => {
    if (!isMongoTokenValid()) {
      setServerLinked(false)
      return
    }
    mongoAPI.getNotificationStatus()
      .then(s => {
        setServerLinked(true)
        setWhatsappConfigured(s.whatsappConfigured)
      })
      .catch(err => {
        setServerLinked(false)
        clearMongoTokenIfInvalid()
        setStatus(authHint((err as Error).message))
      })
  }

  useEffect(() => {
    clearMongoTokenIfInvalid()
    setServerLinked(isMongoTokenValid())
    loadChannelStatus()
  }, [])

  const ensureServerSession = async (): Promise<boolean> => {
    if (isMongoTokenValid()) return true
    if (!user) return false
    setSending('reconnect')
    const ok = await reconnectMongo()
    setSending(null)
    if (ok) {
      setServerLinked(true)
      loadChannelStatus()
      return true
    }
    setStatus('Server session expired — sign out and sign in again with your email and password.')
    setServerLinked(false)
    return false
  }

  const testWhatsApp = async () => {
    setSending('digest')
    setStatus('')
    try {
      if (!(await ensureServerSession())) return
      const res = await mongoAPI.triggerDailyChallenge()
      if (res.sent) {
        if (res.whatsappDelivered) {
          setStatus(`WhatsApp delivered to ${user?.phone}.`)
        } else {
          setStatus(res.hint ?? res.whatsappHint ?? 'In-app popup saved — see WhatsApp setup below.')
        }
      } else if (res.skipped) {
        setStatus('Already sent today — check notifications panel.')
      } else {
        setStatus(res.reason ?? 'Could not send — sign in with server account.')
      }
    } catch (err) {
      setStatus(authHint((err as Error).message))
    }
    setSending(null)
  }

  const handleReconnect = async () => {
    setSending('reconnect')
    setStatus('')
    const ok = await reconnectMongo()
    setSending(null)
    if (ok) {
      setServerLinked(true)
      loadChannelStatus()
      setStatus('Reconnected to notification server.')
    } else {
      setServerLinked(false)
      setStatus('Could not reconnect — sign out and sign in again with your email and password.')
    }
  }

  const setupItems: { ok: boolean; label: string; detail?: ReactNode }[] = []
  if (!serverLinked) {
    setupItems.push({
      ok: false,
      label: 'Server session',
      detail: (
        <>
          Reconnect or{' '}
          <button type="button" onClick={signOut} className="underline font-semibold" style={{ color: 'var(--accent)' }}>sign in again</button>.
        </>
      ),
    })
  }
  if (whatsappConfigured) {
    setupItems.push({
      ok: true,
      label: 'WhatsApp (Twilio)',
      detail: (
        <>
          Send your Twilio <strong>join code</strong> to <strong>+1 415 523 8886</strong> on WhatsApp.
          Profile phone must match.
        </>
      ),
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-2">
        <p className="text-label">Profile</p>
        <h1 className="text-display font-display">Settings</h1>
      </header>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <User size={15} style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Profile</h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {[
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Phone', value: user?.phone },
            { label: 'Domain', value: user?.domain },
            { label: 'Target', value: user?.targetCompanies?.slice(0, 3).join(', ') },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>{item.label}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.value || '—'}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-4">
          <button onClick={() => setView('onboarding')} className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Edit profile →
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Bell size={15} style={{ color: 'var(--accent)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Notifications</h2>
          </div>
          <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            <span className={serverLinked ? 'text-emerald-600' : 'text-amber-600'}>Server {serverLinked ? '●' : '○'}</span>
            <span className="text-emerald-600">In-app ●</span>
            <span className={whatsappConfigured ? 'text-emerald-600' : ''}>WA {whatsappConfigured ? '●' : '○'}</span>
          </div>
        </div>
        <p className="px-5 pt-3 text-xs" style={{ color: 'var(--text-3)' }}>
          Alerts appear as in-app popups. WhatsApp delivery uses Twilio when enabled below.
        </p>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {NOTIFICATION_ROWS.map(row => (
            <div key={row.key} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2 min-w-0">
                <MessageCircle size={13} style={{ color: '#128C7E' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{row.label}</span>
              </div>
              <Toggle on={whatsappPrefs[row.key]} onToggle={() => setWhatsappPrefs({ [row.key]: !whatsappPrefs[row.key] })} />
            </div>
          ))}
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
          {!serverLinked && (
            <button onClick={handleReconnect} disabled={sending !== null}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--warning)' }}>
              {sending === 'reconnect' ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
              Reconnect server
            </button>
          )}
          <button onClick={testWhatsApp} disabled={!user?.phone || sending !== null}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
            style={{ background: '#128C7E' }}>
            {sending === 'digest' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Test daily challenge
          </button>
        </div>
        {status && (
          <p className="px-5 pt-3 text-xs font-medium" style={{ color: 'var(--text-2)' }}>{status}</p>
        )}
        {setupItems.length > 0 && (
          <div className="mx-5 mb-4 mt-2 p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Setup</p>
            <ul className="space-y-2.5">
              {setupItems.map(item => (
                <li key={item.label} className="flex gap-2 text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  <span className={item.ok ? 'text-emerald-600' : 'text-amber-600'}>{item.ok ? '●' : '○'}</span>
                  <span>
                    <strong style={{ color: 'var(--text)' }}>{item.label}</strong>
                    {item.detail && <> — {item.detail}</>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <Palette size={15} style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Appearance</h2>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{theme === 'dark' ? 'Dark' : 'Light'} mode</p>
          <button onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--bg-muted)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            {theme === 'dark' ? <><Sun size={14} /> Light</> : <><Moon size={14} /> Dark</>}
          </button>
        </div>
      </div>
    </div>
  )
}
