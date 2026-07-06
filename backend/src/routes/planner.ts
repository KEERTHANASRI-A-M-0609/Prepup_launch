import express, { Response } from 'express'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { plannerService } from '../services/plannerService'

const router = express.Router()

router.post(
  '/generate',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body as {
      date?: string
      mode?: 'daily' | 'weekly'
      completedYesterday?: string[]
      applications?: { company: string; role: string; status: string; deadline?: string }[]
      activityLog?: { date: string; tasksCompleted: number; hoursSpent: number; executions?: number }[]
    }

    if (body.mode === 'weekly') {
      const result = await plannerService.generateWeek(req.user!.userId, body)
      res.json(result)
      return
    }

    const result = await plannerService.generateForUser(req.user!.userId, body)
    res.json(result)
  }),
)

export default router
