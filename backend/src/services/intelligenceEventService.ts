import { User } from '../models/User'
import { logger } from '../utils/logger'

const MAX_EVENTS = 300

export type IntelligenceEventInput = {
  phase: 'identity' | 'evidence' | 'intelligence' | 'execution'
  type: string
  title: string
  impact: string
  meta?: Record<string, unknown>
}

export const intelligenceEventService = {
  async record(userId: string, event: IntelligenceEventInput) {
    const doc = {
      phase: event.phase,
      type: event.type,
      title: event.title,
      impact: event.impact,
      meta: event.meta ?? {},
      at: new Date(),
    }
    await User.findByIdAndUpdate(userId, {
      $push: {
        intelligenceEvents: {
          $each: [doc],
          $slice: -MAX_EVENTS,
        },
      },
      lastActive: new Date(),
    })
    return doc
  },

  async list(userId: string, limit = 40) {
    const user = await User.findById(userId).select('intelligenceEvents').lean()
    if (!user?.intelligenceEvents) return []
    const events = [...user.intelligenceEvents].reverse().slice(0, limit)
    return events.map(e => ({
      phase: e.phase,
      type: e.type,
      title: e.title,
      impact: e.impact,
      meta: e.meta ?? {},
      at: e.at instanceof Date ? e.at.toISOString() : String(e.at),
    }))
  },

  async recordSafe(userId: string, event: IntelligenceEventInput) {
    try {
      return await this.record(userId, event)
    } catch (err) {
      logger.warn('intelligenceEvent record failed:', (err as Error).message)
      return null
    }
  },
}
