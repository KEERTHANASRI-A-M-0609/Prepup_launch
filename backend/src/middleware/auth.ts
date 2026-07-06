import { Request, Response, NextFunction } from 'express'
import { verifyToken, TokenPayload } from '../config/auth'
import { logger } from '../utils/logger'

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.slice(7)
    const payload = verifyToken(token)
    req.user = payload
    next()
  } catch (error) {
    logger.error('Auth middleware error:', error)
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const payload = verifyToken(token)
      req.user = payload
    }
    next()
  } catch (error) {
    next()
  }
}
