import express, { Response, Request } from 'express'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { notificationDispatch } from '../services/notificationDispatch'
import { isTwilioConfigured, sendWhatsAppReliable } from '../services/twilioWhatsApp'
import {
  buildDailyDigest,
  buildWeeklyReport,
  buildApplicationAlert,
} from '../services/whatsappMessages'
import {
  runInactiveReminderScan,
  syncUserActivitySession,
} from '../services/inactiveReminderService'
import {
  runDailyDigestScan,
  runWeeklyReportScan,
  sendUserDailyDigestForced,
  sendUserWeeklyReportForced,
} from '../services/scheduledDigestService'
import {
  sendUserDailyChallenge,
  runDailyChallengeScan,
  getChallengePayload,
  runStreakNudgeScan,
} from '../services/dailyReminderService'

const router = express.Router()

router.post(
  '/dispatch',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { title, message, type, moduleId, channels } = req.body as {
      title?: string
      message?: string
      type?: 'info' | 'warning' | 'success' | 'danger'
      moduleId?: string
      channels?: { whatsapp?: boolean }
    }
    if (!title || !message) {
      res.status(400).json({ error: 'title and message required' })
      return
    }
    await notificationDispatch.createAndDispatch(req.user!.userId, {
      title,
      message,
      type: type ?? 'info',
      moduleId,
      channels,
    })
    res.json({ success: true })
  }),
)

router.get(
  '/status',
  authMiddleware,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      whatsappConfigured: isTwilioConfigured(),
      pythonApi: process.env.PYTHON_API_URL || 'http://localhost:8000',
    })
  }),
)

router.put(
  '/sync-session',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { activityLog, notificationPrefs, phone } = req.body as {
      activityLog?: { date: string; tasksCompleted: number; hoursSpent: number; verifiedTasks?: number; executions?: number }[]
      notificationPrefs?: Record<string, boolean>
      phone?: string
    }
    const result = await syncUserActivitySession(req.user!.userId, {
      activityLog,
      notificationPrefs,
      phone,
    })
    res.json({ success: true, ...result })
  }),
)

router.post(
  '/cron/inactive-reminders',
  asyncHandler(async (req: Request, res: Response) => {
    const secret = process.env.CRON_SECRET
    const header = req.headers['x-cron-secret']
    if (secret && header !== secret) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const result = await runInactiveReminderScan()
    res.json(result)
  }),
)

router.post(
  '/cron/daily-digests',
  asyncHandler(async (req: Request, res: Response) => {
    const secret = process.env.CRON_SECRET
    const header = req.headers['x-cron-secret']
    if (secret && header !== secret) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const result = await runDailyDigestScan()
    res.json(result)
  }),
)

router.post(
  '/cron/weekly-reports',
  asyncHandler(async (req: Request, res: Response) => {
    const secret = process.env.CRON_SECRET
    const header = req.headers['x-cron-secret']
    if (secret && header !== secret) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const result = await runWeeklyReportScan()
    res.json(result)
  }),
)

router.post(
  '/trigger/daily-challenge',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await sendUserDailyChallenge(req.user!.userId, true)
    res.json(result)
  }),
)

router.get(
  '/daily-challenge',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json(getChallengePayload(req.user!.userId))
  }),
)

router.post(
  '/cron/daily-challenges',
  asyncHandler(async (req: Request, res: Response) => {
    const secret = process.env.CRON_SECRET
    const header = req.headers['x-cron-secret']
    if (secret && header !== secret) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const result = await runDailyChallengeScan()
    res.json(result)
  }),
)

router.post(
  '/cron/streak-nudges',
  asyncHandler(async (req: Request, res: Response) => {
    const secret = process.env.CRON_SECRET
    const header = req.headers['x-cron-secret']
    if (secret && header !== secret) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const result = await runStreakNudgeScan()
    res.json(result)
  }),
)

router.post(
  '/trigger/daily-digest',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await sendUserDailyDigestForced(req.user!.userId)
    res.json(result)
  }),
)

router.post(
  '/trigger/weekly-report',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await sendUserWeeklyReportForced(req.user!.userId)
    res.json(result)
  }),
)

router.post(
  '/whatsapp/digest',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const profile = req.body as Record<string, unknown>
    const phone = String(profile.phone ?? '')
    if (!phone) {
      res.status(400).json({ status: 'error', reason: 'phone required in profile' })
      return
    }
    const message = buildDailyDigest(profile)
    const result = await sendWhatsAppReliable(phone, message)
    res.json(result)
  }),
)

router.post(
  '/whatsapp/weekly-report',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const profile = req.body as Record<string, unknown>
    const phone = String(profile.phone ?? '')
    if (!phone) {
      res.status(400).json({ status: 'error', reason: 'phone required in profile' })
      return
    }
    const message = buildWeeklyReport(profile)
    const result = await sendWhatsAppReliable(phone, message)
    res.json(result)
  }),
)

router.post(
  '/whatsapp/notify',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { phone, message } = req.body as { phone?: string; message?: string }
    if (!phone || !message) {
      res.status(400).json({ status: 'error', reason: 'phone and message required' })
      return
    }
    const result = await sendWhatsAppReliable(phone, message)
    res.json(result)
  }),
)

router.post(
  '/whatsapp/application-alert',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const payload = req.body as Record<string, unknown>
    const phone = String(payload.phone ?? '')
    if (!phone) {
      res.status(400).json({ status: 'error', reason: 'phone required' })
      return
    }
    const message = buildApplicationAlert(payload)
    const result = await sendWhatsAppReliable(phone, message)
    res.json(result)
  }),
)

export default router
