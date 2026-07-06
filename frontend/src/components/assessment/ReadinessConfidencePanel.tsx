import { motion } from 'framer-motion'
import { ScoreRing } from '../UI'
import type { ReadinessConfidence } from '../../engine/assessmentEngine'

interface Props {
  confidence: ReadinessConfidence
}

const CONF_COLOR = { Low: '#DC2626', Medium: '#D97706', High: '#059669' }

export default function ReadinessConfidencePanel({ confidence }: Props) {
  const color = CONF_COLOR[confidence.confidence]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card p-6"
    >
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>
        Readiness Confidence Model
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <motion.div
          key={confidence.score}
          initial={{ scale: 0.92, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        >
          <ScoreRing score={confidence.score} size={120} strokeWidth={8} color="var(--accent)" />
        </motion.div>
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Confidence</span>
            <motion.span
              key={confidence.confidence}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm font-bold"
              style={{ color }}
            >
              {confidence.confidence}
            </motion.span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
            <motion.div
              className="h-full rounded-full"
              initial={false}
              animate={{ width: `${confidence.confidencePct}%`, background: color }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <motion.p
            key={confidence.measuredSections}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs"
            style={{ color: 'var(--text-3)' }}
          >
            {confidence.measuredSections}/{confidence.totalSections} evidence modules complete
          </motion.p>
          {confidence.missingEvidence.length > 0 && (
            <motion.div
              className="space-y-1.5 pt-1"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            >
              <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Missing evidence:</p>
              {confidence.missingEvidence.map(m => (
                <motion.p
                  key={m}
                  variants={{ hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0 } }}
                  className="text-xs flex items-center gap-2"
                  style={{ color: 'var(--text-3)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 live-pulse" />
                  {m}
                </motion.p>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
