import { parseLeetCodeUsername, isValidLeetCodeUsername } from '../utils/leetcodeUsername'

const UA = 'PrepUp-Placement-Platform/1.0'

export interface LeetCodeProfile {
  username: string
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  acceptanceRate: number
  ranking: number
  contestRating: number | null
}

export interface GitHubProfile {
  username: string
  publicRepos: number
  followers: number
  totalStars: number
  topLanguages: string[]
  recentCommitDays: number
  hasReadmeRepos: number
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { ...(init?.headers ?? {}), 'User-Agent': UA } })
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status: number }
    err.status = res.status
    throw err
  }
  return res.json()
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

function normalizeLeetCode(username: string, data: Record<string, unknown>): LeetCodeProfile {
  if (!hasLeetCodeSolveStats(data)) {
    throw new Error(`LeetCode solve stats unavailable for "${username}" — try again or check username`)
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

async function fetchLeetCodeGraphQL(username: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA,
        Referer: 'https://leetcode.com',
      },
      body: JSON.stringify({
        query: `query userPublicProfile($username: String!) {
          matchedUser(username: $username) {
            username
            submitStats {
              acSubmissionNum { difficulty count submissions }
              totalSubmissionNum { difficulty count submissions }
            }
            profile { ranking }
          }
        }`,
        variables: { username },
      }),
    })
    if (!res.ok) return null
    const json = await res.json() as {
      data?: {
        matchedUser?: {
          username?: string
          profile?: { ranking?: number }
          submitStats?: {
            acSubmissionNum?: { difficulty: string; count: number; submissions: number }[]
            totalSubmissionNum?: { difficulty: string; count: number; submissions: number }[]
          }
        }
      }
    }
    const user = json.data?.matchedUser
    if (!user?.username) return null

    const ac = user.submitStats?.acSubmissionNum ?? []
    const byDiff = Object.fromEntries(ac.map(s => [s.difficulty, s.count]))
    const totalSubs = user.submitStats?.totalSubmissionNum

    return {
      username: user.username,
      totalSolved: byDiff.All ?? 0,
      easySolved: byDiff.Easy ?? 0,
      mediumSolved: byDiff.Medium ?? 0,
      hardSolved: byDiff.Hard ?? 0,
      acSubmissionNum: ac,
      totalSubmissionNum: totalSubs,
      ranking: user.profile?.ranking ?? 0,
    }
  } catch {
    return null
  }
}

export async function fetchLeetCodeProfile(username: string): Promise<LeetCodeProfile> {
  const clean = parseLeetCodeUsername(username)
  if (!clean) {
    throw new Error('Enter your LeetCode username (e.g. neetcode) — not your display name')
  }
  if (!isValidLeetCodeUsername(clean)) {
    throw new Error(`"${clean}" is not a valid LeetCode handle. Use 3–30 letters, numbers, _ or - only.`)
  }

  const gql = await fetchLeetCodeGraphQL(clean)
  if (gql) {
    try {
      return normalizeLeetCode(clean, gql)
    } catch {
      /* fall through to alfa API */
    }
  }

  const sources = [
    `https://alfa-leetcode-api.onrender.com/userProfile/${clean}`,
    `https://alfa-leetcode-api.onrender.com/${clean}/solved`,
  ]

  let lastErr: Error | null = null
  for (const url of sources) {
    try {
      const data = await fetchJson(url)
      return normalizeLeetCode(clean, data as Record<string, unknown>)
    } catch (e) {
      lastErr = e as Error
      if ((e as Error).message.includes('not found')) throw e
    }
  }

  throw lastErr ?? new Error(`Could not fetch LeetCode profile for "${clean}" — check the username on leetcode.com/u/${clean}`)
}

export async function fetchGitHubProfile(username: string): Promise<GitHubProfile> {
  const clean = username.trim()
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(clean)) {
    throw new Error('Invalid GitHub username format')
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': UA,
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`

  const [userRes, reposRes, eventsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${clean}`, { headers }),
    fetch(`https://api.github.com/users/${clean}/repos?per_page=100&sort=updated`, { headers }),
    fetch(`https://api.github.com/users/${clean}/events/public?per_page=100`, { headers }),
  ])

  if (userRes.status === 404) throw new Error(`GitHub user "${clean}" not found`)
  if (userRes.status === 403) {
    throw new Error('GitHub rate limit hit — add GITHUB_TOKEN to backend .env or try again in a minute.')
  }
  if (!userRes.ok) throw new Error('GitHub API error — try again.')

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
