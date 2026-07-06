import { logger } from '../utils/logger'
import { runDailyDigestScan, runWeeklyReportScan } from '../services/scheduledDigestService'

const CHECK_INTERVAL_MS = 30 * 60 * 1000 // every 30 min
const DAILY_RUN_HOUR_UTC = 3 // ~8:30 AM IST
const WEEKLY_RUN_DAY_UTC = 0 // Sunday

let lastDailyDate = ''
let lastWeeklyDate = ''

export function startDigestScheduler() {
  const tick = async () => {
    const now = new Date()
    const dateKey = now.toISOString().slice(0, 10)

    if (now.getUTCHours() === DAILY_RUN_HOUR_UTC && lastDailyDate !== dateKey) {
      lastDailyDate = dateKey
      try {
        await runDailyDigestScan()
      } catch (err) {
        logger.error('[DailyDigest] Scheduled scan failed:', err)
        lastDailyDate = ''
      }
    }

    if (
      now.getUTCDay() === WEEKLY_RUN_DAY_UTC &&
      now.getUTCHours() === DAILY_RUN_HOUR_UTC &&
      lastWeeklyDate !== dateKey
    ) {
      lastWeeklyDate = dateKey
      try {
        await runWeeklyReportScan()
      } catch (err) {
        logger.error('[WeeklyReport] Scheduled scan failed:', err)
        lastWeeklyDate = ''
      }
    }
  }

  setInterval(() => { void tick() }, CHECK_INTERVAL_MS)
  logger.info('[DigestScheduler] Started (daily ~8:30 AM IST, weekly on Sundays)')
}
