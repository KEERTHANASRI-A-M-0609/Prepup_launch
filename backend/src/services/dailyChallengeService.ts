import type { ActivityLogEntry } from '../utils/activityEngine'

export type LeetCodeChallenge = {
  title: string
  slug: string
  difficulty: string
  topic: string
  estimatedMins: number
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
  { title: 'Coin Change', slug: 'coin-change', difficulty: 'Medium', topic: 'DP', estimatedMins: 40 },
]

function hashSeed(...parts: string[]): number {
  let h = 0
  const s = parts.join('|')
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

export function getDailyChallengeForUser(userId: string, date = todayKey()): LeetCodeChallenge {
  return CHALLENGES[hashSeed(userId, date) % CHALLENGES.length]
}

export function challengeUrl(slug: string) {
  return `https://leetcode.com/problems/${slug}/`
}

function streakFromLog(log: ActivityLogEntry[]): number {
  const dates = new Set(
    log.filter(l => (l.verifiedTasks ?? 0) > 0 || l.tasksCompleted > 0 || (l.executions ?? 0) > 0).map(l => l.date),
  )
  let streak = 0
  const d = new Date()
  for (let i = 0; i < 60; i++) {
    const key = d.toISOString().split('T')[0]
    if (dates.has(key)) streak++
    else if (i > 0) break
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function buildDailyChallengeMessage(
  userId: string,
  name: string,
  activityLog: ActivityLogEntry[] = [],
): { title: string; message: string; challenge: LeetCodeChallenge } {
  const challenge = getDailyChallengeForUser(userId)
  const url = challengeUrl(challenge.slug)
  const first = name.split(' ')[0] || 'there'
  const streak = streakFromLog(activityLog)
  const today = todayKey()
  const doneToday = activityLog.some(
    l => l.date === today && ((l.verifiedTasks ?? 0) > 0 || l.tasksCompleted > 0),
  )

  const lines = [
    `Hi ${first}, your coding challenge for today:`,
    '',
    `${challenge.title} (${challenge.difficulty}) — ${challenge.topic}`,
    `~${challenge.estimatedMins} minutes`,
    url,
    '',
    streak > 0
      ? doneToday
        ? `Streak: ${streak} days — great work today.`
        : `Streak: ${streak} days — solve this to protect it.`
      : 'Verify the task in Daily Planner after solving to start your streak.',
  ]

  const dow = new Date().getDay()
  if (dow === 6) {
    lines.push('', 'LeetCode Weekly Contest is today — leetcode.com/contest')
  } else if (dow === 0) {
    lines.push('', 'LeetCode Biweekly Contest is today — leetcode.com/contest')
  }

  return {
    title: `Solve: ${challenge.title}`,
    message: lines.join('\n'),
    challenge,
  }
}
