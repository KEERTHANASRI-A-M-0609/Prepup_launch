import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Lock, ChevronRight, ArrowRight, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { OperatingPhase, IntelligenceEvent } from '../engine/intelligenceTimelineEngine'

function PhaseCard({ phase, index, onGo }: { phase: OperatingPhase; index: number; onGo: (path: string) => void }) {
  const isActive = phase.status === 'active'
  const isDone = phase.status === 'complete'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="dash-section p-4 sm:p-5 relative overflow-hidden"
      style={{
        borderColor: isActive ? 'var(--accent)' : 'var(--border)',
        borderWidth: isActive ? 2 : 1,
        opacity: phase.status === 'locked' ? 0.65 : 1,
      }}
    >
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
      )}
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {isDone ? (
            <CheckCircle2 size={20} className="text-emerald-500" />
          ) : isActive ? (
            <Circle size={20} style={{ color: 'var(--accent)' }} className="animate-pulse" />
          ) : (
            <Lock size={18} className="dash-label" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest dash-label">{phase.num}</span>
            {isActive && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                Active now
              </span>
            )}
            {isDone && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                Complete
              </span>
            )}
          </div>
          <h3 className="font-bold text-sm dash-heading">{phase.title}</h3>
          <p className="text-xs dash-subtext mt-0.5">{phase.subtitle}</p>

          <div className="mt-3 space-y-2">
            <p className="text-xs leading-relaxed">
              <span className="font-semibold dash-heading">Impact: </span>
              <span className="dash-subtext">{phase.impact}</span>
            </p>
            <p className="text-xs leading-relaxed">
              <span className="font-semibold dash-heading">Unlocks: </span>
              <span className="dash-subtext">{phase.unlocks}</span>
            </p>
          </div>

          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${phase.progressPct}%`,
                background: isDone ? '#10B981' : 'var(--accent)',
              }}
            />
          </div>
          <p className="text-[10px] dash-label mt-1">{phase.progressPct}% of phase complete</p>

          {phase.nextAction && phase.status !== 'complete' && phase.path && (
            <button
              type="button"
              onClick={() => onGo(phase.path!)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold dash-link"
            >
              {phase.nextAction} <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
      {index < 3 && (
        <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center rounded-full dash-section border">
          <ChevronRight size={14} className="dash-label" />
        </div>
      )}
    </motion.div>
  )
}

function EventRow({ event }: { event: IntelligenceEvent }) {
  return (
    <li className="flex gap-2 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <Zap size={12} className="shrink-0 mt-1" style={{ color: 'var(--accent)' }} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold dash-heading truncate">{event.title}</p>
        <p className="text-[11px] dash-subtext leading-snug">{event.impact}</p>
        <p className="text-[10px] dash-label mt-0.5">
          {new Date(event.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </li>
  )
}

export default function IntelligenceTimeline({
  phases,
  events,
}: {
  phases: OperatingPhase[]
  events: IntelligenceEvent[]
}) {
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest dash-label mb-1">Operating model</p>
        <h2 className="font-bold dash-heading text-lg">Data → Intelligence → Action → Outcome</h2>
        <p className="text-xs dash-subtext mt-1">Each phase unlocks the next. Complete them in order for accurate placement intelligence.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
        {phases.map((phase, i) => (
          <PhaseCard key={phase.id} phase={phase} index={i} onGo={p => navigate(p)} />
        ))}
      </div>

      {events.length > 0 && (
        <section className="dash-section p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest dash-label mb-2">Recent activity · stored in cloud</p>
          <ul className="max-h-48 overflow-y-auto">
            {events.slice(0, 8).map((e, i) => (
              <EventRow key={`${e.at}-${i}`} event={e} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
