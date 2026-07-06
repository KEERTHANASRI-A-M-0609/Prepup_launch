import type { UserProfile, Assessment, Application, ActivityLog, WeekSnapshot } from '../types'
import { computeGaps, computeOverall, isAssessmentComplete } from '../engine/intelligence'
import { computeExecutionStreak } from '../engine/activityEngine'
import { backendAPI } from './api'
import { mongoAPI, getMongoToken } from './mongoAPI'

export interface WhatsAppPrefs {
  enabled: boolean
  dailyDigest: boolean
  weeklyReport: boolean
  urgentAlerts: boolean
  applicationAlerts: boolean
  inactiveReminders: boolean
}

export const DEFAULT_WHATSAPP_PREFS: WhatsAppPrefs = {
  enabled: true,
  dailyDigest: true,
  weeklyReport: true,
  urgentAlerts: true,
  applicationAlerts: true,
  inactiveReminders: true,
}

function computeWeeklyStats(
  applications: Application[],
  activityLog: ActivityLog[],
  weeklySnapshots: WeekSnapshot[],
  overall: number | null,
) {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const weekLabel = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  let hoursThisWeek = 0
  let tasksThisWeek = 0
  for (const log of activityLog) {
    const d = new Date(log.date)
    if (d >= weekAgo && d <= today) {
      hoursThisWeek += log.hoursSpent
      tasksThisWeek += log.tasksCompleted
    }
  }

  const prev = weeklySnapshots.length >= 2 ? weeklySnapshots[weeklySnapshots.length - 2] : null
  const readinessDelta =
    overall !== null && prev?.readiness != null ? overall - prev.readiness : null

  const active = applications.filter(a => !['Rejected', 'Selected'].includes(a.status)).length
  const offers = applications.filter(a => a.status === 'Selected').length

  return {
    week_label: weekLabel,
    hours_this_week: Math.round(hoursThisWeek * 10) / 10,
    tasks_this_week: tasksThisWeek,
    readiness_delta: readinessDelta,
    active_applications: active,
    offers,
  }
}

export function buildWhatsAppProfile(
  user: UserProfile,
  assessment: Assessment | null,
  applications: Application[],
  activityLog: ActivityLog[],
  weeklySnapshots: WeekSnapshot[] = [],
) {
  const domain = user.domain ?? 'Software Engineering'
  const assessed = isAssessmentComplete(assessment, domain)
  const gaps = assessed && assessment ? computeGaps(assessment, domain) : []
  const overall = assessed && assessment ? computeOverall(assessment) : null

  const today = new Date()
  const lastActive = activityLog[activityLog.length - 1]?.date
  let daysInactive: number | undefined
  if (lastActive) {
    daysInactive = Math.floor((today.getTime() - new Date(lastActive).getTime()) / 86400000)
  }

  const streak = computeExecutionStreak(activityLog)

  const appPayload = applications.map(a => {
    let days_to_deadline: number | undefined
    if (a.deadline && !['Rejected', 'Selected'].includes(a.status)) {
      days_to_deadline = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000)
    }
    return {
      company: a.company,
      role: a.role,
      status: a.status,
      days_to_deadline,
    }
  })

  return {
    phone: user.phone ?? '',
    name: user.name,
    email: user.email,
    domain,
    goal: user.goal,
    target_companies: user.targetCompanies ?? [],
    assessed,
    overall_readiness: overall,
    streak,
    days_inactive: daysInactive,
    weekly_stats: computeWeeklyStats(applications, activityLog, weeklySnapshots, overall),
    scores: assessment
      ? {
          dsa: assessment.dsa,
          projects: assessment.projects,
          resume: assessment.resume,
          aptitude: assessment.aptitude,
          communication: assessment.communication,
        }
      : {},
    gaps: gaps.map(g => ({
      key: g.key,
      label: g.label,
      current: g.current,
      target: g.target,
      gap: g.gap,
    })),
    applications: appPayload,
  }
}

export type WhatsAppResult = { status: string; hint?: string; reason?: string; to?: string; twilio_status?: string }

async function sendViaNode(payload: Record<string, unknown>, kind: 'digest' | 'weekly' | 'application', extra?: Record<string, unknown>): Promise<WhatsAppResult | null> {
  if (!getMongoToken()) return null
  try {
    if (kind === 'digest') return await mongoAPI.whatsappDigest(payload)
    if (kind === 'weekly') return await mongoAPI.whatsappWeeklyReport(payload)
    return await mongoAPI.whatsappApplicationAlert(extra ?? payload)
  } catch (err) {
    return { status: 'error', reason: (err as Error).message }
  }
}

async function sendViaPython(payload: Record<string, unknown>, kind: 'digest' | 'weekly' | 'application' | 'sync', extra?: Record<string, unknown>): Promise<WhatsAppResult | null> {
  try {
    if (kind === 'digest') return await backendAPI.whatsappDigest(payload)
    if (kind === 'weekly') return await backendAPI.whatsappWeeklyReport(payload)
    if (kind === 'sync') return await backendAPI.whatsappSync(payload)
    return await backendAPI.whatsappApplicationAlert(extra ?? payload)
  } catch (err) {
    return { status: 'error', reason: (err as Error).message }
  }
}

async function deliverWhatsApp(
  payload: Record<string, unknown>,
  kind: 'digest' | 'weekly' | 'application',
  extra?: Record<string, unknown>,
): Promise<WhatsAppResult> {
  const node = await sendViaNode(payload, kind, extra)
  if (node && (node.status === 'sent' || node.status === 'queued')) return node

  const python = await sendViaPython(payload, kind, extra)
  if (python && (python.status === 'sent' || python.status === 'queued')) return python

  if (!getMongoToken()) {
    return {
      status: 'error',
      reason: 'Not signed in to the notification server.',
      hint: 'Log out and sign in with your email/password, then try again.',
    }
  }

  return node ?? python ?? {
    status: 'error',
    reason: 'Could not send — is backend running on port 5000? (cd backend && npm run dev)',
  }
}

export async function syncWhatsAppProfile(
  user: UserProfile | null,
  assessment: Assessment | null,
  applications: Application[],
  activityLog: ActivityLog[],
  weeklySnapshots: WeekSnapshot[] = [],
) {
  if (!user?.phone?.trim()) return null
  const payload = buildWhatsAppProfile(user, assessment, applications, activityLog, weeklySnapshots)
  const viaPython = await sendViaPython(payload, 'sync')
  if (viaPython) return viaPython
  return { status: 'ok', phone: user.phone }
}

export async function sendWhatsAppDigest(
  user: UserProfile | null,
  assessment: Assessment | null,
  applications: Application[],
  activityLog: ActivityLog[],
  weeklySnapshots: WeekSnapshot[] = [],
): Promise<WhatsAppResult | null> {
  if (!user?.phone?.trim()) return null
  const payload = buildWhatsAppProfile(user, assessment, applications, activityLog, weeklySnapshots)
  return deliverWhatsApp(payload, 'digest')
}

export async function sendWhatsAppWeeklyReport(
  user: UserProfile | null,
  assessment: Assessment | null,
  applications: Application[],
  activityLog: ActivityLog[],
  weeklySnapshots: WeekSnapshot[] = [],
): Promise<WhatsAppResult | null> {
  if (!user?.phone?.trim()) return null
  const payload = buildWhatsAppProfile(user, assessment, applications, activityLog, weeklySnapshots)
  return deliverWhatsApp(payload, 'weekly')
}

export async function sendApplicationWhatsAppAlert(
  user: UserProfile | null,
  app: Application,
  assessment: Assessment | null,
  applications: Application[],
  activityLog: ActivityLog[],
  weeklySnapshots: WeekSnapshot[] = [],
) {
  if (!user?.phone?.trim()) return null

  let days_to_deadline: number | undefined
  if (app.deadline && !['Rejected', 'Selected'].includes(app.status)) {
    days_to_deadline = Math.ceil((new Date(app.deadline).getTime() - Date.now()) / 86400000)
  }

  const profile = buildWhatsAppProfile(user, assessment, applications, activityLog, weeklySnapshots)
  return deliverWhatsApp(profile, 'application', {
    phone: user.phone!,
    company: app.company,
    role: app.role,
    status: app.status,
    deadline: app.deadline,
    days_to_deadline,
    profile,
  })
}

export async function sendWhatsAppAlert(phone: string, title: string, message: string) {
  if (!phone.trim()) return null
  const text = `${title}\n${message}`
  if (getMongoToken()) {
    try {
      return await mongoAPI.whatsappNotify(phone, text)
    } catch { /* fallback */ }
  }
  try {
    return await backendAPI.notifyWhatsApp(phone, text)
  } catch {
    return { status: 'error', reason: 'Notification servers unreachable' }
  }
}
