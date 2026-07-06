import type { UserProfile, Assessment, Application, ActivityLog, PlatformData } from '../types'
import {
  computeReadinessConfidence,
  getAssessmentBlockers,
  getTopPriority,
  getAssessmentModuleCards,
  ASSESSMENT_MODULES,
  type AssessmentModuleId,
} from './assessmentEngine'

export type FlowPhase = 'required' | 'explore'

export interface GuidedStep {
  id: string
  phase: FlowPhase
  title: string
  reason: string
  impact: string
  path: string
  done: boolean
  locked: boolean
  lockReason?: string
  estimatedMins?: number
  priority: number
}

export interface UserPreferences {
  domain: string
  targetRole: string
  level: string
  weeklyHours: string
  goal: string
  targetCompanies: string[]
  isComplete: boolean
}

export interface GuidedFlow {
  preferences: UserPreferences
  requiredSteps: GuidedStep[]
  exploreSteps: GuidedStep[]
  nextRequired: GuidedStep | null
  setupComplete: boolean
  hasAssessmentEvidence: boolean
  progressPct: number
  completedRequired: number
  totalRequired: number
}

const EXPLORE_DEFS: {
  id: string
  title: string
  reason: (prefs: UserPreferences) => string
  path: string
  unlock: (ctx: FlowContext) => boolean
  lockReason: string
  priority: number
}[] = [
  {
    id: 'resources',
    title: 'Learning resources',
    reason: p => `Curated picks for ${p.domain}${p.targetCompanies.length ? ` · ${p.targetCompanies.slice(0, 2).join(', ')}` : ''}`,
    path: '/resources',
    unlock: c => c.hasEvidence,
    lockReason: 'Complete your first assessment to unlock',
    priority: 90,
  },
  {
    id: 'planner',
    title: 'Daily planner',
    reason: p => `Tasks sized for ${p.weeklyHours || 'your schedule'} · ${p.level || 'your level'}`,
    path: '/planner',
    unlock: c => c.blockers.length === 0,
    lockReason: 'Finish required assessments first',
    priority: 85,
  },
  {
    id: 'applications',
    title: 'Application tracker',
    reason: p => `Track ${p.goal === 'internship' ? 'internship' : 'placement'} applications`,
    path: '/applications',
    unlock: c => c.hasEvidence,
    lockReason: 'Complete your first assessment to unlock',
    priority: 80,
  },
  {
    id: 'momentum',
    title: 'Momentum center',
    reason: () => 'Streaks and activity from your completed tasks',
    path: '/momentum',
    unlock: c => c.tasksDone > 0,
    lockReason: 'Complete a daily plan task first',
    priority: 70,
  },
  {
    id: 'reports',
    title: 'Weekly reports',
    reason: () => 'Progress snapshots from your real activity',
    path: '/reports',
    unlock: c => c.hasEvidence,
    lockReason: 'Complete your first assessment to unlock',
    priority: 65,
  },
  {
    id: 'workspace',
    title: 'Career workspace',
    reason: p => `Module catalog for ${p.domain}`,
    path: '/workspace',
    unlock: c => c.hasEvidence,
    lockReason: 'Complete your first assessment to unlock',
    priority: 60,
  },
  {
    id: 'knowledge',
    title: 'Knowledge hub',
    reason: () => 'Notes, wiki, and interview prep journal',
    path: '/knowledge',
    unlock: c => c.preferences.isComplete,
    lockReason: 'Complete onboarding first',
    priority: 55,
  },
  {
    id: 'failures',
    title: 'Failure intelligence',
    reason: () => 'Log rejections and get recovery plans',
    path: '/failures',
    unlock: c => c.applications.length > 0,
    lockReason: 'Add an application first',
    priority: 50,
  },
  {
    id: 'notifications',
    title: 'Notifications & WhatsApp',
    reason: () => 'Optional alerts for deadlines and digests',
    path: '/settings',
    unlock: () => true,
    lockReason: '',
    priority: 40,
  },
]

interface FlowContext {
  user: UserProfile | null
  assessment: Assessment | null
  applications: Application[]
  activityLog: ActivityLog[]
  platformData: PlatformData | null
  skipped: Record<string, string>
  preferences: UserPreferences
  hasEvidence: boolean
  blockers: ReturnType<typeof getAssessmentBlockers>
  tasksDone: number
}

function buildPreferences(user: UserProfile | null): UserPreferences {
  if (!user) {
    return {
      domain: '',
      targetRole: '',
      level: '',
      weeklyHours: '',
      goal: '',
      targetCompanies: [],
      isComplete: false,
    }
  }
  const domain = user.domain?.trim() ?? ''
  return {
    domain,
    targetRole: user.targetRole?.trim() ?? '',
    level: user.level ?? '',
    weeklyHours: user.weeklyHours ?? '',
    goal: user.goal ?? '',
    targetCompanies: user.targetCompanies ?? [],
    isComplete: Boolean(domain),
  }
}

function moduleMins(id: AssessmentModuleId): number {
  return ASSESSMENT_MODULES.find(m => m.id === id)?.estimatedMinutes ?? 15
}

export function buildGuidedFlow(
  user: UserProfile | null,
  assessment: Assessment | null,
  applications: Application[],
  activityLog: ActivityLog[],
  platformData: PlatformData | null,
  skipped: Record<string, string> = {},
): GuidedFlow {
  const preferences = buildPreferences(user)
  const confidence = computeReadinessConfidence(assessment, platformData)
  const hasEvidence = confidence.measuredSections > 0
  const blockers = preferences.domain
    ? getAssessmentBlockers(preferences.domain, assessment, platformData)
    : []
  const tasksDone = activityLog.reduce((s, d) => s + d.tasksCompleted, 0)
  const moduleCards = getAssessmentModuleCards(assessment, platformData, skipped)

  const ctx: FlowContext = {
    user,
    assessment,
    applications,
    activityLog,
    platformData,
    skipped,
    preferences,
    hasEvidence,
    blockers,
    tasksDone,
  }

  const requiredSteps: GuidedStep[] = []

  if (!preferences.isComplete) {
    requiredSteps.push({
      id: 'onboarding',
      phase: 'required',
      title: 'Build your career identity',
      reason: 'Define role, domain, experience level, and target companies — creates your personalized career blueprint.',
      impact: 'Unlocks evidence modules, company filtering, and personalized benchmarks.',
      path: '/onboarding',
      done: false,
      locked: false,
      estimatedMins: 5,
      priority: 100,
    })
  }

  if (preferences.isComplete && !hasEvidence) {
    const top = getTopPriority(user, assessment, platformData, skipped)
    requiredSteps.push({
      id: 'first-assessment',
      phase: 'required',
      title: top?.title ?? 'Resume Intelligence',
      reason: top?.reason ?? `Connect resume evidence to activate placement intelligence for ${preferences.domain}.`,
      impact: 'Adds real evidence to your graph — readiness score updates immediately.',
      path: top ? `/health?module=${top.moduleId}` : '/health?module=resume',
      done: false,
      locked: false,
      estimatedMins: top ? moduleMins(top.moduleId) : 10,
      priority: 95,
    })
  }

  if (preferences.isComplete && hasEvidence) {
    for (const b of blockers) {
      const card = moduleCards.find(c => c.module.id === b.moduleId)
      if (card && ['completed', 'connected'].includes(card.status)) continue
      requiredSteps.push({
        id: `blocker-${b.moduleId}`,
        phase: 'required',
        title: b.label,
        reason: `Required for ${preferences.domain}${preferences.targetRole ? ` · ${preferences.targetRole}` : ''}`,
        impact: 'Closes a placement blocker — improves odds and daily plan accuracy.',
        path: b.path,
        done: false,
        locked: false,
        estimatedMins: moduleMins(b.moduleId),
        priority: 80 - requiredSteps.length,
      })
    }
  }

  if (preferences.isComplete && hasEvidence && blockers.length === 0 && applications.length === 0) {
    requiredSteps.push({
      id: 'first-application',
      phase: 'required',
      title: 'Connect application evidence',
      reason: preferences.targetCompanies.length
        ? `Track ${preferences.targetCompanies[0]} or another target — feeds pipeline intelligence`
        : 'Application data powers deadline alerts and placement outcome tracking',
      impact: 'Feeds placement probability and deadline intelligence.',
      path: '/applications',
      done: false,
      locked: false,
      estimatedMins: 3,
      priority: 50,
    })
  }

  if (preferences.isComplete && hasEvidence && blockers.length === 0 && tasksDone === 0) {
    requiredSteps.push({
      id: 'first-plan-task',
      phase: 'required',
      title: 'Execute your first daily priority',
      reason: `Action engine sized for ${preferences.weeklyHours || 'your capacity'} — complete one task to activate momentum tracking`,
      impact: 'Activates streak tracking, recovery detection, and execution analytics.',
      path: '/planner',
      done: false,
      locked: false,
      estimatedMins: 30,
      priority: 45,
    })
  }

  const activeRequired = requiredSteps.filter(s => {
    if (s.done) return false
    if (s.id === 'onboarding' && preferences.isComplete) return false
    if (s.id === 'first-assessment' && hasEvidence) return false
    if (s.id.startsWith('blocker-')) {
      const modId = s.id.replace('blocker-', '') as AssessmentModuleId
      const card = moduleCards.find(c => c.module.id === modId)
      if (card && ['completed', 'connected'].includes(card.status)) return false
    }
    if (s.id === 'first-application' && applications.length > 0) return false
    if (s.id === 'first-plan-task' && tasksDone > 0) return false
    return true
  })

  const totalRequired = requiredSteps.length
  const completedRequired = totalRequired - activeRequired.length

  const exploreSteps: GuidedStep[] = EXPLORE_DEFS.map(def => {
    const unlocked = def.unlock(ctx)
    const done =
      (def.id === 'applications' && applications.length > 0) ||
      (def.id === 'momentum' && tasksDone > 0) ||
      (def.id === 'notifications' && Boolean(user?.phone?.trim()))

    return {
      id: def.id,
      phase: 'explore',
      title: def.title,
      reason: def.reason(preferences),
      impact: unlocked
        ? 'Extends your intelligence layer with stored, retrievable data.'
        : `Complete prior phases to unlock — ${def.lockReason}`,
      path: def.path,
      done,
      locked: !unlocked,
      lockReason: unlocked ? undefined : def.lockReason,
      priority: def.priority,
    }
  }).sort((a, b) => b.priority - a.priority)

  const setupComplete = preferences.isComplete && hasEvidence && blockers.length === 0
  const progressPct = totalRequired > 0
    ? Math.round((completedRequired / totalRequired) * 100)
    : preferences.isComplete ? 100 : 0

  return {
    preferences,
    requiredSteps: activeRequired,
    exploreSteps,
    nextRequired: activeRequired[0] ?? null,
    setupComplete,
    hasAssessmentEvidence: hasEvidence,
    progressPct,
    completedRequired,
    totalRequired,
  }
}
