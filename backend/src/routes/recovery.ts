import express, { Response } from 'express'
import { recoveryService } from '../services/recoveryService'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { User } from '../models/User'

const router = express.Router()

router.use(authMiddleware)

router.post(
  '/detect',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { daysInactive, shouldAlert } = await recoveryService.detectInactivity(req.user!.userId)
    res.json({ daysInactive, shouldAlert })
  })
)

router.post(
  '/plan',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { reason, inactiveDays } = req.body

    if (!reason || !inactiveDays) {
      return res.status(400).json({ error: 'Missing reason or inactiveDays' })
    }

    const user = await User.findById(req.user!.userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const plan = await recoveryService.createRecoveryPlan(req.user!.userId, reason, inactiveDays, user.weeklyHours / 7)

    res.status(201).json(plan)
  })
)

router.get(
  '/status',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = await recoveryService.getRecoveryStatus(req.user!.userId)
    res.json(status)
  })
)

export default router
