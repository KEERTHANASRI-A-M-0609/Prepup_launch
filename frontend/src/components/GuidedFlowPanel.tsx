import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2, Circle, Lock, ChevronRight, Compass, ListChecks, ArrowRight,
} from 'lucide-react'
import type { GuidedFlow, GuidedStep } from '../engine/guidedFlowEngine'

function StepRow({
  step,
  index,
  onGo,
  variant,
}: {
  step: GuidedStep
  index: number
  onGo: (path: string) => void
  variant: 'required' | 'explore'
}) {
  const locked = step.locked && !step.done

  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`flex gap-3 p-3 rounded-xl transition-colors ${locked ? 'opacity-70' : 'hover:bg-[var(--bg-muted)]'}`}
    >
      <div className="shrink-0 pt-0.5">
        {step.done ? (
          <CheckCircle2 size={18} className="text-emerald-500" />
        ) : locked ? (
          <Lock size={16} className="dash-label" />
        ) : (
          <Circle size={18} className="dash-label" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm dash-heading">{step.title}</p>
          {!step.done && !locked && (
            <button
              type="button"
              onClick={() => onGo(step.path)}
              className="text-xs dash-link shrink-0 inline-flex items-center gap-0.5"
            >
              {variant === 'required' ? 'Start' : 'Open'} <ChevronRight size={12} />
            </button>
          )}
        </div>
        <p className="text-xs dash-subtext mt-0.5 leading-relaxed">{step.reason}</p>
        <p className="text-[11px] mt-1.5 leading-snug font-medium" style={{ color: 'var(--accent)' }}>
          → {step.impact}
        </p>
        {locked && step.lockReason && (
          <p className="text-[10px] mt-1 font-medium" style={{ color: 'var(--warning)' }}>{step.lockReason}</p>
        )}
        {!locked && step.estimatedMins && !step.done && (
          <p className="text-[10px] dash-label mt-1">~{step.estimatedMins} min</p>
        )}
      </div>
    </motion.li>
  )
}

export function PreferenceSummary({
  flow,
  onEdit,
}: {
  flow: GuidedFlow
  onEdit: () => void
}) {
  const { preferences: p } = flow
  if (!p.isComplete) return null

  const chips = [
    p.domain,
    p.targetRole,
    p.level,
    p.weeklyHours,
    p.goal === 'internship' ? 'Internship' : p.goal === 'placement' ? 'Placement' : null,
    ...(p.targetCompanies.length ? [p.targetCompanies.slice(0, 3).join(', ')] : []),
  ].filter(Boolean)

  return (
    <section className="dash-section">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest dash-label mb-1">Phase 01 · Career Identity</p>
          <h2 className="font-bold dash-heading text-base">Your placement blueprint</h2>
        </div>
        <button type="button" onClick={onEdit} className="text-xs dash-link shrink-0">
          Edit preferences
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip, i) => (
          <span
            key={`${chip}-${i}`}
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            {chip}
          </span>
        ))}
      </div>
      {p.targetCompanies.length === 0 && (
        <p className="text-xs dash-subtext mt-3">
          No target companies yet — add them in preferences to personalize your planner and resources.
        </p>
      )}
    </section>
  )
}

export default function GuidedFlowPanel({
  flow,
  onNavigate,
}: {
  flow: GuidedFlow
  onNavigate?: (path: string) => void
}) {
  const navigate = useNavigate()
  const onGo = (path: string) => (onNavigate ? onNavigate(path) : navigate(path))

  const unlockedExplore = flow.exploreSteps.filter(s => !s.locked)
  const lockedExplore = flow.exploreSteps.filter(s => s.locked)

  return (
    <div className="space-y-6">
      {flow.requiredSteps.length > 0 && (
        <section className="dash-section dash-setup border-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ListChecks size={18} style={{ color: 'var(--warning)' }} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--warning)' }}>
                  Phase 02–04 · Evidence & Execution
                </p>
                <h2 className="font-bold dash-heading text-lg">
                  {flow.requiredSteps.length} action{flow.requiredSteps.length > 1 ? 's' : ''} to unlock full intelligence
                </h2>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
              {flow.progressPct}%
            </span>
          </div>

          {flow.nextRequired && (
            <div className="mb-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest dash-label mb-1">Up next</p>
              <h3 className="font-bold dash-heading">{flow.nextRequired.title}</h3>
              <p className="text-sm dash-subtext mt-1">{flow.nextRequired.reason}</p>
              <p className="text-xs mt-2 font-medium" style={{ color: 'var(--accent)' }}>Impact: {flow.nextRequired.impact}</p>
              <button
                type="button"
                onClick={() => onGo(flow.nextRequired!.path)}
                className="btn-landing-primary mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-bold"
              >
                Start now <ArrowRight size={14} />
              </button>
            </div>
          )}

          <ul className="space-y-1">
            {flow.requiredSteps.map((step, i) => (
              <StepRow key={step.id} step={step} index={i} onGo={onGo} variant="required" />
            ))}
          </ul>
        </section>
      )}

      <section className="dash-section">
        <div className="flex items-center gap-2 mb-4">
          <Compass size={18} className="dash-label" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest dash-label">Extended intelligence modules</p>
            <h2 className="font-bold dash-heading text-base">Unlock as your evidence graph grows</h2>
          </div>
        </div>

        {unlockedExplore.length > 0 && (
          <ul className="space-y-1 mb-4">
            {unlockedExplore.map((step, i) => (
              <StepRow key={step.id} step={step} index={i} onGo={onGo} variant="explore" />
            ))}
          </ul>
        )}

        {lockedExplore.length > 0 && (
          <>
            {unlockedExplore.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-widest dash-label mb-2 mt-2">Unlocks later</p>
            )}
            <ul className="space-y-1">
              {lockedExplore.map((step, i) => (
                <StepRow key={step.id} step={step} index={i} onGo={onGo} variant="explore" />
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
