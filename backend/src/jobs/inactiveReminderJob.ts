import { logger } from '../utils/logger'
import { runInactiveReminderScan } from '../services/inactiveReminderService'

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // hourly
const RUN_HOUR_UTC = 4 // ~9:30 AM IST

let lastRunDate = ''

export function startInactiveReminderScheduler() {
  const tick = async () => {
    const now = new Date()
    const dateKey = now.toISOString().slice(0, 10)
    if (now.getUTCHours() !== RUN_HOUR_UTC) return
    if (lastRunDate === dateKey) return

    lastRunDate = dateKey
    try {
      await runInactiveReminderScan()
    } catch (err) {
      logger.error('[InactiveReminder] Scheduled scan failed:', err)
      lastRunDate = ''
    }
  }

  setInterval(() => { void tick() }, CHECK_INTERVAL_MS)
  logger.info('[InactiveReminder] Daily scheduler started (runs once per day around 9:30 AM IST)')
}
