import { motion } from 'framer-motion'
import { ExternalLink, Zap, Clock, Target, ArrowRight } from 'lucide-react'

interface Props {
  title: string
  why: string
  impact: string
  effort: string
  priority: 'High' | 'Medium' | 'Low'
  url: string
  tag?: string
  index?: number
  onAction?: () => void
}

const PRIORITY_STYLE = {
  High: { bg: 'var(--accent-soft)', color: 'var(--accent)', width: '85%' },
  Medium: { bg: 'var(--warning-soft)', color: 'var(--warning)', width: '60%' },
  Low: { bg: 'var(--bg-muted)', color: 'var(--text-3)', width: '35%' },
}

export default function RecommendationCard({
  title, why, impact, effort, priority, url, tag, index = 0, onAction,
}: Props) {
  const ps = PRIORITY_STYLE[priority]

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
      className="block p-5 group"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xs)',
        textDecoration: 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          {tag && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
              style={{ background: 'var(--bg-muted)', color: 'var(--accent)' }}>{tag}</span>
          )}
          <p className="font-semibold text-sm leading-snug group-hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text)' }}>
            {title}
          </p>
        </div>
        <ExternalLink size={14} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-3)' }} />
      </div>

      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>
        <span className="font-semibold" style={{ color: 'var(--text)' }}>Why: </span>{why}
      </p>

      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <span className="inline-flex items-center gap-1 font-medium" style={{ color: 'var(--success)' }}>
          <Zap size={12} /> {impact} impact
        </span>
        <span className="inline-flex items-center gap-1 font-medium" style={{ color: 'var(--text-3)' }}>
          <Clock size={12} /> {effort}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            Priority confidence
          </span>
          <span className="text-[10px] font-bold" style={{ color: ps.color }}>{priority}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: ps.width }}
            transition={{ delay: index * 0.08 + 0.2, duration: 0.6 }}
            style={{ background: ps.color }}
          />
        </div>
      </div>

      {onAction && (
        <button
          type="button"
          onClick={e => { e.preventDefault(); onAction() }}
          className="inline-flex items-center gap-1 text-xs font-semibold mt-1"
          style={{ color: 'var(--accent)' }}
        >
          <Target size={12} /> Take action <ArrowRight size={12} />
        </button>
      )}
    </motion.a>
  )
}
