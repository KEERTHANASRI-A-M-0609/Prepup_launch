import { motion } from 'framer-motion'
import { Clock, Zap, ChevronRight, FileText, FolderGit2, Code2, Mic, Brain, MessageSquare, Sparkles } from 'lucide-react'
import type { ModuleCardState, AssessmentModuleId } from '../../engine/assessmentEngine'

const MODULE_ICONS: Record<AssessmentModuleId, typeof FileText> = {
  resume: FileText,
  github: FolderGit2,
  coding: Code2,
  communication: Mic,
  aptitude: Brain,
  interview: MessageSquare,
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: 'var(--success-soft)', text: 'var(--success)', label: 'Complete' },
  connected: { bg: 'var(--accent-soft)', text: 'var(--accent)', label: 'Connected' },
  pending:   { bg: 'var(--warning-soft)', text: 'var(--warning)', label: 'Ready' },
  optional:  { bg: 'var(--bg-muted)', text: 'var(--text-3)', label: 'Optional' },
  skipped:   { bg: 'var(--bg-muted)', text: 'var(--text-3)', label: 'Skipped' },
}

interface Props {
  card: ModuleCardState
  onLaunch: () => void
  delay?: number
}

export default function AssessmentModuleCard({ card, onLaunch, delay = 0 }: Props) {
  const { module, status, statusLabel, score } = card
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.pending
  const Icon = MODULE_ICONS[module.id]
  const progress = status === 'completed' ? 100 : status === 'connected' ? 75 : status === 'pending' ? 25 : 0

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
      onClick={onLaunch}
      className="text-left w-full group relative overflow-hidden"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xs)',
        padding: '28px',
      }}
    >
      {/* Accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: status === 'completed'
            ? 'var(--success)'
            : `linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 50%, transparent))`,
          opacity: status === 'skipped' ? 0.3 : 1,
        }}
      />

      <div className="flex items-start justify-between gap-4 mb-6">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-soft)' }}
        >
          <Icon size={22} style={{ color: 'var(--accent)' }} />
        </div>
        <ChevronRight
          size={18}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
          style={{ color: 'var(--text-3)' }}
        />
      </div>

      <p className="font-display text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>
        {module.title}
      </p>
      <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-2)' }}>
        {module.subtitle}
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: style.bg, color: style.text }}
        >
          {statusLabel || style.label}
        </span>
        <span className="text-xs font-semibold px-3 py-1 rounded-full badge-gray">
          {module.impact} Impact
        </span>
        {score !== undefined && (
          <span className="text-xs font-bold px-3 py-1 rounded-full badge-green">
            {score}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs mb-4" style={{ color: 'var(--text-3)' }}>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={13} /> {module.estimatedMinutes} min
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Zap size={13} /> {module.weightPct}% readiness
        </span>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
          <span>Insights unlocked</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ delay: delay + 0.2, duration: 0.8 }}
            style={{ background: status === 'completed' ? 'var(--success)' : 'var(--accent)' }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent)' }}>
        <Sparkles size={12} />
        Launch module
      </div>
    </motion.button>
  )
}
