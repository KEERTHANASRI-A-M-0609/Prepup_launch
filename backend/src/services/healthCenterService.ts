import { CareerProfile, ICareerProfile } from '../models/CareerProfile'
import { MockInterview } from '../models/MockInterview'
import { Notification } from '../models/Notification'
import { Assessment } from '../models/Assessment'
import { User } from '../models/User'
import { notificationDispatch } from './notificationDispatch'
import { logger } from '../utils/logger'

export const WEIGHTS = {
  dsa: 0.25,
  projects: 0.20,
  resume: 0.15,
  aptitude: 0.15,
  communication: 0.15,
  interview: 0.10,
} as const

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
  { id: 'resume', title: 'Resume Intelligence', subtitle: 'ATS analysis & impact scoring', impact: 'High', estimatedMinutes: 2, weightPct: 15 },
  { id: 'github', title: 'GitHub Intelligence', subtitle: 'Repos, commits & project evidence', impact: 'High', estimatedMinutes: 1, weightPct: 20 },
  { id: 'coding', title: 'Coding Intelligence', subtitle: 'LeetCode, HackerRank & contests', impact: 'High', estimatedMinutes: 3, weightPct: 25 },
  { id: 'communication', title: 'Communication Intelligence', subtitle: 'Voice-based fluency & confidence', impact: 'Medium', estimatedMinutes: 4, weightPct: 15 },
  { id: 'aptitude', title: 'Aptitude Intelligence', subtitle: 'Adaptive quant, logic & verbal', impact: 'Medium', estimatedMinutes: 8, weightPct: 15 },
  { id: 'interview', title: 'Interview Intelligence', subtitle: 'AI mock interviews & feedback', impact: 'High', estimatedMinutes: 10, optional: true, weightPct: 10 },
]

interface ProfileLike {
  dsa: number
  resume: number
  projects: number
  communication: number
  aptitude: number
  interview: number
  resumeEvidence?: Record<string, unknown> | null
  commEvidence?: Record<string, unknown> | null
  aptitudeEvidence?: Record<string, unknown> | null
  platformData?: Record<string, unknown> | null
  skippedModules?: Record<string, string>
}

function inferSections(p: ProfileLike) {
  const platform = p.platformData as { leetcode?: unknown; github?: unknown } | null
  return {
    leetcode: p.dsa > 0 || !!platform?.leetcode,
    github: p.projects > 0 || !!platform?.github,
    resume: !!p.resumeEvidence || p.resume > 0,
    aptitude: !!p.aptitudeEvidence || p.aptitude > 0,
    communication: !!p.commEvidence && (p.commEvidence as { method?: string }).method !== 'skipped',
  }
}

function computeOverall(p: ProfileLike): number {
  const s = inferSections(p)
  let weighted = 0
  let totalW = 0
  if (s.leetcode) { weighted += p.dsa * WEIGHTS.dsa; totalW += WEIGHTS.dsa }
  if (s.github) { weighted += p.projects * WEIGHTS.projects; totalW += WEIGHTS.projects }
  if (s.resume) { weighted += p.resume * WEIGHTS.resume; totalW += WEIGHTS.resume }
  if (s.aptitude) { weighted += p.aptitude * WEIGHTS.aptitude; totalW += WEIGHTS.aptitude }
  if (s.communication) { weighted += p.communication * WEIGHTS.communication; totalW += WEIGHTS.communication }
  if (p.interview > 0) { weighted += p.interview * WEIGHTS.interview; totalW += WEIGHTS.interview }
  if (totalW === 0) return 0
  return Math.round(weighted / totalW)
}

function moduleStatus(
  id: AssessmentModuleId,
  p: ProfileLike,
): { status: ModuleStatus; label: string; score?: number } {
  const skipped = p.skippedModules ?? {}
  const platform = p.platformData as { leetcode?: unknown; github?: unknown } | null

  if (skipped[id]) return { status: 'skipped', label: 'Skipped' }

  switch (id) {
    case 'resume':
      if (p.resumeEvidence) return { status: 'completed', label: 'Completed', score: p.resume }
      return { status: 'pending', label: 'Pending' }
    case 'github':
      if (platform?.github) return { status: 'connected', label: 'Connected', score: p.projects }
      return { status: 'pending', label: 'Not Connected' }
    case 'coding':
      if (platform?.leetcode) return { status: 'completed', label: 'Connected', score: p.dsa }
      return { status: 'pending', label: 'Pending' }
    case 'communication':
      if (p.commEvidence && (p.commEvidence as { method?: string }).method !== 'skipped')
        return { status: 'completed', label: 'Completed', score: p.communication }
      return { status: 'pending', label: 'Pending' }
    case 'aptitude':
      if (p.aptitudeEvidence) return { status: 'completed', label: 'Completed', score: p.aptitude }
      return { status: 'pending', label: 'Pending' }
    case 'interview':
      if (p.interview > 0) return { status: 'completed', label: 'Completed', score: p.interview }
      return { status: 'optional', label: 'Optional' }
    default:
      return { status: 'pending', label: 'Pending' }
  }
}

export function getModuleCards(p: ProfileLike) {
  return ASSESSMENT_MODULES.map(m => {
    const s = moduleStatus(m.id, p)
    return { module: m, status: s.status, statusLabel: s.label, score: s.score }
  })
}

export function rankPriorities(p: ProfileLike) {
  const cards = getModuleCards(p)
  const incomplete = cards.filter(c => !['completed', 'connected'].includes(c.status) && c.status !== 'skipped')

  return incomplete.map(c => {
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

    return {
      moduleId: c.module.id,
      title: c.module.title,
      reason,
      potentialImpact: Math.min(Math.round(c.module.weightPct * 0.5), 20),
      priority,
    }
  }).sort((a, b) => b.priority - a.priority)
}

export function computeConfidence(p: ProfileLike) {
  const s = inferSections(p)
  const checks = [
    { key: 'Resume', done: s.resume },
    { key: 'GitHub', done: s.github },
    { key: 'Coding (LeetCode)', done: s.leetcode },
    { key: 'Communication', done: s.communication },
    { key: 'Aptitude', done: s.aptitude },
    { key: 'Interview', done: p.interview > 0 },
  ]
  const measured = checks.filter(c => c.done).length
  const total = checks.length
  const missingEvidence = checks.filter(c => !c.done).map(c => `${c.key} Missing`)

  let confidence: 'Low' | 'Medium' | 'High' = 'Low'
  const confidencePct = Math.round((measured / total) * 100)
  if (confidencePct >= 75) confidence = 'High'
  else if (confidencePct >= 45) confidence = 'Medium'

  return {
    score: computeOverall(p),
    confidence,
    confidencePct,
    missingEvidence,
    measuredSections: measured,
    totalSections: total,
  }
}

function profileToPlain(p: ICareerProfile): ProfileLike {
  return {
    dsa: p.dsa,
    resume: p.resume,
    projects: p.projects,
    communication: p.communication,
    aptitude: p.aptitude,
    interview: p.interview,
    resumeEvidence: p.resumeEvidence as Record<string, unknown> | undefined,
    commEvidence: p.commEvidence as Record<string, unknown> | undefined,
    aptitudeEvidence: p.aptitudeEvidence as Record<string, unknown> | undefined,
    platformData: p.platformData as Record<string, unknown> | undefined,
    skippedModules: (p.skippedModules as Record<string, string>) ?? {},
  }
}

async function persistAssessmentHistory(userId: string, profile: ICareerProfile) {
  try {
    const assessment = new Assessment({
      userId,
      dsa: profile.dsa,
      projects: profile.projects,
      resume: profile.resume,
      communication: profile.communication ?? null,
      aptitude: profile.aptitude ?? null,
      interview: profile.interview,
      overall: profile.overall,
      details: {
        dsa: { easyCount: 0, mediumCount: 0, hardCount: 0, platforms: [], lastUpdated: new Date() },
        projects: { count: 0, complexity: [], hasGithub: !!(profile.platformData as { github?: unknown })?.github, lastUpdated: new Date() },
        resume: { atsScore: profile.resume, completeness: profile.resume, uploadedAt: new Date() },
      },
      completedAt: new Date(),
    })
    await assessment.save()
  } catch (err) {
    logger.warn('Assessment history save skipped:', err)
  }
}

async function createNotification(
  userId: string,
  data: { title: string; message: string; type: 'info' | 'warning' | 'success' | 'danger'; moduleId?: string }
) {
  await notificationDispatch.createAndDispatch(userId, data)
}

export const healthCenterService = {
  async getOrCreateProfile(userId: string): Promise<ICareerProfile> {
    let profile = await CareerProfile.findOne({ userId })
    if (!profile) {
      profile = await CareerProfile.create({ userId })
    }
    return profile
  },

  async getDashboard(userId: string) {
    const profile = await this.getOrCreateProfile(userId)
    const plain = profileToPlain(profile)
    const cards = getModuleCards(plain)
    const priorities = rankPriorities(plain)
    const confidence = computeConfidence(plain)
    const priority = priorities[0] ?? null

    return {
      profile: this.serializeProfile(profile),
      cards,
      priority,
      confidence,
      completedCount: cards.filter(c => ['completed', 'connected'].includes(c.status)).length,
      totalModules: cards.length,
    }
  },

  serializeProfile(profile: ICareerProfile) {
    return {
      dsa: profile.dsa,
      resume: profile.resume,
      projects: profile.projects,
      communication: profile.communication,
      aptitude: profile.aptitude,
      interview: profile.interview,
      overall: profile.overall,
      resumeEvidence: profile.resumeEvidence,
      commEvidence: profile.commEvidence,
      aptitudeEvidence: profile.aptitudeEvidence,
      platformData: profile.platformData,
      codingProfile: profile.codingProfile,
      skippedModules: profile.skippedModules,
      assessedAt: profile.assessedAt,
    }
  },

  async saveModule(
    userId: string,
    moduleId: AssessmentModuleId,
    payload: Record<string, unknown>
  ) {
    const profile = await this.getOrCreateProfile(userId)

    switch (moduleId) {
      case 'resume':
        profile.resumeEvidence = payload.resumeEvidence as Record<string, unknown>
        profile.resume = (payload.score as number) ?? profile.resume
        break
      case 'github':
        profile.platformData = payload.platformData as Record<string, unknown>
        profile.projects = (payload.score as number) ?? profile.projects
        break
      case 'coding':
        profile.platformData = payload.platformData as Record<string, unknown>
        profile.codingProfile = payload.codingProfile as Record<string, unknown>
        profile.dsa = (payload.dsaScore as number) ?? (payload.score as number) ?? profile.dsa
        if (payload.projectsScore !== undefined) profile.projects = payload.projectsScore as number
        break
      case 'communication':
        profile.commEvidence = payload.commEvidence as Record<string, unknown>
        profile.communication = (payload.commEvidence as { score?: number })?.score ?? profile.communication
        break
      case 'aptitude':
        profile.aptitudeEvidence = payload.aptitudeEvidence as Record<string, unknown>
        profile.aptitude = (payload.aptitudeEvidence as { score?: number })?.score ?? profile.aptitude
        break
      case 'interview':
        profile.interview = (payload.interviewScore as number) ?? profile.interview
        break
    }

    profile.overall = computeOverall(profileToPlain(profile))
    profile.assessedAt = new Date()
    await profile.save()
    await persistAssessmentHistory(userId, profile)

    const moduleTitles: Record<AssessmentModuleId, string> = {
      resume: 'Resume Intelligence',
      github: 'GitHub Intelligence',
      coding: 'Coding Intelligence',
      communication: 'Communication Intelligence',
      aptitude: 'Aptitude Intelligence',
      interview: 'Interview Intelligence',
    }

    await createNotification(userId, {
      title: `${moduleTitles[moduleId]} complete`,
      message: 'Readiness score updated. Check your confidence model.',
      type: 'success',
      moduleId,
    })

    if (moduleId === 'coding') {
      await createNotification(userId, {
        title: 'Your coding profile was updated',
        message: `DSA readiness is now ${profile.dsa}%. Retake after solving more problems.`,
        type: 'info',
        moduleId: 'coding',
      })
    }

    return this.getDashboard(userId)
  },

  async skipModule(userId: string, moduleId: AssessmentModuleId) {
    const profile = await this.getOrCreateProfile(userId)
    const skipped = { ...(profile.skippedModules as Record<string, string> ?? {}), [moduleId]: new Date().toISOString() }
    profile.skippedModules = skipped
    await profile.save()
    return this.getDashboard(userId)
  },

  async saveMockInterview(userId: string, session: Record<string, unknown>) {
    await MockInterview.create({
      userId,
      sessionId: (session.id as string) || `mi_${Date.now()}`,
      type: (session.type as 'technical' | 'behavioral' | 'mixed') || 'mixed',
      score: session.score as number,
      problemSolving: (session.problemSolving as number) ?? 0,
      communication: (session.communication as number) ?? 0,
      technicalDepth: (session.technicalDepth as number) ?? 0,
      confidence: (session.confidence as number) ?? 0,
      feedback: (session.feedback as string[]) ?? [],
      questions: (session.questions as string[]) ?? [],
      transcript: (session.transcript as string) ?? '',
    })

    const result = await this.saveModule(userId, 'interview', { interviewScore: session.score })

    await createNotification(userId, {
      title: 'New interview insights available',
      message: `Mock interview score: ${session.score}%. Review feedback in Interview Intelligence.`,
      type: 'success',
      moduleId: 'interview',
    })

    return result
  },

  async syncProfile(userId: string, data: Record<string, unknown>) {
    const profile = await this.getOrCreateProfile(userId)
    const fields = ['dsa', 'resume', 'projects', 'communication', 'aptitude', 'interview'] as const
    for (const f of fields) {
      if (data[f] !== undefined) (profile as unknown as Record<string, number>)[f] = data[f] as number
    }
    if (data.resumeEvidence) profile.resumeEvidence = data.resumeEvidence as Record<string, unknown>
    if (data.commEvidence) profile.commEvidence = data.commEvidence as Record<string, unknown>
    if (data.aptitudeEvidence) profile.aptitudeEvidence = data.aptitudeEvidence as Record<string, unknown>
    if (data.platformData) profile.platformData = data.platformData as Record<string, unknown>
    if (data.codingProfile) profile.codingProfile = data.codingProfile as Record<string, unknown>
    if (data.skippedModules) profile.skippedModules = data.skippedModules as Record<string, string>
    profile.overall = computeOverall(profileToPlain(profile))
    profile.assessedAt = new Date()
    await profile.save()
    if (data.phone && typeof data.phone === 'string') {
      await User.findByIdAndUpdate(userId, { phone: data.phone })
    }
    return this.getDashboard(userId)
  },

  async getInterviewHistory(userId: string, limit = 20) {
    return MockInterview.find({ userId }).sort({ completedAt: -1 }).limit(limit)
  },

  async generateNotifications(userId: string) {
    const profile = await this.getOrCreateProfile(userId)
    const plain = profileToPlain(profile)
    const priority = rankPriorities(plain)[0]
    const confidence = computeConfidence(plain)
    const created: unknown[] = []

    if (priority) {
      const n = await createNotification(userId, {
        title: `${priority.title} pending`,
        message: priority.reason.slice(0, 140),
        type: 'warning',
        moduleId: priority.moduleId,
      })
      created.push(n)
    }

    if (confidence.confidence === 'Low') {
      const n = await createNotification(userId, {
        title: 'Complete assessments to improve readiness accuracy',
        message: `Missing: ${confidence.missingEvidence.slice(0, 2).join(', ')}. Each module increases confidence.`,
        type: 'info',
      })
      created.push(n)
    }

    if (!plain.commEvidence) {
      const n = await createNotification(userId, {
        title: 'Communication assessment pending',
        message: 'Voice assessment adds 15% to readiness accuracy. Open Career Health Center.',
        type: 'warning',
        moduleId: 'communication',
      })
      created.push(n)
    }

    if (!plain.aptitudeEvidence) {
      const n = await createNotification(userId, {
        title: 'Complete aptitude assessment to improve readiness accuracy',
        message: 'Adaptive quant, logic & verbal test — 8 minutes in Career Health Center.',
        type: 'info',
        moduleId: 'aptitude',
      })
      created.push(n)
    }

    return created
  },

  async getNotifications(userId: string, limit = 50) {
    return Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit)
  },

  async markNotificationsRead(userId: string) {
    await Notification.updateMany({ userId, read: false }, { read: true })
    return { success: true }
  },

  async ensureUserFromProfile(email: string, password: string, profile: Record<string, unknown>) {
    let user = await User.findOne({ email: email.toLowerCase() }).select('+password')
    if (!user) {
      user = new User({
        email: email.toLowerCase(),
        password,
        name: profile.name || 'User',
        college: profile.college || '',
        branch: profile.branch || '',
        graduationYear: parseInt(String(profile.graduationYear)) || 2025,
        cgpa: parseFloat(String(profile.cgpa)) || 0,
        targetRole: profile.domain || profile.targetRole || 'Software Engineer',
        targetCompanies: profile.targetCompanies || [],
        weeklyHours: parseInt(String(profile.weeklyHours)) || 10,
        onboardingCompleted: true,
      })
      await user.save()
    }
    return user
  },
}
