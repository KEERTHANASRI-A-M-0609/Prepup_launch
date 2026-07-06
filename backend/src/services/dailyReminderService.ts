import { User } from '../models/User'
import { logger } from '../utils/logger'
import { notificationDispatch } from './notificationDispatch'
import { isTwilioConfigured } from './twilioWhatsApp'
import { buildDailyChallengeMessage, getDailyChallengeForUser, challengeUrl } from './dailyChallengeService'
import type { ActivityLogEntry } from '../utils/activityEngine'

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

function prefsOn(user: { notificationPrefs?: Record<string, boolean | undefined> }) {
  const p = user.notificationPrefs ?? {}
  return {
    whatsapp: p.whatsappEnabled !== false && p.whatsappDailyDigest !== false,
  }
}

function streakFromLog(log: ActivityLogEntry[]): number {
  const active = new Set(
    log.filter(l => (l.verifiedTasks ?? 0) > 0 || l.tasksCompleted > 0 || (l.executions ?? 0) > 0).map(l => l.date),
  )
  let streak = 0
  const d = new Date()
  for (let i = 0; i < 60; i++) {
    const key = d.toISOString().split('T')[0]
    if (active.has(key)) streak++
    else if (i > 0) break
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function verifiedToday(log: ActivityLogEntry[]): boolean {
  const today = todayKey()
  return log.some(l => l.date === today && ((l.verifiedTasks ?? 0) > 0 || l.tasksCompleted > 0))
}

export async function sendUserDailyChallenge(userId: string, force = false) {
  const user = await User.findById(userId)
  if (!user) return { sent: false, reason: 'User not found' }

  const dateKey = todayKey()
  if (!force && user.lastDailyChallengeDate === dateKey) {
    return { sent: false, reason: 'Already sent today', skipped: true }
  }

  const log = (user.activityLog ?? []) as ActivityLogEntry[]
  const { title, message } = buildDailyChallengeMessage(userId, user.name, log)
  const prefs = prefsOn(user)

  const delivery = await notificationDispatch.createAndDispatch(userId, {
    title,
    message,
    type: 'info',
    moduleId: 'coding',
    channels: { whatsapp: prefs.whatsapp },
  })

  user.lastDailyChallengeDate = dateKey
  await user.save()

  const waLive = isTwilioConfigured()
  const waOk = delivery.whatsapp?.status === 'sent' || delivery.whatsapp?.status === 'queued'

  logger.info(`[DailyChallenge] user ${userId} wa:${delivery.whatsapp?.status ?? 'skip'}`)

  return {
    sent: true,
    inApp: true,
    title,
    message,
    whatsappConfigured: waLive,
    whatsappEnabled: prefs.whatsapp,
    whatsappDelivered: waOk,
    deliveredLive: waOk,
    whatsappStatus: delivery.whatsapp?.status,
    whatsappHint: delivery.whatsapp?.hint ?? delivery.whatsapp?.reason,
    hint: waOk
      ? undefined
      : !user.phone?.trim()
        ? 'Add phone (+91…) in profile for WhatsApp delivery.'
        : !waLive
          ? 'In-app only — configure Twilio in backend/.env'
          : (delivery.whatsapp?.hint ?? delivery.whatsapp?.reason ?? 'Join Twilio sandbox: send join code to +1 415 523 8886'),
  }
}

export async function sendUserStreakNudge(userId: string): Promise<{ sent: boolean }> {
  const user = await User.findById(userId)
  if (!user) return { sent: false }

  const log = (user.activityLog ?? []) as ActivityLogEntry[]
  const streak = streakFromLog(log)
  if (streak < 1 || verifiedToday(log)) return { sent: false }

  const challenge = getDailyChallengeForUser(userId)
  const url = challengeUrl(challenge.slug)
  const prefs = prefsOn(user)

  const title = `🔥 ${streak}-day streak at risk`
  const message = [
    `Hi ${user.name.split(' ')[0]}, you haven't verified a task today.`,
    '',
    `Solve now: ${challenge.title} (${challenge.difficulty})`,
    url,
    '',
    'Open Daily Planner → verify when done to keep your streak.',
  ].join('\n')

  await notificationDispatch.createAndDispatch(userId, {
    title,
    message,
    type: 'warning',
    moduleId: 'coding',
    channels: { whatsapp: prefs.whatsapp },
  })

  logger.info(`[StreakNudge] Sent to user ${userId} (streak ${streak})`)
  return { sent: true }
}

export async function runStreakNudgeScan(): Promise<{ scanned: number; sent: number }> {
  const users = await User.find({}).select('_id')
  let sent = 0
  for (const u of users) {
    try {
      const r = await sendUserStreakNudge(String(u._id))
      if (r.sent) sent++
    } catch (err) {
      logger.error(`[StreakNudge] Failed for ${u._id}:`, err)
    }
  }
  return { scanned: users.length, sent }
}

export async function runDailyChallengeScan(): Promise<{ scanned: number; sent: number }> {
  const users = await User.find({}).select('_id')
  let sent = 0
  for (const u of users) {
    try {
      const r = await sendUserDailyChallenge(String(u._id))
      if (r.sent) sent++
    } catch (err) {
      logger.error(`[DailyChallenge] Failed for ${u._id}:`, err)
    }
  }
  logger.info(`[DailyChallenge] Scan: ${users.length} users, ${sent} sent`)
  return { scanned: users.length, sent }
}

export function getChallengePayload(userId: string) {
  const challenge = getDailyChallengeForUser(userId)
  return {
    ...challenge,
    url: challengeUrl(challenge.slug),
    date: todayKey(),
  }
}
