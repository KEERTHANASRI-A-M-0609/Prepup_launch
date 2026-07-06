import express, { Response } from 'express'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { User } from '../models/User'
import companyAnalysis from '../services/companyAnalysisService'

const router = express.Router()

router.get(
  '/plan',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await User.findById(req.user!.userId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const targetCompanies = user.targetCompanies ?? []
    let companyAnalysisResult = null

    if (targetCompanies.length > 0) {
      try {
        companyAnalysisResult = await companyAnalysis.analyzeTargetCompanies(
          targetCompanies,
          user.domain ?? user.targetRole,
          user.targetRole,
        )
      } catch {
        companyAnalysisResult = null
      }
    }

    res.json({
      targetRole: user.targetRole,
      targetCompanies,
      companyAnalysis: companyAnalysisResult,
    })
  }),
)

export default router
