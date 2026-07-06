import type { Assessment, Application, ActivityLog, PlatformData } from '../types'
import type { GuidedFlow } from './guidedFlowEngine'
import { computeOverall } from './intelligence'
import { computeReadinessConfidence } from './assessmentEngine'

export type OperatingPhaseId = 'identity' | 'evidence' | 'intelligence' | 'execution'

export type PhaseStatus = 'complete' | 'active' | 'locked'

export interface OperatingPhase {
  id: OperatingPhaseId
  num: string
  title: string
  subtitle: string
  status: PhaseStatus
  progressPct: number
  impact: string
  unlocks: string
  nextAction?: string
  path?: string
}

export interface IntelligenceEvent {
  phase: OperatingPhaseId
  type: string
  title: string
  impact: string
  at: string
  meta?: Record<string, unknown>
}

export function buildOperatingPhases(
  flow: GuidedFlow,
  assessment: Assessment | null,
  platformData: PlatformData | null,
  applications: Application[],
  activityLog: ActivityLog[],
): OperatingPhase[] {
  const confidence = computeReadinessConfidence(assessment, platformData)
  const hasEvidence = flow.hasAssessmentEvidence
  const score = assessment && hasEvidence ? computeOverall(assessment) : 0
  const tasksDone = activityLog.reduce((s, d) => s + d.tasksCompleted, 0)
  const identityDone = flow.preferences.isComplete
  const evidenceDone = hasEvidence
  const intelligenceDone = hasEvidence && score > 0 && confidence.measuredSections >= 2
  const executionStarted = tasksDone > 0 || applications.length > 0

  const phases: Omit<OperatingPhase, 'status' | 'progressPct'>[] = [
    {
      id: 'identity',
      num: '01',
      title: 'Build Your Career Identity',
      subtitle: 'Role · Domain · Target Companies',
      impact: 'Shapes every benchmark, gap analysis, and daily priority.',
      unlocks: 'Personalized career blueprint & company filtering',
      nextAction: identityDone ? undefined : 'Complete onboarding preferences',
      path: '/onboarding',
    },
    {
      id: 'evidence',
      num: '02',
      title: 'Connect Your Evidence',
      subtitle: 'Resume · Coding · Projects · Assessments',
      impact: 'Feeds the unified evidence graph — no score without proof.',
      unlocks: 'Readiness modules, LeetCode/GitHub sync, gap detection',
      nextAction: !identityDone ? 'Finish identity first' : evidenceDone ? undefined : (flow.nextRequired?.title ?? 'Start Resume Intelligence'),
      path: flow.nextRequired?.path ?? '/health',
    },
    {
      id: 'intelligence',
      num: '03',
      title: 'Unlock Placement Intelligence',
      subtitle: 'Readiness · Gaps · Momentum · Risks',
      impact: `Current readiness: ${hasEvidence ? `${score}%` : '—'} · ${confidence.confidence} confidence`,
      unlocks: 'Placement odds, radar chart, resource recommendations',
      nextAction: !evidenceDone ? 'Add assessment evidence' : intelligenceDone ? undefined : 'Complete more assessment modules',
      path: '/health',
    },
    {
      id: 'execution',
      num: '04',
      title: 'Execute With Precision',
      subtitle: 'Daily Actions · Recovery · Pipeline',
      impact: tasksDone > 0
        ? `${tasksDone} tasks logged · ${applications.length} applications tracked`
        : 'Daily priorities sized to your weekly capacity',
      unlocks: 'Planner, application pipeline, momentum & recovery loops',
      nextAction: !intelligenceDone ? 'Unlock intelligence first' : executionStarted ? undefined : 'Complete one daily plan task',
      path: '/planner',
    },
  ]

  return phases.map((p, i) => {
    let status: PhaseStatus = 'locked'
    let progressPct = 0

    if (p.id === 'identity') {
      progressPct = identityDone ? 100 : flow.preferences.domain ? 60 : 20
      status = identityDone ? 'complete' : 'active'
    } else if (p.id === 'evidence') {
      if (!identityDone) status = 'locked'
      else if (evidenceDone) { status = 'complete'; progressPct = 100 }
      else { status = 'active'; progressPct = Math.round((confidence.measuredSections / Math.max(confidence.totalSections, 1)) * 100) }
    } else if (p.id === 'intelligence') {
      if (!evidenceDone) status = 'locked'
      else if (intelligenceDone) { status = 'complete'; progressPct = 100 }
      else { status = 'active'; progressPct = Math.min(score, 99) }
    } else if (p.id === 'execution') {
      if (!intelligenceDone) status = 'locked'
      else if (executionStarted && flow.setupComplete) { status = 'complete'; progressPct = 100 }
      else { status = 'active'; progressPct = Math.min(tasksDone * 15 + applications.length * 10, 95) }
    }

    if (status === 'locked' && i > 0) {
      const prev = phases[i - 1]
      const prevDone =
        (prev.id === 'identity' && identityDone) ||
        (prev.id === 'evidence' && evidenceDone) ||
        (prev.id === 'intelligence' && intelligenceDone)
      if (prevDone) status = 'active'
    }

    return { ...p, status, progressPct }
  })
}

export function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Not synced yet'
  const d = new Date(iso)
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 10) return 'Just now'
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
