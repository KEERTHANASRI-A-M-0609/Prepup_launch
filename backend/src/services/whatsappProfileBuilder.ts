import { IUser } from '../models/User'
import { ICareerProfile } from '../models/CareerProfile'
import { IApplication } from '../models/Application'
import { getDailyChallengeForUser, challengeUrl } from './dailyChallengeService'
import { computeDaysInactive, type ActivityLogEntry } from '../utils/activityEngine'

function computeStreak(log: ActivityLogEntry[]): number {
  if (!log.length) return 0
  const active = new Set(
    log.filter(e => (e.verifiedTasks ?? 0) > 0 || (e.executions ?? 0) > 0 || e.tasksCompleted > 0).map(e => e.date),
  )
  let streak = 0
  const d = new Date()
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().split('T')[0]
    if (active.has(key)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else if (i === 0) {
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

function computeWeeklyStats(log: ActivityLogEntry[], overall: number | null) {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  let hoursThisWeek = 0
  let tasksThisWeek = 0
  for (const entry of log) {
    const d = new Date(entry.date)
    if (d >= weekAgo && d <= today) {
      hoursThisWeek += entry.hoursSpent
      tasksThisWeek += entry.tasksCompleted
    }
  }
  return {
    week_label: today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    hours_this_week: Math.round(hoursThisWeek * 10) / 10,
    tasks_this_week: tasksThisWeek,
    readiness_delta: null as number | null,
    active_applications: 0,
    offers: 0,
  }
}

export function buildWhatsAppProfileFromDb(
  user: IUser,
  profile: ICareerProfile | null,
  applications: IApplication[],
) {
  const log = (user.activityLog ?? []) as ActivityLogEntry[]
  const scores = profile
    ? {
        dsa: profile.dsa,
        projects: profile.projects,
        resume: profile.resume,
        aptitude: profile.aptitude,
        communication: profile.communication,
      }
    : {}

  const assessed = profile ? profile.overall > 0 || profile.dsa > 0 : false
  const overall = profile?.overall ?? null
  const daysInactive = log.length ? computeDaysInactive(log) : undefined
  const streak = computeStreak(log)

  const appPayload = applications.map(a => {
    let days_to_deadline: number | undefined
    if (a.deadline && !['Rejected', 'Selected'].includes(a.status)) {
      days_to_deadline = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000)
    }
    return {
      company: a.company,
      role: a.role,
      status: a.status,
      days_to_deadline,
      deadline: a.deadline ? new Date(a.deadline).toISOString().split('T')[0] : undefined,
    }
  })

  const weekly = computeWeeklyStats(log, overall)
  weekly.active_applications = applications.filter(a => !['Rejected', 'Selected'].includes(a.status)).length
  weekly.offers = applications.filter(a => a.status === 'Selected').length

  const gaps: { key: string; label: string; current: number; target: number; gap: number }[] = []
  if (profile) {
    const items = [
      { key: 'dsa', label: 'DSA', current: profile.dsa, target: 70 },
      { key: 'projects', label: 'Projects', current: profile.projects, target: 70 },
      { key: 'resume', label: 'Resume', current: profile.resume, target: 75 },
      { key: 'aptitude', label: 'Aptitude', current: profile.aptitude, target: 70 },
      { key: 'communication', label: 'Communication', current: profile.communication, target: 70 },
    ]
    for (const item of items) {
      const gap = item.target - item.current
      if (gap > 0) gaps.push({ ...item, gap })
    }
    gaps.sort((a, b) => b.gap - a.gap)
  }

  return {
    phone: user.phone ?? '',
    name: user.name,
    email: user.email,
    domain: user.targetRole,
    goal: user.currentStage,
    target_companies: user.targetCompanies ?? [],
    assessed,
    overall_readiness: overall,
    streak,
    days_inactive: daysInactive,
    weekly_stats: weekly,
    scores,
    gaps,
    applications: appPayload,
    daily_challenge: (() => {
      const c = getDailyChallengeForUser(String(user._id))
      return { title: c.title, difficulty: c.difficulty, topic: c.topic, url: challengeUrl(c.slug) }
    })(),
  }
}
