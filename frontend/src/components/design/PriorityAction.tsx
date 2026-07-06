import { motion } from 'framer-motion'
import { ArrowRight, Clock, Zap, Target } from 'lucide-react'

interface Props {
  title: string
  reason: string
  impact: string
  time: string
  onStart: () => void
  urgent?: boolean
}

export default function PriorityAction({ title, reason, impact, time, onStart, urgent }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden"
      style={{
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(135deg, var(--bg-elevated) 0%, color-mix(in srgb, var(--accent) 4%, var(--bg-elevated)) 100%)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none opacity-40"
        style={{ background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)' }}
      />

      <div className="relative p-8 md:p-10 lg:p-12">
        <div className="flex items-center gap-2 mb-6">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: urgent ? 'var(--danger-soft)' : 'var(--accent-soft)', color: urgent ? 'var(--danger)' : 'var(--accent)' }}
          >
            <Target size={12} />
            {urgent ? 'Urgent Priority' : "Today's Priority"}
          </span>
        </div>

        <h2 className="text-display mb-3 max-w-2xl" style={{ color: 'var(--text)' }}>
          {title}
        </h2>

        <p className="text-base max-w-xl mb-8 leading-relaxed" style={{ color: 'var(--text-2)' }}>
          {reason}
        </p>

        <div className="flex flex-wrap gap-6 mb-10">
          <div>
            <p className="text-label mb-1">Expected Impact</p>
            <p className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--success)' }}>
              <Zap size={18} />
              {impact}
            </p>
          </div>
          <div>
            <p className="text-label mb-1">Estimated Time</p>
            <p className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Clock size={18} style={{ color: 'var(--text-3)' }} />
              {time}
            </p>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={onStart}
          className="btn-accent text-base px-8 py-4"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Start Now
          <ArrowRight size={18} />
        </motion.button>
      </div>
    </motion.section>
  )
}
