import type { Assessment, Application, PlatformData } from '../types'
import type { CompanyReadinessResult, WeeklyStrategy } from '../types'
import { computeGaps, computeOverall } from './intelligence'

const COMPANY_PROFILES: Record<string, { difficulty: number; dsaWeight: number; aptitudeWeight: number }> = {
  Google: { difficulty: 98, dsaWeight: 0.45, aptitudeWeight: 0.1 },
  Amazon: { difficulty: 92, dsaWeight: 0.4, aptitudeWeight: 0.15 },
  Microsoft: { difficulty: 90, dsaWeight: 0.38, aptitudeWeight: 0.12 },
  Meta: { difficulty: 95, dsaWeight: 0.42, aptitudeWeight: 0.1 },
  Apple: { difficulty: 88, dsaWeight: 0.35, aptitudeWeight: 0.12 },
  PayPal: { difficulty: 78, dsaWeight: 0.32, aptitudeWeight: 0.18 },
  Flipkart: { difficulty: 82, dsaWeight: 0.36, aptitudeWeight: 0.15 },
  TCS: { difficulty: 55, dsaWeight: 0.2, aptitudeWeight: 0.35 },
  Infosys: { difficulty: 52, dsaWeight: 0.18, aptitudeWeight: 0.38 },
  Wipro: { difficulty: 50, dsaWeight: 0.18, aptitudeWeight: 0.35 },
  Accenture: { difficulty: 48, dsaWeight: 0.15, aptitudeWeight: 0.4 },
  Cognizant: { difficulty: 50, dsaWeight: 0.17, aptitudeWeight: 0.35 },
}

function matchProfile(company: string) {
  const key = Object.keys(COMPANY_PROFILES).find(
    k => company.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(company.toLowerCase()),
  )
  return key ? { name: key, ...COMPANY_PROFILES[key] } : { name: company, difficulty: 72, dsaWeight: 0.3, aptitudeWeight: 0.2 }
}

export function computeCompanyReadiness(
  assessment: Assessment | null,
  platformData: PlatformData | null,
  company: string,
  domain: string,
): CompanyReadinessResult {
  if (!assessment) {
    return { company, readinessPct: 0, strong: [], weak: ['Complete Career Health assessments first'] }
  }

  const profile = matchProfile(company)
  const gaps = computeGaps(assessment, domain)
  const overall = computeOverall(assessment)

  const weighted =
    assessment.dsa * profile.dsaWeight +
    assessment.resume * 0.15 +
    assessment.projects * 0.12 +
    assessment.communication * 0.1 +
    assessment.aptitude * profile.aptitudeWeight +
    assessment.interview * 0.08

  const lcBonus = platformData?.leetcode
    ? Math.min((platformData.leetcode.hardSolved ?? 0) * 2 + (platformData.leetcode.mediumSolved ?? 0) * 0.5, 15)
    : 0
  const ghBonus = platformData?.github
    ? Math.min(platformData.github.publicRepos * 2 + platformData.github.recentCommitDays, 10)
    : 0

  let readinessPct = Math.round((weighted + lcBonus * 0.3 + ghBonus * 0.2) * (100 / profile.difficulty))
  readinessPct = Math.min(Math.max(readinessPct, 0), 99)

  const strong: string[] = []
  const weak: string[] = []
  if (assessment.projects >= 65 || ghBonus >= 6) strong.push('Projects')
  else weak.push('Projects')
  if (assessment.communication >= 60) strong.push('Communication')
  else weak.push('Communication')
  if (assessment.dsa >= 60 || lcBonus >= 8) strong.push('DSA')
  else weak.push('Graphs & DP')
  if (assessment.resume >= 60) strong.push('Resume')
  else weak.push('Resume')
  if (profile.difficulty < 60 && assessment.aptitude >= 55) strong.push('Aptitude')
  else if (profile.aptitudeWeight > 0.25) weak.push('Aptitude')

  if (overall >= 70 && readinessPct < 50) readinessPct = Math.min(readinessPct + 8, 99)

  return { company: profile.name, readinessPct, strong, weak }
}

export function computeOfferProbabilityForCompany(
  assessment: Assessment | null,
  applications: Application[],
  company: string,
): number {
  if (!assessment) return 0
  const profile = matchProfile(company)
  const readiness = computeCompanyReadiness(assessment, null, company, '')
  const app = applications.find(a => a.company.toLowerCase().includes(company.toLowerCase()))
  let prob = readiness.readinessPct * 0.55

  if (app) {
    const stageBoost: Record<string, number> = {
      Wishlist: 5, Applied: 12, 'Online Assessment': 18,
      'Technical Interview': 28, 'HR Interview': 38, Selected: 95, Rejected: 8,
    }
    prob += stageBoost[app.status] ?? 0
  }

  if (profile.difficulty >= 90) prob *= 0.72
  else if (profile.difficulty >= 80) prob *= 0.85
  else if (profile.difficulty <= 55) prob *= 1.15

  return Math.min(Math.max(Math.round(prob), 5), 95)
}

export function buildWeeklyStrategy(
  assessment: Assessment | null,
  domain: string,
): WeeklyStrategy {
  if (!assessment) {
    return { thisWeek: ['Complete Career Health', 'Set target companies', 'Upload resume'], currentReadiness: 0, projectedReadiness: 12 }
  }
  const gaps = computeGaps(assessment, domain).slice(0, 3)
  const currentReadiness = computeOverall(assessment)
  const thisWeek = gaps.length > 0
    ? gaps.map(g => g.label)
    : ['Maintain DSA streak', 'Apply to 2 companies', 'Mock interview practice']
  const projectedReadiness = Math.min(currentReadiness + thisWeek.length * 2 + 4, 99)
  return { thisWeek, currentReadiness, projectedReadiness }
}

export function computeAllCompanyReadiness(
  assessment: Assessment | null,
  platformData: PlatformData | null,
  companies: string[],
  domain: string,
): CompanyReadinessResult[] {
  const list = companies.length > 0 ? companies : ['TCS', 'Infosys', 'Amazon']
  return list.map(c => computeCompanyReadiness(assessment, platformData, c, domain))
}
