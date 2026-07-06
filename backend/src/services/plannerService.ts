import { CareerProfile } from '../models/CareerProfile'
import { User } from '../models/User'
import { logger } from '../utils/logger'

const WEIGHTS: Record<string, number> = {
  dsa: 0.25, resume: 0.15, projects: 0.20,
  aptitude: 0.15, communication: 0.15, interview: 0.10,
}

const BENCHMARKS: Record<string, Record<string, number>> = {
  'Software Engineering': { dsa: 80, projects: 70, resume: 70, communication: 65, aptitude: 65, interview: 60 },
  'Software Engineer': { dsa: 80, projects: 70, resume: 70, communication: 65, aptitude: 65, interview: 60 },
  'Product Management': { dsa: 40, projects: 60, resume: 75, communication: 80, aptitude: 70, interview: 70 },
  'Data Science': { dsa: 65, projects: 75, resume: 70, communication: 60, aptitude: 75, interview: 60 },
}

export interface PlannerTaskDto {
  text: string
  category: string
  priority: 'high' | 'medium' | 'low'
  estimatedMins: number
  resourceUrl?: string
  why?: string
  impact?: string
}

export interface PlannerGenerateBody {
  date?: string
  mode?: 'daily' | 'weekly'
  completedYesterday?: string[]
  applications?: { company: string; role: string; status: string; deadline?: string }[]
  activityLog?: { date: string; tasksCompleted: number; hoursSpent: number; executions?: number }[]
}

function localDateKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function hashSeed(...parts: string[]): number {
  let h = 0
  const s = parts.join('|')
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

const APTITUDE_ROTATION = [
  { text: 'IndiaBix — 15 Time & Work + Percentage questions (timed)', mins: 35 },
  { text: 'IndiaBix — 10 Logical reasoning puzzles under 25 minutes', mins: 30 },
  { text: 'IndiaBix — 15 Quant questions on ratios and profit-loss', mins: 35 },
  { text: 'Complete 1 full aptitude mock (30 questions, 30 min)', mins: 35 },
]

const COMM_ROTATION = [
  { text: 'Record a 3-minute STAR answer for a challenge you faced', mins: 25 },
  { text: 'Practice self-introduction (60 sec) — count filler words', mins: 15 },
  { text: 'Mock HR: answer 5 behavioral questions out loud', mins: 30 },
]

const DAY_FOCUS: { theme: string; primaryGap: string | null }[] = [
  { theme: 'DSA Deep Dive', primaryGap: 'dsa' },
  { theme: 'Aptitude & OA', primaryGap: 'aptitude' },
  { theme: 'Company Track', primaryGap: null },
  { theme: 'Communication', primaryGap: 'communication' },
  { theme: 'Portfolio & Resume', primaryGap: 'projects' },
  { theme: 'Mixed Gap Review', primaryGap: null },
  { theme: 'Mock & Simulation', primaryGap: 'interview' },
]

const DSA_ROTATION = [
  { text: 'Solve 2 LeetCode Medium on Arrays — two-pointer patterns', mins: 50, topic: 'Arrays' },
  { text: 'Solve 2 LeetCode Medium on Trees — BFS/DFS', mins: 55, topic: 'Trees' },
  { text: 'Solve 1 LeetCode Hard on Dynamic Programming', mins: 60, topic: 'DP' },
  { text: 'Solve 2 LeetCode Medium on Graphs', mins: 55, topic: 'Graphs' },
  { text: 'Complete 3 NeetCode 150 problems in weakest pattern', mins: 45, topic: 'Patterns' },
  { text: 'Timed OA mock: 2 problems in 90 minutes', mins: 90, topic: 'OA' },
]

const COMPANY_RESOURCES: Record<string, { title: string; url: string; why: string }[]> = {
  Amazon: [
    { title: 'GFG Amazon SDE Prep', url: 'https://www.geeksforgeeks.org/amazon-interview-preparation/', why: 'Amazon OA and coding patterns' },
    { title: 'Amazon Leadership Principles', url: 'https://www.amazon.jobs/content/en/our-workplace/leadership-principles', why: 'Behavioral round prep' },
  ],
  Google: [
    { title: 'GFG Google Interview Prep', url: 'https://www.geeksforgeeks.org/google-interview-preparation/', why: 'Google coding questions' },
    { title: 'LeetCode Google', url: 'https://leetcode.com/company/google/', why: 'Tagged problems' },
  ],
  Microsoft: [
    { title: 'LeetCode Microsoft', url: 'https://leetcode.com/company/microsoft/', why: 'Microsoft OA patterns' },
  ],
  TCS: [
    { title: 'GFG TCS NQT Papers', url: 'https://www.geeksforgeeks.org/tcs-nqt-placement-paper/', why: 'NQT aptitude and coding' },
    { title: 'IndiaBix TCS Mock', url: 'https://www.indiabix.com/online-test/tcs-nqt-mock-test/', why: 'Timed NQT practice' },
  ],
  Flipkart: [
    { title: 'GFG Flipkart Experience', url: 'https://www.geeksforgeeks.org/flipkart-interview-experience/', why: 'Machine round prep' },
  ],
}

function computeGaps(profile: {
  dsa: number; resume: number; projects: number
  communication: number; aptitude: number; interview: number
}, role: string) {
  const bench = BENCHMARKS[role] ?? BENCHMARKS['Software Engineering']
  const scores: Record<string, number> = {
    dsa: profile.dsa, resume: profile.resume, projects: profile.projects,
    communication: profile.communication, aptitude: profile.aptitude,
    interview: profile.interview ?? 0,
  }
  return Object.keys(WEIGHTS)
    .map(key => ({
      key,
      label: key.toUpperCase(),
      current: scores[key] ?? 0,
      target: bench[key] ?? 70,
      gap: Math.max(0, (bench[key] ?? 70) - (scores[key] ?? 0)),
    }))
    .filter(g => g.gap > 0)
    .sort((a, b) => b.gap - a.gap)
}

function matchCompany(name: string): string | null {
  const n = name.trim().toLowerCase()
  for (const key of Object.keys(COMPANY_RESOURCES)) {
    if (key.toLowerCase() === n) return key
  }
  return null
}

function buildPlan(
  userId: string,
  date: string,
  profile: { dsa: number; resume: number; projects: number; communication: number; aptitude: number; interview: number },
  targetRole: string,
  targetCompanies: string[],
  body: PlannerGenerateBody,
  dayIndex?: number,
  usedTexts?: Set<string>,
): PlannerTaskDto[] {
  const d = new Date(date)
  const dayIdx = dayIndex ?? ((d.getDay() + 6) % 7)
  const focus = DAY_FOCUS[dayIdx % DAY_FOCUS.length]
  const seed = hashSeed(userId, date, String(dayIdx), focus.theme)
  let gaps = computeGaps(profile, targetRole)
  if (focus.primaryGap) {
    const primary = gaps.find(g => g.key === focus.primaryGap)
    if (primary) gaps = [primary, ...gaps.filter(g => g.key !== focus.primaryGap)]
  }
  const items: PlannerTaskDto[] = []
  const completed = new Set((body.completedYesterday ?? []).map(t => t.toLowerCase()))
  const used = usedTexts ?? new Set<string>()

  const soon = (body.applications ?? []).filter(a => {
    if (!a.deadline || ['Rejected', 'Selected'].includes(a.status)) return false
    const days = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 3
  })
  if (soon[0]) {
    const days = Math.ceil((new Date(soon[0].deadline!).getTime() - Date.now()) / 86400000)
    items.push({
      text: `Update ${soon[0].company} pipeline — ${soon[0].role} deadline in ${days}d`,
      category: 'Applications',
      priority: 'high',
      estimatedMins: 20,
      why: 'Application deadline within 72 hours',
      impact: 'High',
    })
  }

  for (let i = 0; i < Math.min(gaps.length, dayIdx === 2 ? 1 : 2); i++) {
    const g = gaps[i]
    if (g.key === 'dsa') {
      const t = pick(DSA_ROTATION, seed + i * 17 + dayIdx * 31)
      items.push({
        text: t.text,
        category: 'DSA',
        priority: 'high',
        estimatedMins: t.mins,
        why: `${focus.theme} · DSA gap ${g.gap} pts — ${t.topic}`,
        impact: 'High',
      })
    } else if (g.key === 'aptitude') {
      const t = pick(APTITUDE_ROTATION, seed + dayIdx * 13)
      items.push({
        text: t.text,
        category: 'Aptitude',
        priority: 'high',
        estimatedMins: t.mins,
        resourceUrl: 'https://www.indiabix.com/aptitude/questions-and-answers/',
        why: `${focus.theme} · Aptitude gap ${g.gap} pts`,
        impact: 'High',
      })
    } else if (g.key === 'communication') {
      const t = pick(COMM_ROTATION, seed + dayIdx * 11)
      items.push({
        text: t.text,
        category: 'Communication',
        priority: 'medium',
        estimatedMins: t.mins,
        why: `${focus.theme} · Communication gap ${g.gap} pts`,
        impact: 'High',
      })
    } else if (g.key === 'resume') {
      items.push({
        text: 'Add 2 quantified achievements to resume — run ATS check',
        category: 'Resume',
        priority: 'medium',
        estimatedMins: 30,
        resourceUrl: 'https://www.jobscan.co',
        why: `${focus.theme} · Resume gap ${g.gap} pts`,
        impact: 'Medium',
      })
    } else if (g.key === 'projects') {
      items.push({
        text: 'Push commits + update README with live demo link on GitHub',
        category: 'Projects',
        priority: 'medium',
        estimatedMins: 45,
        why: `${focus.theme} · Projects gap ${g.gap} pts`,
        impact: 'High',
      })
    }
  }

  const matched = targetCompanies.map(c => matchCompany(c)).filter(Boolean) as string[]
  if (matched.length > 0 && (dayIdx === 2 || dayIdx % 3 === 0)) {
    const co = matched[(seed + dayIdx) % matched.length]
    const res = pick(COMPANY_RESOURCES[co] ?? [], seed + dayIdx * 7)
    items.push({
      text: `[${co}] ${res.title}`,
      category: co,
      priority: 'high',
      estimatedMins: 45,
      resourceUrl: res.url,
      why: `${focus.theme} · ${res.why}`,
      impact: 'High',
    })
  }

  if (dayIdx === 6) {
    items.push({
      text: 'Timed OA simulation: 2 coding problems in 90 min under exam conditions',
      category: 'Interview',
      priority: 'high',
      estimatedMins: 90,
      why: `${focus.theme} — simulate real interview pressure`,
      impact: 'High',
    })
  }

  const unique = items.filter((item, idx, arr) => arr.findIndex(x => x.text === item.text) === idx)
  return unique
    .filter(item => !completed.has(item.text.toLowerCase()) && !used.has(item.text))
    .slice(0, 5)
}

export const plannerService = {
  async generateForUser(userId: string, body: PlannerGenerateBody = {}) {
    const user = await User.findById(userId)
    if (!user) throw new Error('User not found')

    const profile = await CareerProfile.findOne({ userId })
    if (!profile) {
      return {
        date: body.date ?? localDateKey(),
        tasks: [{
          text: 'Complete Career Health modules to unlock your personalized daily plan',
          category: 'General',
          priority: 'high' as const,
          estimatedMins: 30,
          why: 'Assessment evidence required',
          impact: 'High',
        }],
      }
    }

    const date = body.date ?? localDateKey()
    const tasks = buildPlan(
      userId,
      date,
      profile,
      user.targetRole || 'Software Engineer',
      user.targetCompanies ?? [],
      body,
    )

    logger.info(`Generated ${tasks.length} planner tasks for ${user.email} on ${date}`)
    return { date, tasks, domain: user.targetRole, companies: user.targetCompanies }
  },

  async generateWeek(userId: string, body: PlannerGenerateBody = {}) {
    const user = await User.findById(userId)
    if (!user) throw new Error('User not found')
    const profile = await CareerProfile.findOne({ userId })
    if (!profile) {
      const key = body.date ?? localDateKey()
      return {
        days: {
          [key]: [{
            text: 'Complete Career Health modules to unlock your personalized daily plan',
            category: 'General',
            priority: 'high' as const,
            estimatedMins: 30,
            why: 'Assessment evidence required',
            impact: 'High',
          }],
        },
      }
    }

    const start = body.date ?? localDateKey()
    const base = new Date(start)
    const day = base.getDay()
    const mon = new Date(base)
    mon.setDate(base.getDate() - ((day + 6) % 7))
    const days: Record<string, PlannerTaskDto[]> = {}
    const usedTexts = new Set<string>()

    for (let i = 0; i < 7; i++) {
      const d = new Date(mon)
      d.setDate(mon.getDate() + i)
      const key = localDateKey(d)
      days[key] = buildPlan(
        userId,
        key,
        profile,
        user.targetRole || 'Software Engineer',
        user.targetCompanies ?? [],
        body,
        i,
        usedTexts,
      )
      days[key].forEach(t => usedTexts.add(t.text))
    }
    return { days }
  },
}
