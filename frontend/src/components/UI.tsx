import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { ExternalLink, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import AnimatedNumber from './motion/AnimatedNumber'

// ── Score Ring ────────────────────────────────────────────────────────────────
export function ScoreRing({ score, size = 120, strokeWidth = 8, label, color }: {
  score: number; size?: number; strokeWidth?: number; label?: string; color?: string
}) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const c = color ?? (score >= 70 ? '#059669' : score >= 50 ? '#D97706' : '#DC2626')
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="var(--bg-muted)" strokeWidth={strokeWidth} />
          <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={c} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber value={score} className="font-display font-bold text-2xl" style={{ color: c }} />
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>/100</span>
        </div>
      </div>
      {label && <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{label}</span>}
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ label, value, max = 100, color = 'var(--primary)', right }: {
  label: string; value: number; max?: number; color?: string; right?: string
}) {
  const pct = Math.min(Math.round((value / max) * 100), 100)
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{label}</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{right ?? `${pct}%`}</span>
        </div>
      )}
      <div className="progress-track">
        <motion.div className="progress-fill" style={{ backgroundColor: color }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, variant = 'default' }: {
  label: string; variant?: 'default' | 'accent' | 'success' | 'danger' | 'warn' | 'navy'
}) {
  const styles: Record<string, string> = {
    default: 'badge-gray',
    accent:  'badge-blue',
    navy:    'badge-blue',
    success: 'badge-green',
    danger:  'badge-red',
    warn:    'badge-yellow',
  }
  return (
    <span className={clsx('badge', styles[variant])}>
      {label}
    </span>
  )
}

// ── Resource Card ─────────────────────────────────────────────────────────────
export function ResourceCard({ title, type, tag, url, why, impact, effort }: {
  title: string; type: string; tag: string; url: string
  why?: string; impact?: string; effort?: string
}) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="card block p-5 space-y-3 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-snug" style={{ color: 'var(--text)' }}>{title}</p>
          <div className="flex gap-2 mt-2">
            <Badge label={tag} variant="accent" />
            <Badge label={type} variant="default" />
          </div>
        </div>
        <ExternalLink size={13} style={{ color: 'var(--text-3)' }} className="shrink-0 mt-0.5" />
      </div>
      {why && (
        <div className="space-y-1 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-2)' }}>Why: </span>{why}
          </p>
          {impact && <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-2)' }}>Impact: </span>{impact}
          </p>}
          {effort && <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-2)' }}>Effort: </span>{effort}
          </p>}
        </div>
      )}
    </a>
  )
}

// ── Insight Banner ────────────────────────────────────────────────────────────
export function InsightBanner({ label, message, type = 'info' }: {
  label: string; message: string; type?: 'info' | 'warn' | 'success'
}) {
  const cls = type === 'success' ? 'alert-success' : type === 'warn' ? 'alert-warning' : 'alert-info'
  const Icon = type === 'success' ? CheckCircle2 : type === 'warn' ? AlertTriangle : Info
  return (
    <div className={clsx('p-4 rounded-xl flex items-start gap-3', cls)}>
      <Icon size={15} className="shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold mb-0.5">{label}</p>
        <p className="text-xs leading-relaxed opacity-90">{message}</p>
      </div>
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action, onAction }: {
  title: string; subtitle?: string; action?: string; onAction?: () => void
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text)' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{subtitle}</p>}
      </div>
      {action && onAction && (
        <button onClick={onAction} className="btn-secondary text-xs">{action}</button>
      )}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ title, value, subtitle, icon, accent, trend }: {
  title: string; value: string | number; subtitle?: string
  icon?: React.ReactNode; accent?: boolean; trend?: number
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-label mb-2">{title}</p>
          <p className="font-display text-3xl font-bold" style={{ color: accent ? 'var(--primary)' : 'var(--text)' }}>
            {value}
          </p>
          {subtitle && <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>{subtitle}</p>}
          {trend !== undefined && (
            <p className={clsx('text-xs font-medium mt-2', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% this week
            </p>
          )}
        </div>
        {icon && (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--bg-muted)', color: 'var(--text-3)' }}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  )
}
