import type { ActivityLog, Application } from '../types'
import { computeConsistencyMetrics, localDateKey } from './activityEngine'

export type LeetCodeChallenge = {
  title: string
  slug: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  topic: string
  estimatedMins: number
}

export type ContestReminder = {
  name: string
  when: string
  url: string
  urgency: 'today' | 'soon' | 'upcoming'
}

const CHALLENGES: LeetCodeChallenge[] = [
  { title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy', topic: 'Arrays', estimatedMins: 25 },
  { title: 'Valid Parentheses', slug: 'valid-parentheses', difficulty: 'Easy', topic: 'Stack', estimatedMins: 20 },
  { title: 'Merge Two Sorted Lists', slug: 'merge-two-sorted-lists', difficulty: 'Easy', topic: 'Linked List', estimatedMins: 25 },
  { title: 'Best Time to Buy and Sell Stock', slug: 'best-time-to-buy-and-sell-stock', difficulty: 'Easy', topic: 'DP', estimatedMins: 30 },
  { title: 'Maximum Subarray', slug: 'maximum-subarray', difficulty: 'Medium', topic: 'DP', estimatedMins: 35 },
  { title: '3Sum', slug: '3sum', difficulty: 'Medium', topic: 'Two Pointers', estimatedMins: 40 },
  { title: 'Longest Substring Without Repeating Characters', slug: 'longest-substring-without-repeating-characters', difficulty: 'Medium', topic: 'Sliding Window', estimatedMins: 35 },
  { title: 'Binary Tree Level Order Traversal', slug: 'binary-tree-level-order-traversal', difficulty: 'Medium', topic: 'BFS', estimatedMins: 30 },
  { title: 'Number of Islands', slug: 'number-of-islands', difficulty: 'Medium', topic: 'Graph', estimatedMins: 40 },
  { title: 'Course Schedule', slug: 'course-schedule', difficulty: 'Medium', topic: 'Topological Sort', estimatedMins: 45 },
  { title: 'Coin Change', slug: 'coin-change', difficulty: 'Medium', topic: 'DP', estimatedMins: 40 },
  { title: 'Word Break', slug: 'word-break', difficulty: 'Medium', topic: 'DP', estimatedMins: 35 },
  { title: 'LRU Cache', slug: 'lru-cache', difficulty: 'Medium', topic: 'Design', estimatedMins: 50 },
  { title: 'Trapping Rain Water', slug: 'trapping-rain-water', difficulty: 'Hard', topic: 'Two Pointers', estimatedMins: 45 },
  { title: 'Serialize and Deserialize Binary Tree', slug: 'serialize-and-deserialize-binary-tree', difficulty: 'Hard', topic: 'Tree', estimatedMins: 50 },
]

function hashSeed(...parts: string[]): number {
  let h = 0
  const s = parts.join('|')
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function getDailyChallenge(userKey: string, date = localDateKey()): LeetCodeChallenge {
  const idx = hashSeed(userKey, date) % CHALLENGES.length
  return CHALLENGES[idx]
}

export function challengeUrl(challenge: LeetCodeChallenge): string {
  return `https://leetcode.com/problems/${challenge.slug}/`
}

export function getUpcomingContests(date = new Date()): ContestReminder[] {
  const dow = date.getDay()
  const contests: ContestReminder[] = []

  if (dow === 6) {
    contests.push({
      name: 'LeetCode Weekly Contest',
      when: 'Today · 8:00 AM PDT / 8:30 PM IST',
      url: 'https://leetcode.com/contest/',
      urgency: 'today',
    })
  } else if (dow === 0) {
    contests.push({
      name: 'LeetCode Biweekly Contest',
      when: 'Today · 8:00 AM PDT / 8:30 PM IST',
      url: 'https://leetcode.com/contest/',
      urgency: 'today',
    })
  } else if (dow === 5) {
    contests.push({
      name: 'LeetCode Weekly Contest',
      when: 'Tomorrow · register now',
      url: 'https://leetcode.com/contest/',
      urgency: 'soon',
    })
  } else if (dow === 6) {
    contests.push({
      name: 'Codeforces Round',
      when: 'Check schedule — often Saturday',
      url: 'https://codeforces.com/contests',
      urgency: 'upcoming',
    })
  }

  if (dow === 1 || dow === 3) {
    contests.push({
      name: 'CodeChef Starters',
      when: 'Check Wednesday / weekend slots',
      url: 'https://www.codechef.com/contests',
      urgency: 'upcoming',
    })
  }

  return contests
}

export function buildStreakMessage(activityLog: ActivityLog[]): { streak: number; atRisk: boolean; message: string } {
  const { streak } = computeConsistencyMetrics(activityLog)
  const today = localDateKey()
  const verifiedToday = activityLog.some(
    l => l.date === today && ((l.verifiedTasks ?? 0) > 0 || l.tasksCompleted > 0),
  )
  const atRisk = streak > 0 && !verifiedToday
  const message = atRisk
    ? `🔥 ${streak}-day streak at risk — solve today's challenge to keep it alive.`
    : streak > 0
      ? `🔥 ${streak}-day streak — keep the momentum going.`
      : 'Start a streak — verify one planner task today.'
  return { streak, atRisk, message }
}

export function buildDailyReminderNotifications(
  userKey: string,
  activityLog: ActivityLog[],
  applications: Application[],
): { title: string; message: string; type: 'info' | 'warning' | 'success' | 'danger'; moduleId?: string }[] {
  const msgs: { title: string; message: string; type: 'info' | 'warning' | 'success' | 'danger'; moduleId?: string }[] = []
  const challenge = getDailyChallenge(userKey)
  const url = challengeUrl(challenge)

  msgs.push({
    title: `Today's LeetCode: ${challenge.title}`,
    message: `${challenge.difficulty} · ${challenge.topic} · ~${challenge.estimatedMins} min → ${url}`,
    type: 'info',
    moduleId: 'coding',
  })

  const { streak, atRisk, message: streakMsg } = buildStreakMessage(activityLog)
  if (atRisk) {
    msgs.push({ title: 'Streak at risk', message: streakMsg, type: 'warning' })
  } else if (streak >= 3) {
    msgs.push({ title: `${streak}-day streak`, message: streakMsg, type: 'success' })
  }

  getUpcomingContests().forEach(c => {
    if (c.urgency === 'today') {
      msgs.push({
        title: `Contest today: ${c.name}`,
        message: `${c.when} — ${c.url}`,
        type: 'danger',
      })
    } else if (c.urgency === 'soon') {
      msgs.push({
        title: `Contest soon: ${c.name}`,
        message: `${c.when} — ${c.url}`,
        type: 'warning',
      })
    }
  })

  applications.filter(a => {
    if (!a.deadline || ['Rejected', 'Selected'].includes(a.status)) return false
    const days = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 2
  }).forEach(a => {
    const days = Math.ceil((new Date(a.deadline!).getTime() - Date.now()) / 86400000)
    msgs.push({
      title: `${a.company} — ${days === 0 ? 'deadline today' : `${days}d left`}`,
      message: `${a.role} · Update pipeline and prep OA.`,
      type: 'danger',
    })
  })

  return msgs
}

export function buildChallengeWhatsAppText(userKey: string, name: string, activityLog: ActivityLog[]): string {
  const first = name.split(' ')[0] || 'there'
  const challenge = getDailyChallenge(userKey)
  const url = challengeUrl(challenge)
  const { streak, atRisk, message: streakMsg } = buildStreakMessage(activityLog)
  const contests = getUpcomingContests().filter(c => c.urgency !== 'upcoming')

  const lines = [
    `🎯 *PrepUp Daily Challenge — ${first}*`,
    '',
    `Solve on LeetCode:`,
    `*${challenge.title}* (${challenge.difficulty})`,
    `Topic: ${challenge.topic} · ~${challenge.estimatedMins} min`,
    url,
    '',
    streakMsg,
  ]

  if (atRisk) lines.push('', '⚠️ Verify in Daily Planner after solving to save your streak.')

  contests.forEach(c => {
    lines.push('', `🏁 *${c.name}*`, c.when, c.url)
  })

  lines.push('', 'Open PrepUp → Daily Planner for full plan.')
  return lines.join('\n').slice(0, 1600)
}
