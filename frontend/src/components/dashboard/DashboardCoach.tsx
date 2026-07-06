import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, CheckCircle2 } from 'lucide-react'
import type { GuidedFlow } from '../../engine/guidedFlowEngine'
import type { AssessmentModuleId } from '../../engine/assessmentEngine'
import { DASH_COACH_KEY } from '../../services/storageKeys'

type CoachStep = {
  id: string
  title: string
  body: string
  cta: string
  path?: string
  moduleId?: AssessmentModuleId
}

function loadCoachState(): { done: string[]; dismissed: boolean } {
  try {
    const raw = localStorage.getItem(DASH_COACH_KEY)
    if (!raw) return { done: [], dismissed: false }
    return JSON.parse(raw)
  } catch {
    return { done: [], dismissed: false }
  }
}

function saveCoachState(state: { done: string[]; dismissed: boolean }) {
  localStorage.setItem(DASH_COACH_KEY, JSON.stringify(state))
}

export default function DashboardCoach({
  firstName,
  flow,
  hasEvidence,
  onNavigate,
  onOpenModule,
}: {
  firstName: string
  flow: GuidedFlow
  hasEvidence: boolean
  onNavigate: (path: string) => void
  onOpenModule: (id: AssessmentModuleId) => void
}) {
  const [state, setState] = useState(loadCoachState)
  const [open, setOpen] = useState(false)

  const steps = useMemo((): CoachStep[] => {
    const list: CoachStep[] = [
      {
        id: 'welcome',
        title: `Welcome, ${firstName}`,
        body: 'PrepUp guides you one step at a time — complete a test, see it reflected here instantly.',
        cta: 'Continue',
      },
    ]
    if (!flow.preferences.isComplete) {
      list.push({
        id: 'identity',
        title: 'Set your career target',
        body: 'Role, domain, and companies — required before intelligence unlocks.',
        cta: 'Open onboarding',
        path: '/onboarding',
      })
    } else if (!hasEvidence && flow.nextRequired) {
      list.push({
        id: 'first-test',
        title: flow.nextRequired.title,
        body: 'Complete one assessment — your readiness score updates on this dashboard.',
        cta: 'Start test',
        path: flow.nextRequired.path,
        moduleId: flow.nextRequired.id?.startsWith('blocker-')
          ? (flow.nextRequired.id.replace('blocker-', '') as AssessmentModuleId)
          : undefined,
      })
    } else if (hasEvidence && !flow.setupComplete && flow.nextRequired) {
      list.push({
        id: 'next-test',
        title: flow.nextRequired.title,
        body: 'Finish required evidence modules to unlock full placement intelligence.',
        cta: 'Continue',
        path: flow.nextRequired.path,
      })
    } else if (flow.setupComplete) {
      list.push({
        id: 'execute',
        title: 'Run today\'s priority',
        body: 'Your daily plan is sized to your weekly capacity — one verified task activates momentum.',
        cta: 'Open planner',
        path: '/planner',
      })
    }
    return list
  }, [firstName, flow, hasEvidence])

  const current = steps.find(s => !state.done.includes(s.id)) ?? null

  useEffect(() => {
    if (!current || state.dismissed) {
      setOpen(false)
      return
    }
    const t = setTimeout(() => setOpen(true), 600)
    return () => clearTimeout(t)
  }, [current, state.dismissed])

  const completeStep = () => {
    if (!current) return
    const nextDone = [...state.done, current.id]
    const next = { ...state, done: nextDone }
    setState(next)
    saveCoachState(next)
    setOpen(false)

    if (current.moduleId) {
      onOpenModule(current.moduleId)
      return
    }
    if (current.path) onNavigate(current.path)
  }

  const dismissAll = () => {
    const next = { done: steps.map(s => s.id), dismissed: true }
    setState(next)
    saveCoachState(next)
    setOpen(false)
  }

  if (!current || state.dismissed) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="dash-coach-backdrop"
          onClick={dismissAll}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="dash-coach-modal"
            onClick={e => e.stopPropagation()}
          >
            <button type="button" onClick={dismissAll} className="dash-coach-close" aria-label="Close">
              <X size={16} />
            </button>
            <p className="dash-coach-kicker">
              Step {state.done.length + 1} of {steps.length}
            </p>
            <h2 className="dash-coach-title">{current.title}</h2>
            <p className="dash-coach-body">{current.body}</p>
            <div className="flex flex-wrap gap-2 mt-5">
              <button type="button" onClick={completeStep} className="dash-coach-primary">
                {current.cta} <ArrowRight size={16} />
              </button>
              <button type="button" onClick={dismissAll} className="dash-coach-secondary">
                Skip tour
              </button>
            </div>
            <ul className="dash-coach-progress mt-4">
              {steps.map(s => (
                <li key={s.id} className={state.done.includes(s.id) ? 'done' : s.id === current.id ? 'active' : ''}>
                  {state.done.includes(s.id) ? <CheckCircle2 size={12} /> : <span className="dash-coach-dot" />}
                  <span>{s.title}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
