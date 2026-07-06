import { Router, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { fetchGitHubProfile, fetchLeetCodeProfile } from '../services/platformProxyService'

const router = Router()

router.get(
  '/leetcode/:username',
  asyncHandler(async (req, res: Response) => {
    const data = await fetchLeetCodeProfile(req.params.username)
    res.json(data)
  })
)

router.get(
  '/github/:username',
  asyncHandler(async (req, res: Response) => {
    const data = await fetchGitHubProfile(req.params.username)
    res.json(data)
  })
)

export default router
