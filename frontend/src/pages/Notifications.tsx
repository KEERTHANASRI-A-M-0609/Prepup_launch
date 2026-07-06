import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle2, XCircle, ArrowLeft, Zap } from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { AssessmentModuleId } from '../engine/assessmentEngine'

const TYPE_CONFIG = {
  info:    { icon: Info,          color: 'var(--accent)', bg: 'var(--accent-soft)', priority: 'Insight' },
  warning: { icon: AlertTriangle, color: 'var(--warning)', bg: 'var(--warning-soft)', priority: 'Action needed' },
  success: { icon: CheckCircle2,  color: 'var(--success)', bg: 'var(--success-soft)', priority: 'Win' },
  danger:  { icon: XCircle,       color: 'var(--danger)', bg: 'var(--danger-soft)', priority: 'Urgent' },
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)   return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export default function NotificationsPanel() {
  const { notifications, markAllRead, syncNotifications } = useApp()
  const navigate = useNavigate()
  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    syncNotifications()
  }, [syncNotifications])

  const grouped = {
    urgent: notifications.filter(n => n.type === 'danger' || n.type === 'warning'),
    insights: notifications.filter(n => n.type === 'info'),
    wins: notifications.filter(n => n.type === 'success'),
  }

  const handleAction = (moduleId?: string, type?: string) => {
    if (moduleId) {
      navigate(`/health?module=${moduleId as AssessmentModuleId}`)
      return
    }
    if (type === 'danger' || type === 'warning') navigate('/planner')
    else if (type === 'info') navigate('/resources')
    else navigate('/health')
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-[var(--bg-muted)] transition-colors shrink-0">
            <ArrowLeft size={18} style={{ color: 'var(--text-2)' }} />
          </button>
          <div className="min-w-0">
            <p className="text-label">Command Center</p>
            <h1 className="text-display font-display flex items-center gap-3">
              Notifications
              {unread > 0 && (
                <span className="text-sm font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: 'var(--danger)' }}>
                  {unread}
                </span>
              )}
            </h1>
          </div>
        </div>
        {unread > 0 && (
          <button type="button" onClick={markAllRead} className="btn-ghost text-sm shrink-0">
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </header>

      {notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-elevated p-12 sm:p-16 text-center space-y-4"
        >
          <Bell size={40} className="mx-auto opacity-30" />
          <p className="font-display text-xl font-bold" style={{ color: 'var(--text)' }}>All clear</p>
          <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--text-3)' }}>
            Priority alerts, deadline reminders, and assessment updates will appear here.
          </p>
          <button type="button" onClick={() => syncNotifications()} className="btn-ghost text-sm mx-auto">
            Refresh notifications
          </button>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {[
            { key: 'urgent', label: 'Priority', items: grouped.urgent },
            { key: 'insights', label: 'Insights', items: grouped.insights },
            { key: 'wins', label: 'Wins', items: grouped.wins },
          ].filter(g => g.items.length > 0).map(group => (
            <section key={group.key}>
              <p className="text-label mb-4">{group.label}</p>
              <div className="space-y-3">
                {group.items.map((n, i) => {
                  const cfg = TYPE_CONFIG[n.type]
                  const Icon = cfg.icon
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-4 p-5 transition-all"
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        background: n.read ? 'var(--bg-elevated)' : cfg.bg,
                        border: `1px solid ${n.read ? 'var(--border)' : `color-mix(in srgb, ${cfg.color} 20%, transparent)`}`,
                        opacity: n.read ? 0.7 : 1,
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `color-mix(in srgb, ${cfg.color} 15%, transparent)` }}
                      >
                        <Icon size={18} style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                            {cfg.priority}
                          </span>
                          <span className="text-xs shrink-0" style={{ color: 'var(--text-3)' }}>{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>{n.title}</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{n.message}</p>
                        <button
                          type="button"
                          onClick={() => handleAction(n.moduleId, n.type)}
                          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold"
                          style={{ color: 'var(--accent)' }}
                        >
                          <Zap size={12} /> {n.moduleId ? 'Open module' : n.type === 'success' ? 'View progress' : 'Take action'}
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
