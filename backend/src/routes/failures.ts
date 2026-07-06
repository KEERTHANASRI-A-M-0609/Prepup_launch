import express, { Response } from 'express'
import { failureAnalysisService } from '../services/failureAnalysisService'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { validate, schemas } from '../utils/validators'

const router = express.Router()

router.use(authMiddleware)

router.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = validate(req.body, schemas.createFailure)
    const failure = await failureAnalysisService.recordFailure(req.user!.userId, data)
    res.status(201).json(failure)
  })
)

router.get(
  '/analysis',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const analysis = await failureAnalysisService.analyzeFailurePatterns(req.user!.userId)
    res.json(analysis)
  })
)

router.get(
  '/timeline',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timeline = await failureAnalysisService.getInterviewTimeline(req.user!.userId)
    res.json(timeline)
  })
)

router.get(
  '/topics',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const topics = await failureAnalysisService.getFailureFrequencyByTopic(req.user!.userId)
    res.json(topics)
  })
)

export default router
