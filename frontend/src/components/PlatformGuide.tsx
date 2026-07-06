import { useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { motion, AnimatePresence } from 'framer-motion'

import {

  BookOpen, ChevronDown, ChevronRight, CheckCircle2, Circle,

  Target, Link2, Brain, Zap,

} from 'lucide-react'

import { useApp } from '../store/AppContext'



const PHASES = [

  {

    id: 'identity',

    num: '01',

    icon: Target,

    title: 'Build Your Career Identity',

    detail: 'Target role, domain, experience level, and dream companies — creates your personalized career blueprint.',

    done: (_u: boolean, domain?: string) => Boolean(domain?.trim()),

    path: null,

  },

  {

    id: 'evidence',

    num: '02',

    icon: Link2,

    title: 'Connect Your Evidence',

    detail: 'Resume, GitHub, coding platforms, assessments, projects, and applications — unified into one evidence graph.',

    done: (_u: boolean, _d?: string, assessed?: boolean) => assessed ?? false,

    path: '/health',

  },

  {

    id: 'intelligence',

    num: '03',

    icon: Brain,

    title: 'Generate Placement Intelligence',

    detail: 'Strengths, weaknesses, readiness, skill gaps, momentum, and risk — know exactly where you stand today.',

    done: (_u: boolean, _d?: string, assessed?: boolean, apps?: number) => assessed ?? false,

    path: '/',

  },

  {

    id: 'execution',

    num: '04',

    icon: Zap,

    title: 'Execute the Highest-Impact Actions',

    detail: 'Daily priorities, recovery plans, and growth recommendations — move continuously toward placement success.',

    done: (_u: boolean, _d?: string, _a?: boolean, _apps?: number, tasks?: number) => (tasks ?? 0) > 0,

    path: '/planner',

  },

]



export default function PlatformGuide() {

  const { user, assessment, applications, activityLog } = useApp()

  const navigate = useNavigate()

  const [open, setOpen] = useState(true)



  const assessed = Boolean(assessment && (assessment.dsa + assessment.resume + assessment.communication) > 0)

  const tasksDone = activityLog.reduce((s, d) => s + d.tasksCompleted, 0)



  const completed = PHASES.filter(s =>

    s.done(!!user, user?.domain, assessed, applications.length, tasksDone)

  ).length



  if (!user) return null



  return (

    <motion.section

      initial={{ opacity: 0, y: 12 }}

      animate={{ opacity: 1, y: 0 }}

      className="glass-card overflow-hidden"

    >

      <button

        type="button"

        onClick={() => setOpen(o => !o)}

        className="w-full flex items-center justify-between gap-3 p-5 text-left"

      >

        <div className="flex items-center gap-3 min-w-0">

          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>

            <BookOpen size={18} style={{ color: 'var(--accent)' }} />

          </div>

          <div className="min-w-0">

            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Operating Model</p>

            <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>

              Data → Intelligence → Action · {completed}/{PHASES.length} phases active

            </p>

          </div>

        </div>

        <div className="flex items-center gap-2 shrink-0">

          {open ? <ChevronDown size={18} style={{ color: 'var(--text-3)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-3)' }} />}

        </div>

      </button>



      <AnimatePresence>

        {open && (

          <motion.div

            initial={{ height: 0, opacity: 0 }}

            animate={{ height: 'auto', opacity: 1 }}

            exit={{ height: 0, opacity: 0 }}

            className="border-t"

            style={{ borderColor: 'var(--border)' }}

          >

            <ol className="p-4 sm:p-5 space-y-3">

              {PHASES.map((phase, i) => {

                const done = phase.done(!!user, user?.domain, assessed, applications.length, tasksDone)

                const Icon = phase.icon

                return (

                  <li key={phase.id} className="flex gap-3">

                    <div className="flex flex-col items-center shrink-0">

                      {done

                        ? <CheckCircle2 size={18} className="text-emerald-500" />

                        : <Circle size={18} style={{ color: 'var(--text-3)' }} />}

                      {i < PHASES.length - 1 && (

                        <div className="w-px flex-1 min-h-[12px] my-1" style={{ background: 'var(--border)' }} />

                      )}

                    </div>

                    <div className="flex-1 min-w-0 pb-1">

                      <div className="flex items-start justify-between gap-2">

                        <p className="font-medium text-sm flex items-center gap-1.5" style={{ color: 'var(--text)' }}>

                          <span className="text-[10px] font-bold opacity-50">{phase.num}</span>

                          <Icon size={14} style={{ color: 'var(--accent)' }} />

                          {phase.title}

                        </p>

                        {phase.path && !done && (

                          <button

                            type="button"

                            onClick={() => navigate(phase.path!)}

                            className="text-xs font-semibold shrink-0"

                            style={{ color: 'var(--accent)' }}

                          >

                            Open →

                          </button>

                        )}

                      </div>

                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-2)' }}>{phase.detail}</p>

                    </div>

                  </li>

                )

              })}

            </ol>

          </motion.div>

        )}

      </AnimatePresence>

    </motion.section>

  )

}


