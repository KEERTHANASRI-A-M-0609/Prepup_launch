import jwt from 'jsonwebtoken'
import { config } from './env'

export interface TokenPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

export const generateToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email }, config.jwt.secret, {
    expiresIn: config.jwt.expire,
  })
}

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as TokenPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload
  } catch {
    return null
  }
}
