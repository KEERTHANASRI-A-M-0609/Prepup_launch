/**
 * Personalized daily execution plan — unique per user, per day, per gaps & companies.
 */

import type { Assessment, Application, ActivityLog } from '../types'
import { computeGaps, generateNextActions, parseWeeklyHoursMid, resolveRoleDomain } from './intelligence'
import { buildCompanyPrepSections, resolveCompanyProfiles } from './companyResourceEngine'
import { localDateKey } from './activityEngine'
import { getDailyChallenge, challengeUrl } from './dailyReminderEngine'
import { enrichPlannerTask } from './plannerTaskGuidelines'
import { applyTierBudget, sortTasksByTier } from './plannerTaskTiers'
import { buildRoleGapTask, primarySkillPoolForDay, rankGapsForRole } from './plannerRoleTasks'

export interface PlannerTaskItem {
  text: string
  category: string
  priority: 'high' | 'medium' | 'low'
  estimatedMins: number
  resourceUrl?: string
  why?: string
  impact?: string
  guidelines?: string
  /** core = must do today; recommended = when ready; optional = extra time / plan suggests */
  tier?: 'core' | 'recommended' | 'optional'
}

export interface PlannerInput {
  userId?: string
  email?: string
  domain: string
  level?: string
  weeklyHours?: string
  targetCompanies?: string[]
  assessment: Assessment | null
  applications?: Application[]
  activityLog?: ActivityLog[]
  completedYesterday?: string[]
  date?: string
  mode?: 'daily' | 'weekly'
  dayIndex?: number
  dayTheme?: string
  usedTextsThisWeek?: Set<string>
}

export interface WeekAnalysis {
  focusAreas: string[]
  topGaps: string[]
  companyRotation: string[]
  weeklyTheme: string
}

const DAY_FOCUS: { theme: string; primaryGap: string | null; label: string }[] = [
  { theme: 'DSA Deep Dive', primaryGap: 'dsa', label: 'Mon' },
  { theme: 'Aptitude & OA', primaryGap: 'aptitude', label: 'Tue' },
  { theme: 'Company Track', primaryGap: null, label: 'Wed' },
  { theme: 'Communication', primaryGap: 'communication', label: 'Thu' },
  { theme: 'Portfolio & Resume', primaryGap: 'projects', label: 'Fri' },
  { theme: 'Mixed Gap Review', primaryGap: null, label: 'Sat' },
  { theme: 'Mock & Simulation', primaryGap: 'interview', label: 'Sun' },
]

const DSA_ROTATION = [
  { text: 'Solve 2 LeetCode Medium on Arrays — focus on two-pointer patterns', mins: 50, topic: 'Arrays' },
  { text: 'Solve 2 LeetCode Medium on Trees — BFS/DFS traversals', mins: 55, topic: 'Trees' },
  { text: 'Solve 1 LeetCode Hard on Dynamic Programming — tabulation practice', mins: 60, topic: 'DP' },
  { text: 'Solve 2 LeetCode Medium on Graphs — shortest path or union-find', mins: 55, topic: 'Graphs' },
  { text: 'Complete 3 NeetCode 150 problems in your weakest pattern', mins: 45, topic: 'Patterns' },
  { text: 'Review 5 Striver A2Z sheet problems you got wrong last week', mins: 40, topic: 'Review' },
  { text: 'Timed mock: 2 problems in 90 minutes (simulate OA conditions)', mins: 90, topic: 'OA' },
]

const APTITUDE_ROTATION = [
  { text: 'IndiaBix — 15 Time & Work + Percentage questions (timed)', mins: 35 },
  { text: 'IndiaBix — 10 Logical reasoning puzzles under 25 minutes', mins: 30 },
  { text: 'IndiaBix — 15 Quant questions on ratios and profit-loss', mins: 35 },
  { text: 'Complete 1 full aptitude mock (30 questions, 30 min)', mins: 35 },
]

const COMM_ROTATION = [
  { text: 'Record a 3-minute STAR answer for "Tell me about a challenge you faced"', mins: 25 },
  { text: 'Practice self-introduction (60 sec) — record and count filler words', mins: 15 },
  { text: 'Mock HR: answer 5 behavioral questions out loud with timer', mins: 30 },
  { text: 'Communication Skill Check in Career Health — voice assessment', mins: 20 },
]

const RESUME_ROTATION = [
  { text: 'Add 2 quantified bullet points to your top project (metrics, impact)', mins: 30 },
  { text: 'Run resume through Jobscan — fix top 3 ATS flags', mins: 25 },
  { text: 'Tailor resume summary for your primary target company', mins: 35 },
]

const DEVOPS_ROTATION = [
  { text: 'Deploy a sample app to AWS EC2 or ECS — document the pipeline in README', mins: 60, topic: 'AWS' },
  { text: 'Write a Dockerfile + docker-compose for a full-stack app with health checks', mins: 45, topic: 'Docker' },
  { text: 'Set up GitHub Actions CI/CD: lint, test, build, deploy on push to main', mins: 50, topic: 'CI/CD' },
  { text: 'Complete 5 Linux admin tasks: permissions, cron, logs, networking, shell scripting', mins: 40, topic: 'Linux' },
  { text: 'Terraform lab: provision VPC + EC2 + S3 bucket (destroy after practice)', mins: 55, topic: 'IaC' },
  { text: 'Kubernetes minikube: deploy app, service, ingress, and rolling update', mins: 60, topic: 'K8s' },
  { text: 'Set up Prometheus + Grafana dashboard for a sample microservice', mins: 45, topic: 'Monitoring' },
]
const PROJECT_ROTATION = [
  { text: 'Push 3 meaningful commits to GitHub — improve README with demo link', mins: 45 },
  { text: 'Deploy one project to Vercel and add live URL to resume', mins: 40 },
  { text: 'Write system design paragraph for your best project (scale, trade-offs)', mins: 35 },
]

function hashSeed(...parts: string[]): number {
  let h = 0
  const s = parts.join('|')
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

function daysInactive(log: ActivityLog[]): number {
  const active = log.filter(l => (l.verifiedTasks ?? 0) > 0 || (l.executions ?? 0) > 0 || l.hoursSpent > 0)
  if (!active.length) return 0
  const last = active.reduce((m, e) => (e.date > m ? e.date : m), active[0].date)
  const diff = new Date(localDateKey()).getTime() - new Date(last).getTime()
  return Math.max(0, Math.round(diff / 86400000))
}

function gapKeyToCategory(key: string): string {
  const map: Record<string, string> = {
    dsa: 'DSA', resume: 'Resume', projects: 'Projects',
    communication: 'Communication', aptitude: 'Aptitude', interview: 'Interview',
  }
  return map[key] ?? 'General'
}

function tasksForGap(
  gap: { key: string; label: string; gap: number; current?: number; target?: number; color?: string },
  seed: number,
  company: string | undefined,
  domain: string,
): PlannerTaskItem | null {
  const built = buildRoleGapTask(
    domain,
    {
      key: gap.key,
      label: gap.label,
      gap: gap.gap,
      current: gap.current ?? 0,
      target: gap.target ?? 0,
      color: gap.color ?? '',
    },
    seed,
    company,
  )
    return {
    text: built.text,
    category: built.category,
    priority: 'high',
    estimatedMins: built.mins,
    why: built.why,
    impact: 'High',
  }
}

function companyTask(
  company: string,
  seed: number,
  sections: ReturnType<typeof buildCompanyPrepSections>,
  role: string,
): PlannerTaskItem | null {
  const section = sections.find(s => s.company === company) || sections[0]
  if (!section) return null
  const resource = pick(section.resources, seed)
  const round = section.rounds[0] ?? 'Interview'
  const focus = section.focusAreas.slice(0, 2).join(' + ')
  return {
    text: `[${section.company} · ${role}] ${resource.title} — ${round} prep`,
    category: section.company,
    priority: 'high',
    estimatedMins: 45,
    resourceUrl: resource.url,
    why: `${role} at ${section.company} · Focus: ${focus} · Rounds: ${section.rounds.slice(0, 3).join(' → ')}`,
    impact: 'High',
  }
}

function deadlineTask(apps: Application[]): PlannerTaskItem | null {
  const soon = apps.filter(a => {
    if (!a.deadline || ['Rejected', 'Selected'].includes(a.status)) return false
    const days = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 3
  })
  if (!soon.length) return null
  const a = soon[0]
  const days = Math.ceil((new Date(a.deadline!).getTime() - Date.now()) / 86400000)
  return {
    text: `Update ${a.company} application — ${a.role} deadline in ${days}d (${a.status})`,
    category: 'Applications',
    priority: 'high',
    estimatedMins: 20,
    why: 'Pipeline deadline approaching',
    impact: 'High',
  }
}

function reorderGapsForDay(
  rankedGaps: ReturnType<typeof computeGaps>,
  dayIndex: number | undefined,
): ReturnType<typeof computeGaps> {
  if (dayIndex == null || rankedGaps.length === 0) return rankedGaps
  const focus = DAY_FOCUS[dayIndex % DAY_FOCUS.length]
  if (!focus.primaryGap) return rankedGaps
  const primary = rankedGaps.find(g => g.key === focus.primaryGap)
  if (!primary) return rankedGaps
  const rest = rankedGaps.filter(g => g.key !== focus.primaryGap)
  return [primary, ...rest]
}

export function analyzeWeekPlan(input: PlannerInput): WeekAnalysis {
  const domain = resolveRoleDomain(input.domain || 'Software Engineering')
  const gaps = input.assessment ? computeGaps(input.assessment, domain) : []
  const ranked = rankGapsForRole([...gaps].filter(g => g.gap > 0), domain)
  const companies = input.targetCompanies ?? []
  const matched = resolveCompanyProfiles(companies)
  return {
    focusAreas: DAY_FOCUS.map(d => d.theme),
    topGaps: ranked.slice(0, 3).map(g => g.label),
    companyRotation: matched.length ? matched.map(c => c.name) : companies,
    weeklyTheme: ranked[0]
      ? `${domain} · Close ${ranked[0].label} (${ranked[0].gap} pts) + ${matched[0]?.name ?? companies[0] ?? 'company'} prep`
      : `Build ${domain} evidence and establish daily execution`,
  }
}

export function getDayTheme(dayIndex: number): string {
  return DAY_FOCUS[dayIndex % DAY_FOCUS.length]?.theme ?? 'Daily execution'
}

export function generatePersonalizedPlan(input: PlannerInput): PlannerTaskItem[] {
  const date = input.date ?? localDateKey()
  const userKey = input.userId ?? input.email ?? 'anonymous'
  const dayIndex = input.dayIndex ?? new Date(date).getDay()
  const dayIdx = typeof input.dayIndex === 'number' ? input.dayIndex : (dayIndex + 6) % 7
  const baseSeed = hashSeed(userKey, date, String(dayIdx), input.dayTheme ?? '')
  const domain = resolveRoleDomain(input.domain || 'Software Engineering')
  const gaps = input.assessment ? computeGaps(input.assessment, domain) : []
  const rankedGaps = reorderGapsForDay(
    rankGapsForRole([...gaps].filter(g => g.gap > 0), domain),
    dayIdx,
  )
  const gapKeys = rankedGaps.map(g => g.key)
  const companies = input.targetCompanies ?? []
  const sections = buildCompanyPrepSections(companies, gapKeys)
  const completedSet = new Set((input.completedYesterday ?? []).map(t => t.toLowerCase().trim()))
  const usedWeek = input.usedTextsThisWeek ?? new Set<string>()
  const weeklyMins = parseWeeklyHoursMid(input.weeklyHours ?? '10 – 20 hrs') * 60
  const dailyBudget = Math.min(Math.round(weeklyMins / 5), 180)
  const dayFocus = DAY_FOCUS[dayIdx % DAY_FOCUS.length]
  const themeNote = input.dayTheme ?? dayFocus.theme

  const items: PlannerTaskItem[] = []

  const challenge = getDailyChallenge(userKey, date)
  items.push({
    text: `Solve LeetCode: ${challenge.title} (${challenge.difficulty})`,
    category: 'DSA',
    priority: 'high',
    estimatedMins: challenge.estimatedMins,
    resourceUrl: challengeUrl(challenge),
    why: `Daily coding challenge · ${challenge.topic}`,
    impact: 'High',
    tier: 'core',
  })

  const deadline = deadlineTask(input.applications ?? [])
  if (deadline) items.push({ ...deadline, tier: 'core' })

  const inactive = daysInactive(input.activityLog ?? [])
  if (inactive >= 2 && dayIdx === 0) {
    items.push({
      text: `Momentum recovery: complete 1 high-priority task in 25 min (inactive ${inactive}d)`,
      category: 'Momentum',
      priority: 'high',
      estimatedMins: 25,
      why: 'Streak at risk — execution before new learning',
      impact: 'High',
      tier: 'core',
    })
  }

  const gapSlots = dayFocus.primaryGap === null && dayIdx === 2
    ? 0
    : dayFocus.primaryGap === null && dayIdx === 5
      ? Math.min(rankedGaps.length, 3)
      : 2

  for (let i = 0; i < Math.min(rankedGaps.length, gapSlots || 2); i++) {
    const gap = rankedGaps[i]
    const co = companies.length ? companies[(dayIdx + i) % companies.length] : undefined
    const task = tasksForGap(gap, baseSeed + i * 17 + dayIdx * 31, co, domain)
    if (task) {
      task.why = `${themeNote} · ${task.why ?? gap.label + ' gap'}`
      task.tier = i === 0 ? 'core' : 'recommended'
      items.push(task)
    }
  }

  if (companies.length > 0) {
    const matched = resolveCompanyProfiles(companies)
    const list = matched.length ? matched.map(c => c.name) : companies
    const companyIdx = (baseSeed + dayIdx) % list.length
    const target = list[companyIdx]
    const ct = companyTask(target, baseSeed + dayIdx * 11, sections, domain)
    if (ct) {
      ct.why = `${themeNote} · ${ct.why ?? ''}`
      ct.tier = items.length === 0 ? 'core' : 'recommended'
      items.push(ct)
    }
  }

  if (dayIdx === 6) {
    items.push({
      text: 'Timed OA simulation: 2 coding problems in 90 min under exam conditions',
      category: 'Interview',
      priority: 'medium',
      estimatedMins: 90,
      why: `${themeNote} — optional weekend simulation when you have extra time`,
      impact: 'Medium',
      tier: 'optional',
    })
  }

  if (items.length < 3 && input.assessment) {
    const actions = generateNextActions(rankedGaps.length ? rankedGaps : gaps)
    for (let i = 0; i < Math.min(actions.length, 3 - items.length); i++) {
      const a = actions[i]
      const mins = parseInt(a.time.match(/(\d+)/)?.[1] ?? '30', 10)
      items.push({
        text: a.text,
        category: gapKeyToCategory(rankedGaps[i]?.key ?? 'dsa'),
        priority: a.urgent ? 'high' : 'medium',
        estimatedMins: mins,
        why: 'Gap-ranked priority action',
        impact: 'Medium',
        tier: i === 0 ? 'core' : 'recommended',
      })
    }
  }

  if (items.length === 0) {
    items.push({
      text: 'Complete Career Health assessment modules to unlock your personalized daily plan',
      category: 'General',
      priority: 'high',
      estimatedMins: 30,
      why: 'Evidence required for personalization',
      impact: 'High',
      tier: 'core',
    })
  }

  const unique = items.filter((item, idx, arr) =>
    arr.findIndex(x => x.text === item.text) === idx,
  )

  const filtered = unique.filter(item => {
    const key = item.text.toLowerCase().trim()
    return !completedSet.has(key) && !usedWeek.has(item.text)
  })

  let totalMins = 0
  const budgeted: PlannerTaskItem[] = []
  for (const item of filtered) {
    if (totalMins + item.estimatedMins > dailyBudget && budgeted.length >= 2) break
    if (!item.tier) {
      item.tier = budgeted.length === 0 ? 'core' : budgeted.length < 2 ? 'core' : 'recommended'
    }
    budgeted.push(item)
    totalMins += item.estimatedMins
  }

  return applyTierBudget(budgeted.slice(0, 6), dailyBudget).map(enrichPlannerTask)
}

export function generateWeeklyPlan(input: PlannerInput): Record<string, PlannerTaskItem[]> {
  const dates: string[] = []
  const start = new Date(input.date ?? localDateKey())
  const day = start.getDay()
  const mon = new Date(start)
  mon.setDate(start.getDate() - ((day + 6) % 7))
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    dates.push(localDateKey(d))
  }

  const usedTextsThisWeek = new Set<string>()
  const plan: Record<string, PlannerTaskItem[]> = {}

  for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
    plan[dates[dayIndex]] = buildThemedWeekDay(
      dayIndex,
      dates[dayIndex],
      input,
      usedTextsThisWeek,
    )
  }
  return plan
}

type PoolItem = { text: string; mins: number; category: string; topic?: string; resourceUrl?: string; guidelines?: string }

function toPlannerItems(
  pool: PoolItem[],
  seed: number,
  count: number,
  used: Set<string>,
  theme: string,
  priority: 'high' | 'medium' = 'high',
): PlannerTaskItem[] {
  const out: PlannerTaskItem[] = []
  for (let attempt = 0; attempt < pool.length * 3 && out.length < count; attempt++) {
    const item = pool[(seed + attempt * 7) % pool.length]
    if (used.has(item.text)) continue
    used.add(item.text)
    out.push(enrichPlannerTask({
      text: item.text,
      category: item.category,
      priority,
      estimatedMins: item.mins,
      resourceUrl: item.resourceUrl,
      guidelines: item.guidelines,
      why: `${theme} · ${item.topic ?? item.category} focus`,
      impact: 'High',
      tier: out.length === 0 ? 'core' : 'recommended',
    }))
  }
  return out
}

function buildThemedWeekDay(
  dayIndex: number,
  date: string,
  input: PlannerInput,
  usedTexts: Set<string>,
): PlannerTaskItem[] {
  const userKey = input.userId ?? input.email ?? 'anonymous'
  const focus = DAY_FOCUS[dayIndex % DAY_FOCUS.length]
  const seed = hashSeed(userKey, date, String(dayIndex), focus.theme)
  const domain = resolveRoleDomain(input.domain || 'Software Engineering')
  const companies = input.targetCompanies ?? []
  const gaps = input.assessment ? computeGaps(input.assessment, domain) : []
  const rankedGaps = rankGapsForRole([...gaps].filter(g => g.gap > 0), domain)
  const gapKeys = rankedGaps.map(g => g.key)
  const sections = buildCompanyPrepSections(companies, gapKeys)
  const tasks: PlannerTaskItem[] = []

  if (dayIndex === 0) {
    const deadline = deadlineTask(input.applications ?? [])
    if (deadline && !usedTexts.has(deadline.text)) {
      tasks.push({ ...deadline, tier: 'core' })
      usedTexts.add(deadline.text)
    }
  }

  switch (dayIndex) {
    case 0: {
      const pool = primarySkillPoolForDay(domain, 0)
      tasks.push(...toPlannerItems(pool, seed, 3, usedTexts, `${focus.theme} · ${domain}`))
      break
    }
    case 1: {
      const pool = APTITUDE_ROTATION.map(t => ({ text: t.text, mins: t.mins, category: 'Aptitude' }))
      tasks.push(...toPlannerItems(pool, seed, 3, usedTexts, focus.theme))
      break
    }
    case 2: {
      if (companies.length > 0) {
        const matched = resolveCompanyProfiles(companies)
        const list = matched.length ? matched.map(c => c.name) : companies
        const co = list[dayIndex % list.length]
        const ct = companyTask(co, seed, sections, domain)
        if (ct && !usedTexts.has(ct.text)) {
          ct.why = `${focus.theme} · ${ct.why ?? ''}`
          ct.tier = 'core'
          tasks.push(ct)
          usedTexts.add(ct.text)
        }
        for (let c = 1; c < Math.min(list.length, 3); c++) {
          const alt = companyTask(list[(dayIndex + c) % list.length], seed + c * 13, sections, domain)
          if (alt && !usedTexts.has(alt.text)) {
            alt.why = `${focus.theme} · ${alt.why ?? ''}`
            alt.tier = 'recommended'
            tasks.push(alt)
            usedTexts.add(alt.text)
            if (tasks.length >= 3) break
          }
        }
      }
      if (tasks.length < 2) {
        const pool = primarySkillPoolForDay(domain, 2)
        tasks.push(...toPlannerItems(pool, seed + 99, 2, usedTexts, `${focus.theme} · ${domain}`))
      }
      break
    }
    case 3: {
      const pool = COMM_ROTATION.map(t => ({ text: t.text, mins: t.mins, category: 'Communication' }))
      tasks.push(...toPlannerItems(pool, seed, 3, usedTexts, focus.theme))
      break
    }
    case 4: {
      const pool = [
        ...RESUME_ROTATION.map(t => ({ text: t.text, mins: t.mins, category: 'Resume' })),
        ...PROJECT_ROTATION.map(t => ({ text: t.text, mins: t.mins, category: 'Projects' })),
      ]
      tasks.push(...toPlannerItems(pool, seed, 3, usedTexts, focus.theme))
      break
    }
    case 5: {
      const pools: PoolItem[] = []
      for (const gap of rankedGaps.slice(0, 4)) {
        const t = tasksForGap(gap, seed + gap.key.length * 11, companies[0], domain)
        if (t) pools.push({ text: t.text, mins: t.estimatedMins, category: t.category })
      }
      if (pools.length < 3) {
        pools.push(...primarySkillPoolForDay(domain, 5).slice(0, 2))
      }
      tasks.push(...toPlannerItems(pools, seed, 3, usedTexts, `${focus.theme} · ${domain}`))
      break
    }
    case 6: {
      tasks.push({
        text: 'Timed OA simulation: 2 coding problems in 90 min under exam conditions',
        category: 'Interview',
        priority: 'medium',
        estimatedMins: 90,
        why: `${focus.theme} — optional weekend simulation when you have extra time`,
        impact: 'Medium',
        tier: 'optional',
      })
      usedTexts.add('Timed OA simulation: 2 coding problems in 90 min under exam conditions')
      const pool = COMM_ROTATION.map(t => ({ text: t.text, mins: t.mins, category: 'Communication' }))
      tasks.push(...toPlannerItems(pool, seed + 50, 2, usedTexts, focus.theme))
      break
    }
    default:
      break
  }

  if (tasks.length === 0) {
    tasks.push({
      text: 'Complete Career Health assessment modules to unlock your personalized daily plan',
      category: 'General',
      priority: 'high',
      estimatedMins: 30,
      why: 'Evidence required for personalization',
      impact: 'High',
      tier: 'core',
    })
  }

  return sortTasksByTier(tasks).slice(0, 4).map(enrichPlannerTask)
}
