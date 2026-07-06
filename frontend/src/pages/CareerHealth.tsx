import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../store/AppContext'
import { WifiOff } from 'lucide-react'
import LivePulse from '../components/motion/LivePulse'
import { staggerContainer, staggerItem } from '../components/motion/motionPresets'
import {
  getAssessmentModuleCards,
  getAssessmentModuleGroups,
  getTopPriority,
  getAssessmentBlockers,
  computeReadinessConfidence,
  applyAssessmentModule,
  ASSESSMENT_MODULES,
  type AssessmentModuleId,
} from '../engine/assessmentEngine'
import AssessmentModuleCard from '../components/assessment/AssessmentModuleCard'
import PriorityAssessmentPanel from '../components/assessment/PriorityAssessmentPanel'
import ReadinessConfidencePanel from '../components/assessment/ReadinessConfidencePanel'
import ModuleLauncher from '../components/assessment/ModuleLauncher'
import type { AptitudeEvidence, CommEvidence, MockInterviewSession, PlatformData, ResumeEvidence } from '../types'
import { backendAPI } from '../services/api'
import { mongoAPI, dashboardToAssessment } from '../services/mongoAPI'
import { STORAGE_KEY, SKIPPED_MODULES_KEY } from '../services/storageKeys'

export default function CareerHealth() {
  const {
    user, assessment, platformData, updateAssessment, syncAssessmentFromRemote, setPlatformData,
    pushNotification, backendOnline, mongoOnline, recordExecution,
  } = useApp()

  const [searchParams, setSearchParams] = useSearchParams()
  const [activeModule, setActiveModule] = useState<AssessmentModuleId | null>(null)
  const [skippedModules, setSkippedModules] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(SKIPPED_MODULES_KEY) || '{}') } catch { return {} }
  })
  const [dismissedPriority, setDismissedPriority] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [apiCards, setApiCards] = useState<ReturnType<typeof getAssessmentModuleCards> | null>(null)
  const [apiPriority, setApiPriority] = useState<ReturnType<typeof getTopPriority> | null>(null)
  const [apiConfidence, setApiConfidence] = useState<ReturnType<typeof computeReadinessConfidence> | null>(null)

  const domain = user?.domain ?? 'Software Engineering'

  const localCards = getAssessmentModuleCards(assessment, platformData, skippedModules)
  const localPriority = getTopPriority(user, assessment, platformData, skippedModules)
  const localConfidence = computeReadinessConfidence(assessment, platformData)

  const cards = apiCards ?? localCards
  const moduleGroups = getAssessmentModuleGroups(domain, assessment, platformData, skippedModules)
  const blockers = getAssessmentBlockers(domain, assessment, platformData)
  const priority = apiPriority ?? localPriority
  const confidence = apiConfidence ?? localConfidence
  const showPriority = priority && dismissedPriority !== priority.moduleId

  const refreshFromMongo = useCallback(async () => {
    if (!mongoOnline) return
    setLoading(true)
    try {
      const dash = await mongoAPI.getDashboard()
      const { assessment: a, platformData: pd, skippedModules: skipped } = dashboardToAssessment(dash)
      if (a) syncAssessmentFromRemote(a)
      if (pd) setPlatformData(pd)
      if (skipped) {
        setSkippedModules(skipped)
        localStorage.setItem(SKIPPED_MODULES_KEY, JSON.stringify(skipped))
      }
      setApiCards(dash.cards as ReturnType<typeof getAssessmentModuleCards>)
      setApiPriority(dash.priority)
      setApiConfidence(dash.confidence)
    } catch { /* fallback to local */ }
    setLoading(false)
  }, [mongoOnline, syncAssessmentFromRemote, setPlatformData])

  useEffect(() => { refreshFromMongo() }, [refreshFromMongo])

  useEffect(() => {
    const m = searchParams.get('module') as AssessmentModuleId | null
    if (m && ASSESSMENT_MODULES.some(mod => mod.id === m)) {
      setActiveModule(m)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const persistSkip = async (id: AssessmentModuleId) => {
    const next = { ...skippedModules, [id]: new Date().toISOString() }
    setSkippedModules(next)
    localStorage.setItem(SKIPPED_MODULES_KEY, JSON.stringify(next))
    setDismissedPriority(id)
    if (mongoOnline) {
      try {
        const dash = await mongoAPI.skipModule(id)
        setApiCards(dash.cards as ReturnType<typeof getAssessmentModuleCards>)
        setApiPriority(dash.priority)
        setApiConfidence(dash.confidence)
      } catch { /* local skip still works */ }
    }
  }

  const saveModule = async (
    updated: ReturnType<typeof applyAssessmentModule>,
    moduleId: AssessmentModuleId,
    payload: Record<string, unknown>,
    moduleName: string,
  ) => {
    updateAssessment(updated)
    recordExecution({ minutes: 25 })
    if (backendOnline && studentIdFromStorage()) {
      backendAPI.saveAssessmentModule(studentIdFromStorage()!, moduleName, updated as unknown as Record<string, unknown>).catch(() => {})
    }
    if (mongoOnline) {
      try {
        const dash = await mongoAPI.saveModule(moduleId, payload)
        const { assessment: a, platformData: pd } = dashboardToAssessment(dash)
        if (a) syncAssessmentFromRemote(a)
        if (pd) setPlatformData(pd)
        setApiCards(dash.cards as ReturnType<typeof getAssessmentModuleCards>)
        setApiPriority(dash.priority)
        setApiConfidence(dash.confidence)
      } catch { /* local state already updated */ }
    }
    pushNotification({
      title: `${moduleName} complete`,
      message: 'Readiness score updated. Check your confidence model below.',
      type: 'success',
    })
  }

  function studentIdFromStorage() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').studentId as number | undefined } catch { return undefined }
  }

  const handleResume = (evidence: ResumeEvidence, score: number) => {
    const next = applyAssessmentModule(assessment, platformData, domain, 'resume', { resumeEvidence: evidence })
    next.resume = score
    saveModule(next, 'resume', { resumeEvidence: evidence, score }, 'Resume Intelligence')
    if (evidence.roleConflicts?.length) {
      pushNotification({
        title: 'Resume role mismatch',
        message: evidence.roleConflicts[0],
        type: 'warning',
      })
    }
    setActiveModule(null)
  }

  const handleGitHub = (data: PlatformData, score: number) => {
    setPlatformData(data)
    const next = applyAssessmentModule(assessment, data, domain, 'github', { platformData: data, projectsScore: score })
    saveModule(next, 'github', { platformData: data, score }, 'GitHub Intelligence')
    setActiveModule(null)
  }

  const handleCoding = (data: PlatformData, score: number) => {
    setPlatformData(data)
    const next = applyAssessmentModule(assessment, data, domain, 'coding', {
      platformData: data,
      dsaScore: data.leetcode ? score : assessment?.dsa,
      projectsScore: data.github ? score : assessment?.projects,
    })
    saveModule(next, 'coding', {
      platformData: data,
      dsaScore: next.dsa,
      projectsScore: next.projects,
      score,
    }, 'Coding Intelligence')
    setActiveModule(null)
  }

  const handleComm = (evidence: CommEvidence) => {
    const next = applyAssessmentModule(assessment, platformData, domain, 'communication', { commEvidence: evidence })
    saveModule(next, 'communication', { commEvidence: evidence }, 'Communication Intelligence')
    setActiveModule(null)
  }

  const handleAptitude = (evidence: AptitudeEvidence) => {
    const next = applyAssessmentModule(assessment, platformData, domain, 'aptitude', { aptitudeEvidence: evidence })
    saveModule(next, 'aptitude', { aptitudeEvidence: evidence }, 'Aptitude Intelligence')
    setActiveModule(null)
  }

  const handleInterview = (session: MockInterviewSession) => {
    const next = applyAssessmentModule(assessment, platformData, domain, 'interview', { interviewScore: session.score })
    updateAssessment(next)
    recordExecution({ minutes: 30 })
    if (mongoOnline) {
      mongoAPI.saveMockInterview({ ...session } as unknown as Record<string, unknown>).then(dash => {
        const { assessment: a } = dashboardToAssessment(dash)
        if (a) syncAssessmentFromRemote(a)
        setApiCards(dash.cards as ReturnType<typeof getAssessmentModuleCards>)
        setApiPriority(dash.priority)
        setApiConfidence(dash.confidence)
      }).catch(() => {})
    } else if (backendOnline && studentIdFromStorage()) {
      backendAPI.saveMockInterview(studentIdFromStorage()!, session).catch(() => {})
    }
    pushNotification({
      title: 'New interview insights available',
      message: `Mock interview score: ${session.score}%. Review feedback in Interview Intelligence.`,
      type: 'success',
    })
    setActiveModule(null)
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-10">
      <header className="space-y-2">
        <p className="text-label">Assessment Center</p>
        <h1 className="text-display font-display">Build your evidence</h1>
        <p className="text-base max-w-xl" style={{ color: 'var(--text-2)' }}>
          Start with required modules to unlock your plan. Add recommended modules when ready — optional ones are there when you need them.
        </p>
        {mongoOnline && (
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full w-fit mt-2"
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--success)' }}>
            <LivePulse label="Synced" color="var(--success)" />
            {loading && <span className="ml-1 opacity-60">· updating</span>}
          </div>
        )}
      </header>

      <ReadinessConfidencePanel confidence={confidence} />

      {showPriority && priority && (
        <PriorityAssessmentPanel
          recommendation={priority}
          onTake={() => setActiveModule(priority.moduleId)}
          onSkip={() => persistSkip(priority.moduleId)}
        />
      )}

      <div className="space-y-10">
        {moduleGroups.required.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text)' }}>Required to unlock your plan</h2>
              <span className="badge badge-blue">
                {moduleGroups.required.filter(c => ['completed', 'connected'].includes(c.status)).length}/{moduleGroups.required.length} done
              </span>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
              {blockers.length > 0
                ? `Complete these to unlock your daily planner: ${blockers.map(b => b.label).join(', ')}.`
                : 'All required modules complete — your daily planner is unlocked.'}
            </p>
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-5" variants={staggerContainer} initial="hidden" animate="show">
              {moduleGroups.required.map((card, i) => (
                <motion.div key={card.module.id} variants={staggerItem} layout>
                  <AssessmentModuleCard card={card} onLaunch={() => setActiveModule(card.module.id)} delay={i * 0.05} />
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {moduleGroups.recommended.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text)' }}>Recommended when ready</h2>
              <span className="badge badge-gray">Sharper plans & scores</span>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
              Not required to start — connect these when your daily plan or target companies need them.
            </p>
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-5" variants={staggerContainer} initial="hidden" animate="show">
              {moduleGroups.recommended.map((card, i) => (
                <motion.div key={card.module.id} variants={staggerItem} layout>
                  <AssessmentModuleCard card={card} onLaunch={() => setActiveModule(card.module.id)} delay={i * 0.05} />
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {moduleGroups.optional.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text)' }}>Optional — use when you need it</h2>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
              Mock interviews and extras — open when your weekly plan suggests simulation or you want interview practice.
            </p>
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-5" variants={staggerContainer} initial="hidden" animate="show">
              {moduleGroups.optional.map((card, i) => (
                <motion.div key={card.module.id} variants={staggerItem} layout>
                  <AssessmentModuleCard card={card} onLaunch={() => setActiveModule(card.module.id)} delay={i * 0.05} />
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="p-6 text-sm rounded-2xl"
        style={{ background: 'var(--accent-soft)', color: 'var(--text-2)', border: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)' }}>
        <strong style={{ color: 'var(--text)' }}>How it works:</strong> Resume unlocks your planner. Recommended modules improve gap detection and daily tasks.
        Optional modules are guided by your weekly plan — use them when suggested, not all at once.
      </motion.div>

      <ModuleLauncher
        moduleId={activeModule}
        platformData={platformData}
        targetDomain={domain}
        onClose={() => setActiveModule(null)}
        onResumeComplete={handleResume}
        onCodingComplete={handleCoding}
        onCommComplete={handleComm}
        onAptitudeComplete={handleAptitude}
        onInterviewComplete={handleInterview}
        onGitHubComplete={handleGitHub}
      />
    </div>
  )
}
