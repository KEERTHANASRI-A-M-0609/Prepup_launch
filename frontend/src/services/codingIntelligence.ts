import type { PlatformData } from '../types'
import type { CodingProfile } from '../types'

export function buildCodingProfile(
  platformData: PlatformData | null,
  handles: { leetcode?: string; hackerrank?: string; codechef?: string; github?: string },
): CodingProfile {
  const lc = platformData?.leetcode
  const gh = platformData?.github

  const problemsSolved = lc?.totalSolved ?? 0
  const easySolved = lc?.easySolved ?? 0
  const mediumSolved = lc?.mediumSolved ?? 0
  const hardSolved = lc?.hardSolved ?? 0

  const weakTopics: string[] = []
  if (mediumSolved < 30) weakTopics.push('Medium Arrays & Hashing')
  if (hardSolved < 10) weakTopics.push('Hard DP & Graphs')
  if ((lc?.totalSolved ?? 0) < 50) weakTopics.push('Pattern Recognition')

  const recommendedTopics = [
    weakTopics.includes('Medium Arrays & Hashing') ? 'Two Pointers & Sliding Window' : 'Advanced Graph Algorithms',
    weakTopics.includes('Hard DP & Graphs') ? 'Dynamic Programming' : 'System Design Basics',
    'Binary Search & Trees',
  ]

  const consistencyScore = gh ? Math.min(Math.round((gh.recentCommitDays / 30) * 100), 100) : 0
  const contestActivity = 0 // placeholder until contest API wired

  let readinessScore = 0
  if (problemsSolved >= 200) readinessScore += 35
  else if (problemsSolved >= 100) readinessScore += 25
  else if (problemsSolved >= 50) readinessScore += 15
  else readinessScore += Math.min(problemsSolved, 15)

  if (hardSolved >= 20) readinessScore += 25
  else if (hardSolved >= 10) readinessScore += 15
  else readinessScore += hardSolved

  readinessScore += Math.round(consistencyScore * 0.2)
  readinessScore = Math.min(readinessScore, 100)

  const roadmap = [
    weakTopics[0] ? `Week 1–2: ${weakTopics[0]} — 3 problems/day` : 'Week 1–2: Maintain medium problem streak',
    `Week 3: ${recommendedTopics[1]} — 2 problems/day`,
    'Week 4: Timed mock OA (2 hours, 3 problems)',
  ]

  return {
    leetcode: handles.leetcode,
    hackerrank: handles.hackerrank,
    codechef: handles.codechef,
    github: handles.github,
    problemsSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    weakTopics,
    recommendedTopics,
    consistencyScore,
    contestActivity,
    readinessScore,
    roadmap,
  }
}
