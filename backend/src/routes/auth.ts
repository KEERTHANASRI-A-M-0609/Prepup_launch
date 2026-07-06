import express, { Response } from 'express'
import { authService } from '../services/authService'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { validate, schemas } from '../utils/validators'
import { logger } from '../utils/logger'

const router = express.Router()

router.post(
  '/register',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = validate(req.body, schemas.register)
    const result = await authService.register(data)
    res.status(201).json(result)
  })
)

router.post(
  '/login',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = validate(req.body, schemas.login)
    const result = await authService.login(data)
    res.json(result)
  })
)

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.getUserById(req.user!.userId)
    res.json(user)
  })
)

export default router
