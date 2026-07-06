import type { Assessment, PlatformData, UserProfile, AptitudeEvidence, CommEvidence, ResumeEvidence } from '../types'
import { WEIGHTS, inferSections, computeOverall, computeGaps, computeFromEvidence, getRoleMandatorySections, getRecommendedAddons } from './intelligence'

export type AssessmentModuleId =
  | 'resume'
  | 'github'
  | 'coding'
  | 'communication'
  | 'aptitude'
  | 'interview'

export type ModuleStatus = 'completed' | 'connected' | 'pending' | 'optional' | 'skipped'

export interface AssessmentModuleDef {
  id: AssessmentModuleId
  title: string
  subtitle: string
  impact: 'High' | 'Medium' | 'Low'
  estimatedMinutes: number
  optional?: boolean
  weightPct: number
}

export const ASSESSMENT_MODULES: AssessmentModuleDef[] = [
  { id: 'resume', title: 'Resume Intelligence', subtitle: 'ATS analysis & impact scoring', impact: 'High', estimatedMinutes: 2, weightPct: Math.round(WEIGHTS.resume * 100) },
  { id: 'github', title: 'GitHub Intelligence', subtitle: 'Repos, commits & project evidence', impact: 'High', estimatedMinutes: 1, weightPct: Math.round(WEIGHTS.projects * 100) },
  { id: 'coding', title: 'Coding Intelligence', subtitle: 'LeetCode, HackerRank & contests', impact: 'High', estimatedMinutes: 3, weightPct: Math.round(WEIGHTS.dsa * 100) },
  { id: 'communication', title: 'Communication Intelligence', subtitle: 'Voice-based fluency & confidence', impact: 'Medium', estimatedMinutes: 4, weightPct: Math.round(WEIGHTS.communication * 100) },
  { id: 'aptitude', title: 'Aptitude Intelligence', subtitle: 'Adaptive quant, logic & verbal', impact: 'Medium', estimatedMinutes: 8, weightPct: Math.round(WEIGHTS.aptitude * 100) },
  { id: 'interview', title: 'Interview Intelligence', subtitle: 'AI mock interviews & feedback', impact: 'High', estimatedMinutes: 10, optional: true, weightPct: Math.round(WEIGHTS.interview * 100) },
]

export interface ModuleCardState {
  module: AssessmentModuleDef
  status: ModuleStatus
  statusLabel: string
  score?: number
}

export interface PriorityRecommendation {
  moduleId: AssessmentModuleId
  title: string
  reason: string
  potentialImpact: number
  priority: number
}

export interface ReadinessConfidence {
  score: number
  confidence: 'Low' | 'Medium' | 'High'
  confidencePct: number
  missingEvidence: string[]
  measuredSections: number
  totalSections: number
}

function moduleStatus(
  id: AssessmentModuleId,
  assessment: Assessment | null,
  platformData: PlatformData | null,
  skipped: Record<string, string>,
): { status: ModuleStatus; label: string; score?: number } {
  const sections = assessment ? inferSections(assessment) : null

  if (skipped[id]) return { status: 'skipped', label: 'Skipped' }

  switch (id) {
    case 'resume':
      if (assessment?.resumeEvidence) return { status: 'completed', label: 'Completed', score: assessment.resume }
      return { status: 'pending', label: 'Pending' }
    case 'github':
      if (platformData?.github) return { status: 'connected', label: 'Connected', score: assessment?.projects }
      return { status: 'pending', label: 'Not Connected' }
    case 'coding':
      if (platformData?.leetcode) return { status: 'completed', label: 'Connected', score: assessment?.dsa }
      return { status: 'pending', label: 'Pending' }
    case 'communication':
      if (assessment?.commEvidence && assessment.commEvidence.method !== 'skipped')
        return { status: 'completed', label: 'Completed', score: assessment.communication }
      return { status: 'pending', label: 'Pending' }
    case 'aptitude':
      if (assessment?.aptitudeEvidence)
        return { status: 'completed', label: 'Completed', score: assessment.aptitude }
      return { status: 'pending', label: 'Pending' }
    case 'interview':
      if ((assessment?.interview ?? 0) > 0)
        return { status: 'completed', label: 'Completed', score: assessment!.interview }
      return { status: 'optional', label: 'Optional' }
    default:
      return { status: 'pending', label: 'Pending' }
  }
}

export function getAssessmentModuleCards(
  assessment: Assessment | null,
  platformData: PlatformData | null,
  skipped: Record<string, string> = {},
): ModuleCardState[] {
  return ASSESSMENT_MODULES.map(m => {
    const s = moduleStatus(m.id, assessment, platformData, skipped)
    return { module: m, status: s.status, statusLabel: s.label, score: s.score }
  })
}

export function rankAssessmentPriorities(
  user: UserProfile | null,
  assessment: Assessment | null,
  platformData: PlatformData | null,
  skipped: Record<string, string> = {},
): PriorityRecommendation[] {
  const domain = user?.domain ?? 'Software Engineering'
  const cards = getAssessmentModuleCards(assessment, platformData, skipped)
  const incomplete = cards.filter(c => !['completed', 'connected'].includes(c.status) && c.status !== 'skipped')

  const recs: PriorityRecommendation[] = incomplete.map(c => {
    let reason = ''
    let priority = 50

    switch (c.module.id) {
      case 'resume':
        reason = `Resume contributes ${c.module.weightPct}% of readiness. Without it, your score is estimated, not evidence-based.`
        priority = 95
        break
      case 'github':
        reason = `Project readiness (${c.module.weightPct}% weight) is unknown without GitHub evidence.`
        priority = 85
        break
      case 'coding':
        reason = `DSA contributes ${c.module.weightPct}% of readiness. Connect LeetCode to unlock coding intelligence.`
        priority = 90
        break
      case 'communication':
        reason = `Communication confidence contributes ${c.module.weightPct}% of readiness and is currently unknown.`
        priority = 80
        break
      case 'aptitude':
        reason = `Aptitude (${c.module.weightPct}% weight) is missing — campus OAs heavily test quant & logic.`
        priority = 75
        break
      case 'interview':
        reason = `Mock interviews (${c.module.weightPct}% weight) simulate real placement pressure and reveal blind spots.`
        priority = 60
        break
    }

    const gaps = assessment ? computeGaps(assessment, domain) : []
    const relatedGap = gaps.find(g =>
      (c.module.id === 'coding' && g.key === 'dsa') ||
      (c.module.id === 'communication' && g.key === 'communication') ||
      (c.module.id === 'aptitude' && g.key === 'aptitude') ||
      (c.module.id === 'resume' && g.key === 'resume') ||
      (c.module.id === 'github' && g.key === 'projects'),
    )
    if (relatedGap && relatedGap.gap > 0) {
      reason += ` Gap detected: ${relatedGap.label} is ${relatedGap.gap}pts below target.`
      priority += Math.min(relatedGap.gap, 15)
    }

    return {
      moduleId: c.module.id,
      title: c.module.title,
      reason,
      potentialImpact: Math.min(Math.round(c.module.weightPct * 0.5 + (relatedGap?.gap ?? 0) * 0.3), 20),
      priority,
    }
  })

  return recs.sort((a, b) => b.priority - a.priority)
}

export function getTopPriority(
  user: UserProfile | null,
  assessment: Assessment | null,
  platformData: PlatformData | null,
  skipped: Record<string, string> = {},
): PriorityRecommendation | null {
  const ranked = rankAssessmentPriorities(user, assessment, platformData, skipped)
  return ranked[0] ?? null
}

export function computeReadinessConfidence(
  assessment: Assessment | null,
  platformData: PlatformData | null,
): ReadinessConfidence {
  const sections = assessment ? inferSections(assessment) : { leetcode: false, github: false, resume: false, aptitude: false, communication: false }
  const checks = [
    { key: 'Resume', done: sections.resume },
    { key: 'GitHub', done: sections.github },
    { key: 'Coding (LeetCode)', done: sections.leetcode },
    { key: 'Communication', done: sections.communication },
    { key: 'Aptitude', done: sections.aptitude },
    { key: 'Interview', done: (assessment?.interview ?? 0) > 0 },
  ]
  const measured = checks.filter(c => c.done).length
  const total = checks.length
  const missingEvidence = checks.filter(c => !c.done).map(c => `${c.key} Missing`)

  let confidence: ReadinessConfidence['confidence'] = 'Low'
  const confidencePct = Math.round((measured / total) * 100)
  if (confidencePct >= 75) confidence = 'High'
  else if (confidencePct >= 45) confidence = 'Medium'

  const score = assessment ? computeOverall(assessment) : 0

  return { score, confidence, confidencePct, missingEvidence, measuredSections: measured, totalSections: total }
}

export function buildAssessmentNotifications(
  user: UserProfile | null,
  assessment: Assessment | null,
  platformData: PlatformData | null,
  skipped: Record<string, string>,
): { title: string; message: string; type: 'info' | 'warning' | 'success'; moduleId?: AssessmentModuleId }[] {
  const msgs: { title: string; message: string; type: 'info' | 'warning' | 'success'; moduleId?: AssessmentModuleId }[] = []
  const top = getTopPriority(user, assessment, platformData, skipped)
  const conf = computeReadinessConfidence(assessment, platformData)

  if (top) {
    msgs.push({
      title: `${top.title} pending`,
      message: top.reason.slice(0, 120) + (top.reason.length > 120 ? '…' : ''),
      type: 'warning',
      moduleId: top.moduleId,
    })
  }

  if (conf.confidence === 'Low') {
    msgs.push({
      title: 'Low readiness confidence',
      message: `Complete ${conf.missingEvidence.slice(0, 2).join(' & ')} to improve accuracy (+${Math.min(20, conf.totalSections - conf.measuredSections) * 4} potential).`,
      type: 'info',
    })
  }

  if (platformData?.leetcode && assessment?.dsa) {
    msgs.push({
      title: 'Coding profile active',
      message: `LeetCode connected — DSA score ${assessment.dsa}%. Retake coding intelligence after solving more problems.`,
      type: 'success',
      moduleId: 'coding',
    })
  }

  return msgs
}

export function applyAssessmentModule(
  current: Assessment | null,
  platformData: PlatformData | null,
  domain: string,
  moduleId: AssessmentModuleId,
  payload: {
    platformData?: PlatformData
    resumeEvidence?: ResumeEvidence
    commEvidence?: CommEvidence
    aptitudeEvidence?: AptitudeEvidence
    interviewScore?: number
    dsaScore?: number
    projectsScore?: number
  },
): Assessment {
  const platform = payload.platformData ?? platformData ?? { leetcode: null, github: null, fetchedAt: new Date().toISOString() }
  const resume = payload.resumeEvidence ?? current?.resumeEvidence ?? null
  const comm = payload.commEvidence ?? current?.commEvidence ?? null
  const aptitude = payload.aptitudeEvidence ?? current?.aptitudeEvidence ?? null

  const base = computeFromEvidence(platform, resume, comm, aptitude, domain)

  if (payload.dsaScore !== undefined) base.dsa = payload.dsaScore
  if (payload.projectsScore !== undefined) base.projects = payload.projectsScore
  if (payload.interviewScore !== undefined) base.interview = payload.interviewScore

  base.completed = current?.completed ?? false
  base.assessedAt = new Date().toISOString()

  return base
}

const ADDON_TO_MODULE: Record<string, AssessmentModuleId> = {
  leetcode: 'coding',
  github: 'github',
  aptitude: 'aptitude',
  communication: 'communication',
}

export interface AssessmentModuleGroups {
  required: ModuleCardState[]
  recommended: ModuleCardState[]
  optional: ModuleCardState[]
}

/** Split modules into required (unlock plan), recommended add-ons, and optional extras. */
export function getAssessmentModuleGroups(
  domain: string,
  assessment: Assessment | null,
  platformData: PlatformData | null,
  skipped: Record<string, string> = {},
): AssessmentModuleGroups {
  const cards = getAssessmentModuleCards(assessment, platformData, skipped)
  const byId = Object.fromEntries(cards.map(c => [c.module.id, c])) as Record<AssessmentModuleId, ModuleCardState>
  const mandatory = getRoleMandatorySections(domain)
  const sections = assessment ? inferSections(assessment) : null

  const requiredIds = new Set<AssessmentModuleId>()
  if (!sections?.resume) requiredIds.add('resume')
  if (mandatory.aptitude && !sections?.aptitude) requiredIds.add('aptitude')
  if (mandatory.communication && !assessment?.commEvidence) requiredIds.add('communication')
  if (mandatory.leetcode && !sections?.leetcode) requiredIds.add('coding')
  if (mandatory.github && !sections?.github) requiredIds.add('github')

  const required = [...requiredIds].map(id => byId[id]).filter(Boolean)

  const recommendedIds = new Set<AssessmentModuleId>()
  for (const addon of getRecommendedAddons(domain, assessment)) {
    if (addon.mandatory) continue
    const moduleId = ADDON_TO_MODULE[addon.key]
    if (!moduleId || requiredIds.has(moduleId)) continue
    const card = byId[moduleId]
    if (card && !['completed', 'connected', 'skipped'].includes(card.status)) {
      recommendedIds.add(moduleId)
    }
  }

  const recommended = [...recommendedIds].map(id => byId[id]).filter(Boolean)

  const optional = cards.filter(c =>
    (c.module.id === 'interview' || c.module.optional) &&
    !['completed', 'skipped'].includes(c.status),
  )

  const used = new Set([...required, ...recommended, ...optional].map(c => c.module.id))
  const remaining = cards.filter(c =>
    !used.has(c.module.id) &&
    !['completed', 'connected', 'skipped'].includes(c.status),
  )

  return {
    required,
    recommended: [...recommended, ...remaining.filter(c => !c.module.optional)],
    optional: optional.filter(c => c.module.id === 'interview' || c.module.optional),
  }
}

export interface AssessmentBlocker {
  moduleId: AssessmentModuleId
  label: string
  path: string
}

/** Modules still required before Daily Planner and full analysis unlock. */
export function getAssessmentBlockers(
  domain: string,
  assessment: Assessment | null,
  platformData: PlatformData | null,
): AssessmentBlocker[] {
  const mandatory = getRoleMandatorySections(domain)
  const sections = assessment
    ? inferSections(assessment)
    : { leetcode: false, github: false, resume: false, aptitude: false, communication: false }
  const blockers: AssessmentBlocker[] = []

  const add = (moduleId: AssessmentModuleId, label: string) => {
    blockers.push({ moduleId, label, path: `/health?module=${moduleId}` })
  }

  if (!assessment?.resumeEvidence) add('resume', 'Resume Intelligence')
  if (mandatory.aptitude && !assessment?.aptitudeEvidence) add('aptitude', 'Aptitude Assessment')
  if (mandatory.communication && (!assessment?.commEvidence || assessment.commEvidence.method === 'skipped')) {
    add('communication', 'Communication Check')
  }
  if (mandatory.leetcode && !sections.leetcode) add('coding', 'Coding / LeetCode')
  if (mandatory.github && !sections.github) add('github', 'GitHub Profile')

  return blockers
}
