/** PrepUp local storage keys (migrated from legacy cos_* keys). */

export const STORAGE_KEY = 'prepup_v5'
export const ACCOUNTS_KEY = 'prepup_accounts'
export const MONGO_TOKEN_KEY = 'prepup_mongo_token'
export const MONGO_PENDING_PW_KEY = 'prepup_mongo_pending_pw'
export const SKIPPED_MODULES_KEY = 'prepup_skipped_modules'
export const DAILY_CHECK_KEY = 'prepup_daily_check'
export const WEEKLY_WA_KEY = 'prepup_weekly_wa'
export const COMM_DISMISSED_KEY = 'prepup_comm_dismissed'
export const PLANNER_KEY = 'prepup_planner'
export const PLAN_GENERATED_KEY = 'prepup_plan_generated_date'
export const DASH_COACH_KEY = 'prepup_dash_coach'
export const DAILY_NUDGE_KEY = 'prepup_daily_nudge'

const LEGACY_MAP: [string, string][] = [
  [STORAGE_KEY, 'cos_v5'],
  [ACCOUNTS_KEY, 'cos_accounts'],
  [MONGO_TOKEN_KEY, 'cos_mongo_token'],
  [MONGO_PENDING_PW_KEY, 'cos_mongo_pending_pw'],
  [SKIPPED_MODULES_KEY, 'cos_skipped_modules'],
  [DAILY_CHECK_KEY, 'cos_daily_check'],
  [WEEKLY_WA_KEY, 'cos_weekly_wa'],
  [COMM_DISMISSED_KEY, 'cos_comm_dismissed'],
  [PLANNER_KEY, 'cos_planner'],
  [PLAN_GENERATED_KEY, 'cos_plan_generated_date'],
]

export function migrateLegacyStorage(): void {
  for (const [next, prev] of LEGACY_MAP) {
    try {
      if (!localStorage.getItem(next) && localStorage.getItem(prev)) {
        localStorage.setItem(next, localStorage.getItem(prev)!)
      }
    } catch { /* ignore */ }
  }
}
