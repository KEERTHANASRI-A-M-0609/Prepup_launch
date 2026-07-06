import { User } from '../models/User'
import { logger } from '../utils/logger'
import { notificationDispatch } from './notificationDispatch'
import {
  computeDaysInactive,
  hasExecutionHistory,
  INACTIVE_ALERT_DAYS,
  type ActivityLogEntry,
} from '../utils/activityEngine'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

function buildInactiveMessage(name: string, days: number): { title: string; message: string; text: string } {
  const firstName = name.split(' ')[0] || 'there'
  const title = `${days}-day check-in — your placement plan is waiting`
  const message = [
    `Hi ${firstName}, you haven't verified any planner tasks in ${days} days.`,
    '',
    'One small win today is enough to restart momentum:',
    '• Open Daily Planner',
    '• Complete 1 core focus task (25 min)',
    '• Verify with a short reflection + proof link',
    '',
    `Continue here: ${FRONTEND_URL}/planner`,
  ].join('\n')
  return { title, message, text: message }
}

function shouldSendForDay(daysInactive: number, lastSent: number): boolean {
  if (!INACTIVE_ALERT_DAYS.includes(daysInactive as typeof INACTIVE_ALERT_DAYS[number])) return false
  return daysInactive > lastSent
}

export async function processUserInactiveReminder(userId: string): Promise<{ sent: boolean; daysInactive: number }> {
  const user = await User.findById(userId)
  if (!user) return { sent: false, daysInactive: 0 }

  const log = (user.activityLog ?? []) as ActivityLogEntry[]
  if (!hasExecutionHistory(log)) return { sent: false, daysInactive: 0 }

  const daysInactive = computeDaysInactive(log)
  const lastSent = user.lastInactiveReminderDays ?? 0

  if (daysInactive === 0) {
    if (lastSent > 0) {
      user.lastInactiveReminderDays = 0
      await user.save()
    }
    return { sent: false, daysInactive: 0 }
  }

  if (!shouldSendForDay(daysInactive, lastSent)) {
    return { sent: false, daysInactive }
  }

  const prefs = user.notificationPrefs ?? {}
  const whatsappOk = prefs.whatsappInactive !== false && prefs.whatsappEnabled !== false

  const { title, message } = buildInactiveMessage(user.name, daysInactive)

  await notificationDispatch.createAndDispatch(userId, {
    title,
    message,
    type: 'warning',
    moduleId: undefined,
    channels: {
      whatsapp: whatsappOk,
    },
  })

  user.lastInactiveReminderDays = daysInactive
  await user.save()

  logger.info(`[InactiveReminder] Sent ${daysInactive}-day reminder to user ${userId}`)
  return { sent: true, daysInactive }
}

export async function runInactiveReminderScan(): Promise<{ scanned: number; sent: number }> {
  const users = await User.find({
    activityLog: { $exists: true, $not: { $size: 0 } },
  }).select('_id')

  let sent = 0
  for (const u of users) {
    try {
      const result = await processUserInactiveReminder(String(u._id))
      if (result.sent) sent++
    } catch (err) {
      logger.error(`[InactiveReminder] Failed for ${u._id}:`, err)
    }
  }

  logger.info(`[InactiveReminder] Scan complete: ${users.length} users, ${sent} reminders sent`)
  return { scanned: users.length, sent }
}

export async function syncUserActivitySession(
  userId: string,
  data: {
    activityLog?: ActivityLogEntry[]
    notificationPrefs?: Record<string, boolean>
    phone?: string
  },
): Promise<{ daysInactive: number; shouldAlert: boolean }> {
  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')

  if (data.activityLog) {
    user.activityLog = data.activityLog.slice(-90)
    const daysInactive = computeDaysInactive(data.activityLog)
    if (daysInactive === 0) {
      user.lastInactiveReminderDays = 0
    }
  }

  if (data.notificationPrefs) {
    user.notificationPrefs = { ...user.notificationPrefs, ...data.notificationPrefs }
  }

  if (data.phone) {
    user.phone = data.phone
  }

  await user.save()

  const log = (user.activityLog ?? []) as ActivityLogEntry[]
  const daysInactive = computeDaysInactive(log)
  const shouldAlert = INACTIVE_ALERT_DAYS.includes(daysInactive as typeof INACTIVE_ALERT_DAYS[number])
    && hasExecutionHistory(log)
    && shouldSendForDay(daysInactive, user.lastInactiveReminderDays ?? 0)

  if (shouldAlert) {
    await processUserInactiveReminder(userId)
  }

  return { daysInactive, shouldAlert }
}
