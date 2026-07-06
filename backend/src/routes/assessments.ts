import express, { Response } from 'express'
import { Assessment } from '../models/Assessment'
import { assessmentService } from '../services/assessmentService'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { validate, schemas } from '../utils/validators'
import { authService } from '../services/authService'

const router = express.Router()

router.use(authMiddleware)

router.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = validate(req.body, schemas.createAssessment)
    const assessment = await assessmentService.saveAssessment(req.user!.userId, data)
    res.status(201).json(assessment)
  })
)

router.get(
  '/latest',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const assessment = await assessmentService.getLatestAssessment(req.user!.userId)
    res.json(assessment)
  })
)

router.get(
  '/history',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10
    const history = await assessmentService.getAssessmentHistory(req.user!.userId, limit)
    res.json(history)
  })
)

router.get(
  '/gaps',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const assessment = await assessmentService.getLatestAssessment(req.user!.userId)
    const user = await authService.getUserById(req.user!.userId)

    if (!assessment) {
      return res.json({ gaps: [], message: 'No assessment completed yet' })
    }

    const gaps = assessmentService.calculateGaps(
      {
        dsa: assessment.dsa,
        projects: assessment.projects,
        resume: assessment.resume,
        communication: assessment.communication,
        aptitude: assessment.aptitude,
        overall: assessment.overall,
      },
      user?.targetRole
    )

    res.json({ gaps })
  })
)

router.get(
  '/trend',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 30
    const trend = await assessmentService.getReadinessTrend(req.user!.userId, days)
    res.json({ trend })
  })
)

export default router
