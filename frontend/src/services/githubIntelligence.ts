import type { GitHubData } from './platformAPI'

export function computeGitHubScore(gh: GitHubData): number {
  let score = 0
  score += Math.min(gh.publicRepos * 4, 28)
  score += Math.min(gh.totalStars * 2, 22)
  score += Math.min(gh.recentCommitDays * 2, 24)
  score += Math.min(gh.topLanguages.length * 3, 15)
  if (gh.followers >= 5) score += 4
  if (gh.publicRepos >= 3 && gh.recentCommitDays >= 8) score += 7
  return Math.min(Math.round(score), 100)
}

export function githubInsights(gh: GitHubData): { strong: string[]; weak: string[] } {
  const strong: string[] = []
  const weak: string[] = []
  if (gh.publicRepos >= 5) strong.push('Project portfolio depth')
  else weak.push('Add 2–3 original repos with READMEs')
  if (gh.recentCommitDays >= 12) strong.push('Consistent commit activity')
  else weak.push('Commit at least 3×/week for 30 days')
  if (gh.totalStars >= 5) strong.push('Community traction on repos')
  if (gh.topLanguages.length >= 3) strong.push('Multi-language exposure')
  else weak.push('Showcase stack aligned to target role')
  return { strong, weak }
}
