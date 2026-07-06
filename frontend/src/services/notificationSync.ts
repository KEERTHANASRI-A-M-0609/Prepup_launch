import type { AppNotification } from '../store/AppContext'
import type { Assessment, Application, ActivityLog, PlatformData, UserProfile } from '../types'
import { isAssessmentComplete } from '../engine/intelligence'
import { buildAssessmentNotifications } from '../engine/assessmentEngine'
import { buildDailyReminderNotifications } from '../engine/dailyReminderEngine'
import { mongoAPI, getMongoToken } from './mongoAPI'

const NOTIF_TYPES = new Set(['info', 'warning', 'success', 'danger'])

function normalizeType(type: string): AppNotification['type'] {
  return NOTIF_TYPES.has(type) ? (type as AppNotification['type']) : 'info'
}

export function mapMongoNotification(n: {
  _id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
  moduleId?: string
}): AppNotification {
  return {
    id: n._id,
    title: n.title,
    message: n.message,
    type: normalizeType(n.type),
    createdAt: new Date(n.createdAt).toISOString(),
    read: n.read,
    moduleId: n.moduleId,
  }
}

export function buildLocalNotifications(
  user: UserProfile | null,
  assessment: Assessment | null,
  platformData: PlatformData | null,
  applications: Application[],
  activityLog: ActivityLog[],
  skippedModules: Record<string, string> = {},
): Omit<AppNotification, 'id' | 'createdAt' | 'read'>[] {
  const msgs: Omit<AppNotification, 'id' | 'createdAt' | 'read'>[] = []

  const userKey = user?.email ?? user?.phone ?? 'user'
  buildDailyReminderNotifications(userKey, activityLog, applications).forEach(m => {
    msgs.push({ title: m.title, message: m.message, type: m.type, moduleId: m.moduleId })
  })

  buildAssessmentNotifications(user, assessment, platformData, skippedModules).forEach(m => {
    msgs.push({ title: m.title, message: m.message, type: m.type, moduleId: m.moduleId })
  })

  const soon = applications.filter(a => {
    if (!a.deadline || ['Rejected', 'Selected'].includes(a.status)) return false
    const days = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 3
  })
  soon.forEach(a => {
    const days = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000)
    msgs.push({
      title: `${a.company} deadline in ${days}d`,
      message: `${a.role} — ${a.status}. Update your pipeline.`,
      type: 'danger',
    })
  })

  const lastActive = activityLog[activityLog.length - 1]?.date
  if (lastActive) {
    const days = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000)
    if (days >= 3) {
      msgs.push({
        title: 'Momentum at risk',
        message: `No verified execution for ${days} days. Open Daily Planner — WhatsApp reminders are sent at 3, 7, and 14 days.`,
        type: 'warning',
      })
    } else if (days >= 2) {
      msgs.push({
        title: 'Momentum slipping',
        message: `No logged activity for ${days} days. Complete one verified task today to avoid a 3-day reminder.`,
        type: 'warning',
      })
    }
  }

  if (assessment && isAssessmentComplete(assessment, user?.domain)) {
    if (assessment.dsa < 40 && assessment.sections?.leetcode) {
      msgs.push({ title: 'DSA score is low', message: 'Solve more LeetCode problems and refresh Coding Intelligence.', type: 'info', moduleId: 'coding' })
    }
    if (assessment.resume < 50) {
      msgs.push({ title: 'Resume needs improvement', message: 'Upload an updated resume in Resume Intelligence.', type: 'info', moduleId: 'resume' })
    }
  }

  return msgs
}

function dedupeKey(n: Pick<AppNotification, 'title' | 'message'>) {
  return `${n.title}::${n.message}`
}

export function mergeNotifications(
  existing: AppNotification[],
  incoming: AppNotification[],
): AppNotification[] {
  const seen = new Set(existing.map(dedupeKey))
  const merged = [...existing]
  for (const n of incoming) {
    const key = dedupeKey(n)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(n)
  }
  return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50)
}

export function localToNotifications(
  items: Omit<AppNotification, 'id' | 'createdAt' | 'read'>[],
): AppNotification[] {
  const now = Date.now()
  return items.map((n, i) => ({
    ...n,
    id: `local_${now}_${i}`,
    createdAt: new Date().toISOString(),
    read: false,
  }))
}

export async function fetchMongoNotifications(): Promise<AppNotification[]> {
  if (!getMongoToken()) return []
  const res = await mongoAPI.getNotifications()
  return res.notifications.map(mapMongoNotification)
}
