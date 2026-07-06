import express, { Response } from 'express'
import { Application } from '../models/Application'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { validate, schemas } from '../utils/validators'

const router = express.Router()

router.use(authMiddleware)

router.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = validate(req.body, schemas.createApplication)
    const application = new Application({
      userId: req.user!.userId,
      ...data,
    })
    await application.save()
    res.status(201).json(application)
  })
)

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const applications = await Application.find({ userId: req.user!.userId }).sort({
      appliedDate: -1,
    })
    res.json(applications)
  })
)

router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const application = await Application.findOne({
      _id: req.params.id,
      userId: req.user!.userId,
    })

    if (!application) {
      return res.status(404).json({ error: 'Application not found' })
    }

    res.json(application)
  })
)

router.put(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      req.body,
      { new: true }
    )

    if (!application) {
      return res.status(404).json({ error: 'Application not found' })
    }

    res.json(application)
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await Application.deleteOne({
      _id: req.params.id,
      userId: req.user!.userId,
    })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Application not found' })
    }

    res.status(204).send()
  })
)

export default router
