import express, { Response } from 'express'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { healthCenterService, AssessmentModuleId } from '../services/healthCenterService'

const router = express.Router()

router.use(authMiddleware)

router.get(
  '/dashboard',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dashboard = await healthCenterService.getDashboard(req.user!.userId)
    res.json(dashboard)
  })
)

router.get(
  '/priority',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dashboard = await healthCenterService.getDashboard(req.user!.userId)
    res.json({ priority: dashboard.priority })
  })
)

router.get(
  '/confidence',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dashboard = await healthCenterService.getDashboard(req.user!.userId)
    res.json({ confidence: dashboard.confidence })
  })
)

router.get(
  '/cards',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dashboard = await healthCenterService.getDashboard(req.user!.userId)
    res.json({ cards: dashboard.cards, completedCount: dashboard.completedCount, totalModules: dashboard.totalModules })
  })
)

router.post(
  '/modules/:moduleId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const moduleId = req.params.moduleId as AssessmentModuleId
    const dashboard = await healthCenterService.saveModule(req.user!.userId, moduleId, req.body)
    res.json(dashboard)
  })
)

router.post(
  '/skip/:moduleId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const moduleId = req.params.moduleId as AssessmentModuleId
    const dashboard = await healthCenterService.skipModule(req.user!.userId, moduleId)
    res.json(dashboard)
  })
)

router.post(
  '/mock-interview',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dashboard = await healthCenterService.saveMockInterview(req.user!.userId, req.body)
    res.json(dashboard)
  })
)

router.get(
  '/interviews',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20
    const history = await healthCenterService.getInterviewHistory(req.user!.userId, limit)
    res.json({ history })
  })
)

router.put(
  '/sync',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dashboard = await healthCenterService.syncProfile(req.user!.userId, req.body)
    res.json(dashboard)
  })
)

router.get(
  '/notifications',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      await healthCenterService.generateNotifications(req.user!.userId)
    } catch {
      // DB offline or dispatch failed — still return any stored notifications
    }
    let notifications: Awaited<ReturnType<typeof healthCenterService.getNotifications>> = []
    try {
      notifications = await healthCenterService.getNotifications(req.user!.userId)
    } catch {
      notifications = []
    }
    res.json({ notifications })
  })
)

router.post(
  '/notifications/read',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await healthCenterService.markNotificationsRead(req.user!.userId)
    res.json(result)
  })
)

export default router
