import type { ActivityLog } from '../types'

/** Local calendar date (YYYY-MM-DD) — avoids UTC offset bugs for streaks. */
export function localDateKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isExecutionDay(entry: ActivityLog | undefined): boolean {
  if (!entry) return false
  return (entry.verifiedTasks ?? 0) > 0
    || (entry.executions ?? 0) > 0
    || entry.tasksCompleted > 0
    || entry.hoursSpent > 0
}

export function hasLoggedActivity(log: ActivityLog[]): boolean {
  return log.some(isExecutionDay)
}

/** Cap inflated per-day totals (e.g. from sync loops) before displaying metrics. */
export const MAX_HOURS_PER_DAY = 12

export function sanitizeActivityLog(log: ActivityLog[]): ActivityLog[] {
  return log.map(entry => ({
    ...entry,
    hoursSpent: Math.min(Math.max(0, entry.hoursSpent), MAX_HOURS_PER_DAY),
    executions: Math.min(Math.max(0, entry.executions ?? 0), 30),
  }))
}

export function getDayEntry(log: ActivityLog[], date = localDateKey()): ActivityLog | undefined {
  return log.find(l => l.date === date)
}

export function upsertActivityLog(
  log: ActivityLog[],
  patch: {
    date?: string
    tasksCompleted?: number
    hoursSpent?: number
    verifiedTasks?: number
    executionsDelta?: number
  },
): ActivityLog[] {
  const date = patch.date ?? localDateKey()
  const existing = log.find(l => l.date === date)

  if (existing) {
    return log.map(l => {
      if (l.date !== date) return l
      return {
        ...l,
        tasksCompleted: patch.tasksCompleted ?? l.tasksCompleted,
        hoursSpent: patch.hoursSpent ?? l.hoursSpent,
        verifiedTasks: patch.verifiedTasks ?? l.verifiedTasks,
        executions: (l.executions ?? 0) + (patch.executionsDelta ?? 0),
      }
    })
  }

  return [
    ...log,
    {
      date,
      tasksCompleted: patch.tasksCompleted ?? 0,
      hoursSpent: patch.hoursSpent ?? 0,
      verifiedTasks: patch.verifiedTasks ?? 0,
      executions: patch.executionsDelta ?? 0,
    },
  ].sort((a, b) => a.date.localeCompare(b.date))
}

/** Consecutive days with at least one execution (today optional if not yet started). */
export function computeExecutionStreak(log: ActivityLog[]): number {
  const today = new Date()
  const todayKey = localDateKey(today)
  const executedToday = isExecutionDay(getDayEntry(log, todayKey))

  let streak = 0
  const startOffset = executedToday ? 0 : 1

  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = localDateKey(d)
    if (isExecutionDay(getDayEntry(log, key))) streak++
    else break
  }

  return streak
}

export function computeDaysInactive(log: ActivityLog[]): number {
  const active = log.filter(isExecutionDay)
  if (active.length === 0) return 0

  const lastDate = active.reduce((max, e) => (e.date > max ? e.date : max), active[0].date)
  const todayKey = localDateKey()
  const diffMs = new Date(todayKey).getTime() - new Date(lastDate).getTime()
  return Math.max(0, Math.round(diffMs / 86400000))
}

export type DropOffRisk = 'low' | 'medium' | 'high'

export function detectDropOffRisk(log: ActivityLog[]): DropOffRisk {
  const inactive = computeDaysInactive(log)
  if (log.filter(isExecutionDay).length === 0) return 'low'
  if (inactive >= 5) return 'high'
  if (inactive >= 2) return 'medium'
  return 'low'
}

export interface ConsistencyMetrics {
  streak: number
  completionRate: number
  activeDays: number
  consistencyScore: number
  executionsThisWeek: number
  verifiedTasksThisWeek: number
  hoursThisWeek: number
  longestStreak: number
  dropOffRisk: DropOffRisk
}

export function computeConsistencyMetrics(log: ActivityLog[]): ConsistencyMetrics {
  const sanitized = sanitizeActivityLog(log)
  const today = new Date()
  const streak = computeExecutionStreak(sanitized)

  const activeDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    return localDateKey(d)
  }).filter(date => isExecutionDay(getDayEntry(sanitized, date))).length

  const last7Keys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    return localDateKey(d)
  })

  const last7 = last7Keys.map(k => getDayEntry(sanitized, k)).filter(Boolean) as ActivityLog[]
  const verifiedTasksThisWeek = last7.reduce(
    (a, l) => a + (l.verifiedTasks ?? 0) + l.tasksCompleted,
    0,
  )
  const totalTasks = last7.reduce(
    (a, l) => a + (l.verifiedTasks ?? 0) + l.tasksCompleted + (l.executions ?? 0),
    0,
  )
  const executionsThisWeek = last7.reduce((a, l) => a + (l.executions ?? 0), 0)
  const hoursThisWeek = parseFloat(last7.reduce((a, l) => a + l.hoursSpent, 0).toFixed(1))
  const activeDaysThisWeek = last7.filter(isExecutionDay).length

  const completionRate = Math.min(
    Math.round((totalTasks / Math.max(activeDaysThisWeek * 3, 1)) * 100),
    100,
  )

  const consistencyScore = Math.min(
    Math.round(
      (streak * 4)
      + (activeDays / 14 * 40)
      + (completionRate * 0.2)
      + Math.min(verifiedTasksThisWeek * 2, 10),
    ),
    100,
  )

  let longestStreak = 0
  let run = 0
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (isExecutionDay(getDayEntry(sanitized, localDateKey(d)))) {
      run++
      longestStreak = Math.max(longestStreak, run)
    } else {
      run = 0
    }
  }

  return {
    streak,
    completionRate,
    activeDays,
    consistencyScore,
    executionsThisWeek,
    verifiedTasksThisWeek,
    hoursThisWeek,
    longestStreak,
    dropOffRisk: detectDropOffRisk(sanitized),
  }
}

export type MomentumTrend = 'rising' | 'declining' | 'stable'

export function computeMomentumTrend(log: ActivityLog[]): MomentumTrend {
  const sanitized = sanitizeActivityLog(log)
  const today = new Date()

  const scoreWindow = (startOffset: number, days: number) => {
    let score = 0
    for (let i = startOffset; i < startOffset + days; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const entry = getDayEntry(sanitized, localDateKey(d))
      if (!entry) continue
      score += (entry.verifiedTasks ?? 0) + entry.tasksCompleted + (entry.executions ?? 0) * 2 + entry.hoursSpent * 3
    }
    return score
  }

  const recent = scoreWindow(0, 7)
  const prior = scoreWindow(7, 7)

  if (recent > prior + 2) return 'rising'
  if (recent < prior - 2) return 'declining'
  return 'stable'
}

export function buildActivityHeatmap(log: ActivityLog[], days = 84): { date: string; level: number }[] {
  const sanitized = sanitizeActivityLog(log)
  const today = new Date()
  const cells: { date: string; level: number }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = localDateKey(d)
    const entry = getDayEntry(sanitized, key)
    const score = entry
      ? (entry.verifiedTasks ?? 0) + entry.tasksCompleted + (entry.executions ?? 0) + (entry.hoursSpent >= 1 ? 2 : 0)
      : 0
    const level = score >= 5 ? 4 : score >= 3 ? 3 : score >= 1 ? 2 : score > 0 ? 1 : 0
    cells.push({ date: key, level })
  }

  return cells
}

export function buildMonthlyMomentum(log: ActivityLog[]): { month: string; hours: number; executions: number; activeDays: number }[] {
  const sanitized = sanitizeActivityLog(log)
  const buckets = new Map<string, { hours: number; executions: number; activeDays: number }>()

  for (const entry of sanitized) {
    if (!isExecutionDay(entry)) continue
    const month = entry.date.slice(0, 7)
    const b = buckets.get(month) ?? { hours: 0, executions: 0, activeDays: 0 }
    b.hours += entry.hoursSpent
    b.executions += entry.executions ?? 0
    b.activeDays += 1
    buckets.set(month, b)
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({
      month,
      hours: parseFloat(data.hours.toFixed(1)),
      executions: data.executions,
      activeDays: data.activeDays,
    }))
}

export type WeeklyExecutionPoint = {
  week: string
  label: string
  hours: number
  tasks: number
  executions: number
  activeDays: number
}

/** Last N calendar weeks — only sums from the real activity log. */
export function buildWeeklyExecutionSeries(log: ActivityLog[], weeks = 8): WeeklyExecutionPoint[] {
  const sanitized = sanitizeActivityLog(log)
  const today = new Date()
  const result: WeeklyExecutionPoint[] = []

  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() - w * 7)
    const weekDays = Array.from({ length: 7 }, (_, d) => {
      const date = new Date(weekEnd)
      date.setDate(date.getDate() - (6 - d))
      return localDateKey(date)
    })
    const entries = weekDays.map(d => getDayEntry(sanitized, d)).filter(Boolean) as ActivityLog[]
    const hours = parseFloat(entries.reduce((a, l) => a + l.hoursSpent, 0).toFixed(1))
    const tasks = entries.reduce((a, l) => a + (l.verifiedTasks ?? 0) + l.tasksCompleted, 0)
    const executions = entries.reduce((a, l) => a + (l.executions ?? 0), 0)
    const activeDays = entries.filter(isExecutionDay).length
    const start = new Date(weekDays[0])
    const label = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

    result.push({
      week: `W${weeks - w}`,
      label,
      hours,
      tasks,
      executions,
      activeDays,
    })
  }

  return result
}

export function buildDailyExecutionSeries(log: ActivityLog[], days = 7): { day: string; hours: number; tasks: number }[] {
  const sanitized = sanitizeActivityLog(log)
  const today = new Date()
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (days - 1 - i))
    const key = localDateKey(d)
    const entry = getDayEntry(sanitized, key)
    return {
      day: dayNames[d.getDay()],
      hours: entry?.hoursSpent ?? 0,
      tasks: (entry?.verifiedTasks ?? 0) + (entry?.tasksCompleted ?? 0),
    }
  })
}
