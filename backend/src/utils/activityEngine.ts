export interface ActivityLogEntry {
  date: string
  tasksCompleted: number
  hoursSpent: number
  verifiedTasks?: number
  executions?: number
}

export function isExecutionDay(entry: ActivityLogEntry | undefined): boolean {
  if (!entry) return false
  return (entry.verifiedTasks ?? 0) > 0 || (entry.executions ?? 0) > 0
}

export function computeDaysInactive(log: ActivityLogEntry[]): number {
  const active = log.filter(isExecutionDay)
  if (active.length === 0) return 0

  const lastDate = active.reduce((max, e) => (e.date > max ? e.date : max), active[0].date)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const diffMs = new Date(todayKey).getTime() - new Date(lastDate).getTime()
  return Math.max(0, Math.round(diffMs / 86400000))
}

export function hasExecutionHistory(log: ActivityLogEntry[]): boolean {
  return log.some(l => isExecutionDay(l) || l.tasksCompleted > 0 || l.hoursSpent > 0)
}

export const INACTIVE_ALERT_DAYS = [3, 7, 14] as const
