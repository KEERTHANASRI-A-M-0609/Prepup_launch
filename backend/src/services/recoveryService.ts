import { User } from '../models/User'
import { RecoveryLog } from '../models/RecoveryLog'
import { logger } from '../utils/logger'
import { computeDaysInactive, hasExecutionHistory, INACTIVE_ALERT_DAYS } from '../utils/activityEngine'
import { MomentumService } from './momentumService'

export interface RecoveryPlan {
  originalDailyHours: number
  adjustedDailyHours: number
  tasks: {
    date: Date
    task: string
    estimatedTime: number
  }[]
  motivationMessage: string
}

const momentumService = new MomentumService()

function calculateAdjustedHours(reason: string, inactiveDays: number, originalDailyHours: number): number {
  let reductionFactor = 0.3
  if (reason === 'Burnout') reductionFactor = 0.2
  if (reason === 'Lost Motivation') reductionFactor = 0.25
  if (reason === 'Exams') reductionFactor = 0.5
  if (reason === 'Busy') reductionFactor = 0.4
  if (reason === 'Personal Reasons') reductionFactor = 0.3
  const adjustedHours = Math.max(0.25, originalDailyHours * reductionFactor)
  const rampDays = Math.floor(inactiveDays / 3)
  return Math.min(originalDailyHours, adjustedHours * (1 + rampDays * 0.1))
}

function generateRecoveryTasks(reason: string) {
  const tasks: { date: Date; task: string; estimatedTime: number }[] = []
  const generatedTasks = momentumService.generateRecoveryPlan(reason)
  const today = new Date()
  for (let i = 0; i < generatedTasks.length; i++) {
    const taskDate = new Date(today)
    taskDate.setDate(today.getDate() + i)
    tasks.push({ date: taskDate, task: generatedTasks[i].task, estimatedTime: generatedTasks[i].time })
  }
  return tasks
}

function getMotivationMessage(reason: string): string {
  const messages: Record<string, string> = {
    Burnout: `We understand. Burnout is real. Starting small is the best way back. Your adjusted plan: 0.3 hrs/day. No pressure, just momentum.`,
    'Lost Motivation': `It happens to everyone. Refocus on why you started. Small wins build back momentum. Let's start with 20 mins today.`,
    Busy: `Life gets busy. We've scaled down your plan to fit. Even 20 mins daily keeps you in the game.`,
    Exams: `Exams first, always. We've scheduled lighter tasks for now. You'll ramp back up after exams.`,
    'Personal Reasons': `Take care of yourself first. We're here when you're ready. Lighter tasks, same goal.`,
  }
  return messages[reason] || "Welcome back! Let's restart gradually."
}

export const recoveryService = {
  async detectInactivity(userId: string): Promise<{ daysInactive: number; shouldAlert: boolean }> {
    try {
      const user = await User.findById(userId)
      if (!user) throw new Error('User not found')

      const log = user.activityLog ?? []
      if (hasExecutionHistory(log)) {
        const daysInactive = computeDaysInactive(log)
        const lastSent = user.lastInactiveReminderDays ?? 0
        const shouldAlert = INACTIVE_ALERT_DAYS.includes(daysInactive as typeof INACTIVE_ALERT_DAYS[number])
          && daysInactive > lastSent
        if (shouldAlert) {
          logger.info(`Inactivity detected for user ${userId}: ${daysInactive} days (execution-based)`)
        }
        return { daysInactive, shouldAlert }
      }

      const now = new Date()
      const lastActive = new Date(user.lastActive)
      const daysInactive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
      const shouldAlert = [3, 7, 14, 30].includes(daysInactive)

      if (shouldAlert) {
        logger.info(`Inactivity detected for user ${userId}: ${daysInactive} days (login-based fallback)`)
      }

      return { daysInactive, shouldAlert }
    } catch (error) {
      logger.error('Detect inactivity error:', error)
      throw error
    }
  },

  async createRecoveryPlan(
    userId: string,
    reason: 'Busy' | 'Exams' | 'Burnout' | 'Lost Motivation' | 'Personal Reasons',
    inactiveDays: number, // Days since last active
    originalWeeklyHours: number // User's set weekly hours
  ): Promise<RecoveryPlan> {
    try {
      const user = await User.findById(userId)
      if (!user) throw new Error('User not found')

      // Calculate adjusted daily hours based on reason and inactivity period
      const adjustedHours = calculateAdjustedHours(reason, inactiveDays, originalWeeklyHours / 7)
      const tasks = generateRecoveryTasks(reason)

      // Save recovery log
      const recoveryLog = new RecoveryLog({
        userId,
        inactiveStartDate: new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000),
        inactiveDays,
        reason,
        originalWeeklyHours: originalWeeklyHours,
        adjustedWeeklyHours: adjustedHours * 7, // Convert back to weekly for log
        recoveryTasksScheduled: tasks,
      })

      await recoveryLog.save()

      const motivationMessage = getMotivationMessage(reason)

      logger.info(`Recovery plan created for user ${userId}`)

      return {
        originalDailyHours: originalWeeklyHours / 7, // Return daily for plan display
        adjustedDailyHours: adjustedHours,
        tasks,
        motivationMessage,
      }
    } catch (error) {
      logger.error('Create recovery plan error:', error)
      throw error
    }
  },

  async getRecoveryStatus(userId: string) {
    try {
      const recoveryLog = await RecoveryLog.findOne({ userId, status: 'Active' }).sort({
        recoveryPlanCreated: -1,
      })

      if (!recoveryLog) {
        return { isRecovering: false }
      }

      const now = new Date()
      const recoveryStart = new Date(recoveryLog.recoveryPlanCreated)
      const daysSinceRecovery = Math.floor((now.getTime() - recoveryStart.getTime()) / (1000 * 60 * 60 * 24))

      const completedTasks = recoveryLog.recoveryTasksScheduled.filter((t) => t.completed).length
      const totalTasks = recoveryLog.recoveryTasksScheduled.length
      const completionRate = Math.round((completedTasks / totalTasks) * 100)

      return {
        isRecovering: true,
        reason: recoveryLog.reason,
        daysSinceRecovery, // Days since recovery plan was created
        originalHours: recoveryLog.originalWeeklyHours / 7, // Convert back to daily for display
        adjustedHours: recoveryLog.adjustedWeeklyHours / 7, // Convert back to daily for display
        completionRate,
        nextTasks: recoveryLog.recoveryTasksScheduled
          .filter((t) => !t.completed && new Date(t.date) <= new Date())
          .slice(0, 2),
      }
    } catch (error) {
      logger.error('Get recovery status error:', error)
      throw error
    }
  },
}
