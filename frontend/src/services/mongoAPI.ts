import type { Assessment, PlatformData, UserProfile, Application, FailureEntry, KnowledgeData } from '../types'
import type { AssessmentModuleId } from '../engine/assessmentEngine'

const BASE = import.meta.env.VITE_MONGO_API_URL || 'http://localhost:5000'

import { MONGO_TOKEN_KEY } from './storageKeys'

export function getMongoToken(): string | null {
  try { return localStorage.getItem(MONGO_TOKEN_KEY) } catch { return null }
}

export function setMongoToken(token: string | null) {
  if (token) localStorage.setItem(MONGO_TOKEN_KEY, token)
  else localStorage.removeItem(MONGO_TOKEN_KEY)
}

/** Returns false if token is missing, malformed, or past JWT exp. */
export function isMongoTokenValid(): boolean {
  const token = getMongoToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp && payload.exp * 1000 < Date.now() + 30_000) return false
    return true
  } catch {
    return false
  }
}

export function clearMongoTokenIfInvalid(): boolean {
  if (!getMongoToken()) return false
  if (isMongoTokenValid()) return true
  setMongoToken(null)
  return false
}

const AUTH_ERROR = /invalid or expired token|missing or invalid authorization/i

async function req<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getMongoToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    const msg = err.error || err.message || err.detail || res.statusText
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg)
    if (auth && res.status === 401 && AUTH_ERROR.test(text)) {
      setMongoToken(null)
    }
    throw new Error(text)
  }
  return res.json()
}

export type HealthDashboard = {
  profile: Assessment & { platformData?: PlatformData; skippedModules?: Record<string, string> }
  cards: { module: { id: AssessmentModuleId; title: string; impact: string; estimatedMinutes: number }; status: string; statusLabel: string; score?: number }[]
  priority: { moduleId: AssessmentModuleId; title: string; reason: string; potentialImpact: number; priority: number } | null
  confidence: { score: number; confidence: 'Low' | 'Medium' | 'High'; confidencePct: number; missingEvidence: string[]; measuredSections: number; totalSections: number }
  completedCount: number
  totalModules: number
}

export const mongoAPI = {
  ping: () => req<{ status: string; database: string; hint?: string }>('GET', '/health', undefined, false),

  register: (data: {
    email: string; password: string; name: string; college: string; branch: string
    graduationYear: number; targetRole: string; targetCompanies: string[]; weeklyHours: number; cgpa: number
  }) => req<{ token: string; user: Record<string, unknown> }>('POST', '/api/auth/register', data, false),

  login: (email: string, password: string) =>
    req<{ token: string; user: Record<string, unknown> }>('POST', '/api/auth/login', { email, password }, false),

  getDashboard: () => req<HealthDashboard>('GET', '/api/health-center/dashboard'),

  saveModule: (moduleId: AssessmentModuleId, payload: Record<string, unknown>) =>
    req<HealthDashboard>('POST', `/api/health-center/modules/${moduleId}`, payload),

  skipModule: (moduleId: AssessmentModuleId) =>
    req<HealthDashboard>('POST', `/api/health-center/skip/${moduleId}`, {}),

  saveMockInterview: (session: Record<string, unknown>) =>
    req<HealthDashboard>('POST', '/api/health-center/mock-interview', session),

  syncProfile: (data: Record<string, unknown>) =>
    req<HealthDashboard>('PUT', '/api/health-center/sync', data),

  getNotifications: () =>
    req<{ notifications: { _id: string; title: string; message: string; type: string; read: boolean; createdAt: string; moduleId?: string }[] }>(
      'GET', '/api/health-center/notifications'
    ),

  markNotificationsRead: () => req<{ success: boolean }>('POST', '/api/health-center/notifications/read', {}),

  getInterviewHistory: () =>
    req<{ history: Record<string, unknown>[] }>('GET', '/api/health-center/interviews'),

  dispatchNotification: (data: {
    title: string
    message: string
    type: 'info' | 'warning' | 'success' | 'danger'
    moduleId?: string
    channels?: { whatsapp?: boolean }
  }) => req<{ success: boolean }>('POST', '/api/notifications/dispatch', data),

  getNotificationStatus: () =>
    req<{ whatsappConfigured: boolean; pythonApi: string }>('GET', '/api/notifications/status'),

  whatsappDigest: (payload: Record<string, unknown>) =>
    req<{ status: string; sid?: string; reason?: string; to?: string; hint?: string; twilio_status?: string }>(
      'POST', '/api/notifications/whatsapp/digest', payload,
    ),

  whatsappWeeklyReport: (payload: Record<string, unknown>) =>
    req<{ status: string; sid?: string; reason?: string; to?: string; hint?: string; twilio_status?: string }>(
      'POST', '/api/notifications/whatsapp/weekly-report', payload,
    ),

  whatsappNotify: (phone: string, message: string) =>
    req<{ status: string; reason?: string; hint?: string; to?: string; twilio_status?: string }>(
      'POST', '/api/notifications/whatsapp/notify', { phone, message },
    ),

  whatsappApplicationAlert: (payload: Record<string, unknown>) =>
    req<{ status: string; reason?: string; to?: string }>('POST', '/api/notifications/whatsapp/application-alert', payload),

  triggerDailyDigest: () =>
    req<{ status: string; sid?: string; reason?: string; to?: string; hint?: string; twilio_status?: string }>(
      'POST', '/api/notifications/trigger/daily-digest', {},
    ),

  triggerWeeklyReport: () =>
    req<{ status: string; sid?: string; reason?: string; to?: string; hint?: string; twilio_status?: string }>(
      'POST', '/api/notifications/trigger/weekly-report', {},
    ),

  triggerDailyChallenge: () =>
    req<{
      sent: boolean
      inApp?: boolean
      deliveredLive?: boolean
      whatsappDelivered?: boolean
      whatsappHint?: string
      hint?: string
      reason?: string
      title?: string
      message?: string
      skipped?: boolean
    }>('POST', '/api/notifications/trigger/daily-challenge', {}),

  getDailyChallenge: () =>
    req<{ title: string; slug: string; difficulty: string; topic: string; estimatedMins: number; url: string; date: string }>(
      'GET', '/api/notifications/daily-challenge',
    ),

  syncActivitySession: (data: {
    activityLog?: { date: string; tasksCompleted: number; hoursSpent: number; verifiedTasks?: number; executions?: number }[]
    notificationPrefs?: Record<string, boolean>
    phone?: string
  }  ) => req<{ success: boolean; daysInactive: number; shouldAlert: boolean }>(
    'PUT', '/api/notifications/sync-session', data,
  ),

  generateDailyPlan: (data: {
    date?: string
    mode?: 'daily' | 'weekly'
    completedYesterday?: string[]
    applications?: { company: string; role: string; status: string; deadline?: string }[]
    activityLog?: { date: string; tasksCompleted: number; hoursSpent: number; executions?: number }[]
  }) => req<{
    date?: string
    tasks?: { text: string; category: string; priority: string; estimatedMins: number; resourceUrl?: string; why?: string; impact?: string }[]
    days?: Record<string, { text: string; category: string; priority: string; estimatedMins: number; resourceUrl?: string }[]>
  }>('POST', '/api/planner/generate', data),

  analyzeCompanies: (data: {
    companies: string[]
    domain: string
    targetRole?: string
  }) => req<{
    analyzed: boolean
    model: string
    domain: string
    targetRole: string
    compatible: string[]
    incompatible: string[]
    companies: Array<{
      name: string
      compatible: boolean
      reason: string
      campusRoles: string[]
      hasAptitude?: boolean
      focusAreas?: string[]
    }>
    needsAptitude: boolean
    needsCommunication: boolean
    focusAreas: string[]
  }>('POST', '/api/companies/analyze', data, false),

  syncSession: (data: Record<string, unknown>) =>
    req<{ success: boolean; synced: Record<string, number | boolean> }>(
      'POST', '/api/users/sync-session', data,
    ),

  getSession: () =>
    req<{
      profile: UserProfile
      assessment: Assessment | null
      platformData: PlatformData | null
      applications: Application[]
      failures: FailureEntry[]
      activityLog: { date: string; tasksCompleted: number; hoursSpent: number; verifiedTasks?: number; executions?: number }[]
      knowledgeData?: KnowledgeData | null
      intelligenceEvents?: { phase: string; type: string; title: string; impact: string; at: string; meta?: Record<string, unknown> }[]
      syncedAt: string
    }>('GET', '/api/users/session'),

  getIntelligenceEvents: (limit = 40) =>
    req<{ events: { phase: string; type: string; title: string; impact: string; at: string }[]; syncedAt: string }>(
      'GET', `/api/users/intelligence-events?limit=${limit}`,
    ),

  recordIntelligenceEvent: (data: {
    phase: 'identity' | 'evidence' | 'intelligence' | 'execution'
    type: string
    title: string
    impact: string
    meta?: Record<string, unknown>
  }) => req<{ event: Record<string, unknown>; syncedAt: string }>('POST', '/api/users/intelligence-events', data),
}

export function profileToMongoRegister(user: UserProfile, password: string) {
  const hoursMap: Record<string, number> = {
    '0 – 5 hrs': 5, '5 – 10 hrs': 8, '10 – 20 hrs': 15, '20+ hrs': 25,
  }
  return {
    email: user.email,
    password,
    name: user.name,
    college: user.college || 'Not specified',
    branch: user.branch || 'Not specified',
    graduationYear: parseInt(user.graduationYear) || 2025,
    targetRole: user.targetRole || user.domain || 'Software Engineer',
    targetCompanies: user.targetCompanies || [],
    weeklyHours: hoursMap[user.weeklyHours] ?? 10,
    cgpa: parseFloat(user.cgpa) || 7,
    phone: user.phone || undefined,
  }
}

export function dashboardToAssessment(dashboard: HealthDashboard): { assessment: Assessment; platformData: PlatformData | null; skippedModules: Record<string, string> } {
  const p = dashboard.profile
  return {
    assessment: {
      dsa: p.dsa ?? 0,
      resume: p.resume ?? 0,
      projects: p.projects ?? 0,
      communication: p.communication ?? 0,
      aptitude: p.aptitude ?? 0,
      interview: p.interview ?? 0,
      completed: dashboard.completedCount >= 3,
      resumeEvidence: p.resumeEvidence as Assessment['resumeEvidence'],
      commEvidence: p.commEvidence as Assessment['commEvidence'],
      aptitudeEvidence: p.aptitudeEvidence as Assessment['aptitudeEvidence'],
      assessedAt: p.assessedAt as string | undefined,
    },
    platformData: (p.platformData as PlatformData) ?? null,
    skippedModules: p.skippedModules ?? {},
  }
}
