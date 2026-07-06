import { logger } from '../utils/logger'
import { runDailyChallengeScan, runStreakNudgeScan } from '../services/dailyReminderService'

const CHECK_INTERVAL_MS = 30 * 60 * 1000
const MORNING_HOUR_UTC = 3 // ~8:30 AM IST
const AFTERNOON_HOUR_UTC = 11 // ~4:30 PM IST — streak nudge

let lastMorningDate = ''
let lastAfternoonDate = ''

export function startDailyChallengeScheduler() {
  const tick = async () => {
    const now = new Date()
    const dateKey = now.toISOString().split('T')[0]

    if (now.getUTCHours() === MORNING_HOUR_UTC && lastMorningDate !== dateKey) {
      lastMorningDate = dateKey
      try {
        await runDailyChallengeScan()
      } catch (err) {
        logger.error('[DailyChallenge] Scheduled scan failed:', err)
        lastMorningDate = ''
      }
    }

    if (now.getUTCHours() === AFTERNOON_HOUR_UTC && lastAfternoonDate !== dateKey) {
      lastAfternoonDate = dateKey
      try {
        await runStreakNudgeScan()
      } catch (err) {
        logger.error('[StreakNudge] Scheduled scan failed:', err)
        lastAfternoonDate = ''
      }
    }
  }

  setInterval(() => { void tick() }, CHECK_INTERVAL_MS)
  logger.info('[DailyChallenge] Scheduler started (morning challenge + afternoon streak nudge)')
}
