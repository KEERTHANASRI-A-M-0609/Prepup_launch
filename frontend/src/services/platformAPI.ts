// Public platform integrations — backend proxy first, direct APIs as fallback

import { parseLeetCodeUsername, isValidLeetCodeUsername } from '../utils/leetcodeUsername'

const API_BASE = import.meta.env.VITE_MONGO_API_URL || 'http://localhost:5000'

export interface LeetCodeData {
  username: string
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  acceptanceRate: number
  ranking: number
  contestRating: number | null
}

export interface GitHubData {
  username: string
  publicRepos: number
  followers: number
  totalStars: number
  topLanguages: string[]
  recentCommitDays: number
  hasReadmeRepos: number
}

export interface PlatformData {
  leetcode: LeetCodeData | null
  github: GitHubData | null
  fetchedAt: string
}

async function fetchFromBackend<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function hasLeetCodeSolveStats(data: Record<string, unknown>): boolean {
  return (
    data.totalSolved != null ||
    data.totalSolvedCount != null ||
    data.solvedProblem != null ||
    data.easySolved != null ||
    data.matchedUserStats != null ||
    data.acSubmissionNum != null
  )
}

function normalizeLeetCode(username: string, data: Record<string, unknown>): LeetCodeData {
  if (!hasLeetCodeSolveStats(data)) {
    throw new Error(`LeetCode solve stats unavailable for "${username}" — check username or try again`)
  }

  let total = Number(data.totalSolved ?? data.totalSolvedCount ?? data.solvedProblem ?? NaN)
  let easy = Number(data.easySolved ?? data.easySolvedCount ?? NaN)
  let medium = Number(data.mediumSolved ?? data.mediumSolvedCount ?? NaN)
  let hard = Number(data.hardSolved ?? data.hardSolvedCount ?? NaN)

  const matched = data.matchedUserStats as { acSubmissionNum?: { difficulty: string; count: number }[] } | undefined
  const acNums = matched?.acSubmissionNum ?? data.acSubmissionNum as { difficulty: string; count: number }[] | undefined
  if (acNums?.length) {
    const byDiff = Object.fromEntries(acNums.map(s => [s.difficulty, s.count]))
    total = Number.isFinite(total) ? total : (byDiff.All ?? 0)
    easy = Number.isFinite(easy) ? easy : (byDiff.Easy ?? 0)
    medium = Number.isFinite(medium) ? medium : (byDiff.Medium ?? 0)
    hard = Number.isFinite(hard) ? hard : (byDiff.Hard ?? 0)
  }

  if (!Number.isFinite(total)) {
    throw new Error(`LeetCode user "${username}" not found or profile is private`)
  }

  const submissions = data.totalSubmissions as { difficulty: string; count: number; submissions: number }[] | undefined
    ?? data.totalSubmissionNum as { difficulty: string; count: number; submissions: number }[] | undefined
  const allSubs = submissions?.find(s => s.difficulty === 'All')
  const acceptanceRate = allSubs && allSubs.submissions > 0
    ? Math.round((allSubs.count / allSubs.submissions) * 1000) / 10
    : Number(data.acceptanceRate ?? 0)

  return {
    username,
    totalSolved: total,
    easySolved: Number.isFinite(easy) ? easy : 0,
    mediumSolved: Number.isFinite(medium) ? medium : 0,
    hardSolved: Number.isFinite(hard) ? hard : 0,
    acceptanceRate,
    ranking: Number(data.ranking ?? 0),
    contestRating: data.contestRating != null ? Number(data.contestRating) : null,
  }
}


export async function fetchLeetCode(username: string): Promise<LeetCodeData> {
  const clean = parseLeetCodeUsername(username)
  if (!clean) {
    throw new Error('Enter your LeetCode username (e.g. neetcode) — paste profile URL or handle')
  }
  if (!isValidLeetCodeUsername(clean)) {
    throw new Error(`"${clean}" is not a valid LeetCode handle. Use 3–30 letters, numbers, _ or - only.`)
  }

  const proxied = await fetchFromBackend<LeetCodeData>(`/api/platforms/leetcode/${encodeURIComponent(clean)}`)
  if (proxied?.username) {
    const allZero = proxied.totalSolved === 0 && proxied.easySolved === 0
      && proxied.mediumSolved === 0 && proxied.hardSolved === 0
    if (!allZero) return proxied
  }

  const directUrls = [
    `https://alfa-leetcode-api.onrender.com/userProfile/${clean}`,
    `https://alfa-leetcode-api.onrender.com/${clean}/solved`,
  ]

  let lastErr: Error | null = null
  for (const url of directUrls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(25000) })
      if (res.status === 404) throw new Error(`LeetCode user "${clean}" not found`)
      if (!res.ok) continue
      const data = await res.json()
      const normalized = normalizeLeetCode(clean, data)
      return normalized
    } catch (e) {
      lastErr = e as Error
      if ((e as Error).message.includes('not found')) throw e
    }
  }

  throw lastErr ?? new Error(`Could not fetch LeetCode for "${clean}" — verify at leetcode.com/u/${clean} and ensure backend is running`)
}

export async function fetchGitHub(username: string): Promise<GitHubData> {
  const clean = username.trim()
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(clean)) {
    throw new Error('Invalid GitHub username format')
  }

  const proxied = await fetchFromBackend<GitHubData>(`/api/platforms/github/${encodeURIComponent(clean)}`)
  if (proxied?.username && proxied.publicRepos != null) return proxied

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'PrepUp-Placement-Platform/1.0',
  }

  const [userRes, reposRes, eventsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${clean}`, { headers, signal: AbortSignal.timeout(20000) }),
    fetch(`https://api.github.com/users/${clean}/repos?per_page=100&sort=updated`, { headers, signal: AbortSignal.timeout(20000) }),
    fetch(`https://api.github.com/users/${clean}/events/public?per_page=100`, { headers, signal: AbortSignal.timeout(20000) }),
  ])

  if (userRes.status === 404) throw new Error(`GitHub user "${clean}" not found`)
  if (userRes.status === 403) {
    throw new Error('GitHub rate limit hit — start the backend (cd backend && npm run dev) or try again in a minute.')
  }
  if (!userRes.ok) throw new Error('GitHub API error — start the backend on port 5000 for reliable fetching.')

  const user = await userRes.json()
  const repos: { stargazers_count: number; language: string | null; fork: boolean }[] =
    reposRes.ok ? await reposRes.json() : []
  const events: { type: string; created_at: string }[] =
    eventsRes.ok ? await eventsRes.json() : []

  const owned = repos.filter((r) => !r.fork)
  const totalStars = owned.reduce((s, r) => s + (r.stargazers_count ?? 0), 0)

  const langFreq: Record<string, number> = {}
  owned.filter((r) => r.language).forEach((r) => {
    langFreq[r.language!] = (langFreq[r.language!] || 0) + 1
  })
  const topLanguages = Object.entries(langFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([l]) => l)

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const pushDays = new Set(
    events
      .filter((e) => e.type === 'PushEvent' && new Date(e.created_at).getTime() > thirtyDaysAgo)
      .map((e) => e.created_at.split('T')[0])
  )

  return {
    username: clean,
    publicRepos: user.public_repos ?? 0,
    followers: user.followers ?? 0,
    totalStars,
    topLanguages,
    recentCommitDays: pushDays.size,
    hasReadmeRepos: owned.length,
  }
}
