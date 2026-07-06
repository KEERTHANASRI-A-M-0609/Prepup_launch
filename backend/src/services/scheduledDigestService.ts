import { User } from '../models/User'
import { CareerProfile } from '../models/CareerProfile'
import { Application } from '../models/Application'
import { logger } from '../utils/logger'
import { sendWhatsAppReliable, type WhatsAppSendResult } from './twilioWhatsApp'
import { buildDailyDigest, buildWeeklyReport } from './whatsappMessages'
import { buildWhatsAppProfileFromDb } from './whatsappProfileBuilder'

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

function prefOn(prefs: Record<string, boolean | undefined>, key: string, defaultVal = true) {
  const val = prefs[key as keyof typeof prefs]
  return val !== false && (val ?? defaultVal)
}

function whatsappPrefOn(user: { notificationPrefs?: Record<string, boolean | undefined> }, key: string) {
  const prefs = user.notificationPrefs ?? {}
  return prefs.whatsappEnabled !== false && prefOn(prefs, key)
}

export async function sendUserDailyDigestForced(userId: string): Promise<WhatsAppSendResult> {
  const user = await User.findById(userId)
  if (!user?.phone?.trim()) {
    return { status: 'error', reason: 'No phone on your server account. Open Settings and save your profile with +91…' }
  }

  const profile = await CareerProfile.findOne({ userId })
  const apps = await Application.find({ userId })
  const payload = buildWhatsAppProfileFromDb(user, profile, apps)
  const message = buildDailyDigest(payload)
  const wa = await sendWhatsAppReliable(user.phone, message)

  if (wa.status !== 'error') {
    user.lastDailyDigestDate = todayKey()
    await user.save()
    logger.info(`[DailyDigest] Test send to user ${userId}`)
  }

  return wa
}

export async function sendUserWeeklyReportForced(userId: string): Promise<WhatsAppSendResult> {
  const user = await User.findById(userId)
  if (!user?.phone?.trim()) {
    return { status: 'error', reason: 'No phone on your server account. Open Settings and save your profile with +91…' }
  }

  const profile = await CareerProfile.findOne({ userId })
  const apps = await Application.find({ userId })
  const payload = buildWhatsAppProfileFromDb(user, profile, apps)
  const message = buildWeeklyReport(payload)
  const wa = await sendWhatsAppReliable(user.phone, message)

  if (wa.status !== 'error') {
    user.lastWeeklyReportDate = todayKey()
    await user.save()
    logger.info(`[WeeklyReport] Test send to user ${userId}`)
  }

  return wa
}

export async function sendUserDailyDigest(userId: string, force = false): Promise<boolean> {
  const user = await User.findById(userId)
  if (!user?.phone?.trim()) return false
  if (!whatsappPrefOn(user, 'whatsappDailyDigest')) return false

  const dateKey = todayKey()
  if (!force && user.lastDailyDigestDate === dateKey) return false

  const profile = await CareerProfile.findOne({ userId })
  const apps = await Application.find({ userId })
  const payload = buildWhatsAppProfileFromDb(user, profile, apps)
  const message = buildDailyDigest(payload)

  const wa = await sendWhatsAppReliable(user.phone, message)
  if (wa.status === 'error') {
    logger.warn(`[DailyDigest] WhatsApp failed for ${userId}:`, wa.reason)
    return false
  }

  user.lastDailyDigestDate = dateKey
  await user.save()
  logger.info(`[DailyDigest] Sent to user ${userId}`)
  return true
}

export async function sendUserWeeklyReport(userId: string, force = false): Promise<boolean> {
  const user = await User.findById(userId)
  if (!user?.phone?.trim()) return false
  if (!whatsappPrefOn(user, 'whatsappWeeklyReport')) return false

  const dateKey = todayKey()
  if (!force && user.lastWeeklyReportDate === dateKey) return false

  const profile = await CareerProfile.findOne({ userId })
  const apps = await Application.find({ userId })
  const payload = buildWhatsAppProfileFromDb(user, profile, apps)
  const message = buildWeeklyReport(payload)

  const wa = await sendWhatsAppReliable(user.phone, message)
  if (wa.status === 'error') {
    logger.warn(`[WeeklyReport] WhatsApp failed for ${userId}:`, wa.reason)
    return false
  }

  user.lastWeeklyReportDate = dateKey
  await user.save()
  logger.info(`[WeeklyReport] Sent to user ${userId}`)
  return true
}

export async function runDailyDigestScan(): Promise<{ scanned: number; sent: number }> {
  const users = await User.find({ phone: { $exists: true, $ne: '' } }).select('_id')
  let sent = 0
  for (const u of users) {
    try {
      if (await sendUserDailyDigest(String(u._id))) sent++
    } catch (err) {
      logger.error(`[DailyDigest] Failed for ${u._id}:`, err)
    }
  }
  logger.info(`[DailyDigest] Scan complete: ${users.length} users, ${sent} sent`)
  return { scanned: users.length, sent }
}

export async function runWeeklyReportScan(): Promise<{ scanned: number; sent: number }> {
  const users = await User.find({ phone: { $exists: true, $ne: '' } }).select('_id')
  let sent = 0
  for (const u of users) {
    try {
      if (await sendUserWeeklyReport(String(u._id))) sent++
    } catch (err) {
      logger.error(`[WeeklyReport] Failed for ${u._id}:`, err)
    }
  }
  logger.info(`[WeeklyReport] Scan complete: ${users.length} users, ${sent} sent`)
  return { scanned: users.length, sent }
}
