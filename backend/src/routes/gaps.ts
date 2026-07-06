import express, { Response } from 'express'
import { gapService } from '../services/gapService'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'

const router = express.Router()

router.use(authMiddleware)

router.get(
  '/analysis',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await gapService.analyzeGaps(req.user!.userId)
    res.json(result)
  })
)

router.get(
  '/trend',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 30
    const trend = await gapService.getGapTrend(req.user!.userId, days)
    res.json({ trend })
  })
)

router.get(
  '/actions',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const actions = await gapService.getPrioritizedActions(req.user!.userId)
    res.json({ actions })
  })
)

export default router
