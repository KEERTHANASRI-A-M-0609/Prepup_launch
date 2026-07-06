// Vertex Intelligence Engine
// Every score, recommendation, action, and resource is computed here.
// Nothing is hardcoded — all outputs are functions of user state.

import type { Assessment, FailureEntry, ActivityLog, Application, ResumeEvidence, CommEvidence, AptitudeEvidence, AssessmentSections, ResourceItem } from '../types'
import {
  buildCompanyPrepSections,
  mergeCompanyResources,
  ROLE_RESOURCE_EXTENSIONS,
  resolveCompanyProfiles,
  matchCompanyProfile,
  type CompanyPrepSection,
} from './companyResourceEngine'
import {
  computeConsistencyMetrics,
  computeMomentumTrend as computeActivityMomentumTrend,
  localDateKey,
  isExecutionDay,
  getDayEntry,
} from './activityEngine'

export const WEIGHTS: Record<string, number> = { // Updated weights as per user request
  dsa: 0.25, resume: 0.15, projects: 0.20,
  aptitude: 0.15, communication: 0.15, interview: 0.10,
}

export const COLORS: Record<string, string> = {
  dsa: '#1E3A5F', resume: '#334155', projects: '#0F766E',
  aptitude: '#475569', communication: '#1E40AF', interview: '#0F172A',
}

export const LABELS: Record<string, string> = {
  dsa: 'DSA', resume: 'Resume', projects: 'Projects', // Existing labels
  aptitude: 'Aptitude', communication: 'Communication', interview: 'Interview Performance',
}

export const ROLE_BENCHMARKS: Record<string, Record<string, number>> = {
  'Software Engineering': { dsa: 80, projects: 70, resume: 70, communication: 65, aptitude: 65, interview: 60 },
  'Product Management':   { dsa: 40, projects: 60, resume: 75, communication: 80, aptitude: 70, interview: 70 },
  'Data Science':         { dsa: 65, projects: 75, resume: 70, communication: 60, aptitude: 75, interview: 60 },
  'Cybersecurity':        { dsa: 60, projects: 65, resume: 65, communication: 60, aptitude: 65, interview: 55 },
  'UI / UX Design':       { dsa: 20, projects: 85, resume: 75, communication: 75, aptitude: 50, interview: 65 },
  'AI / ML':              { dsa: 70, projects: 80, resume: 70, communication: 60, aptitude: 80, interview: 60 },
  'Cloud & DevOps':       { dsa: 55, projects: 75, resume: 65, communication: 60, aptitude: 60, interview: 55 },
  'Other':                { dsa: 60, projects: 60, resume: 65, communication: 65, aptitude: 60, interview: 60 },
}

/** Which assessment sections are required to finish — varies by target role. */
export type RoleMandatorySections = {
  resume: boolean
  leetcode: boolean
  github: boolean
  aptitude: boolean
  communication: boolean
}

export const ROLE_MANDATORY_SECTIONS: Record<string, RoleMandatorySections> = {
  'Software Engineering': { resume: true, leetcode: false, github: false, aptitude: false, communication: false },
  'Product Management':   { resume: true, leetcode: false, github: false, aptitude: true,  communication: true },
  'Data Science':         { resume: true, leetcode: false, github: false, aptitude: true,  communication: false },
  'Cybersecurity':        { resume: true, leetcode: false, github: false, aptitude: false, communication: false },
  'UI / UX Design':       { resume: true, leetcode: false, github: false, aptitude: false, communication: true },
  'AI / ML':              { resume: true, leetcode: false, github: false, aptitude: true,  communication: false },
  'Cloud & DevOps':       { resume: true, leetcode: false, github: false, aptitude: false, communication: false },
  'Other':                { resume: true, leetcode: false, github: false, aptitude: false, communication: false },
}

export function getRoleMandatorySections(domain: string): RoleMandatorySections {
  return ROLE_MANDATORY_SECTIONS[domain] ?? ROLE_MANDATORY_SECTIONS['Software Engineering']
}

export interface RecommendedAddon {
  key: 'aptitude' | 'communication' | 'leetcode' | 'github'
  label: string
  reason: string
  mandatory: boolean
}

/** Skill add-ons recommended (or required) for a role — shown on assessment & Preparation. */
export function getRecommendedAddons(domain: string, a: Assessment | null | undefined): RecommendedAddon[] {
  const bench = ROLE_BENCHMARKS[domain] ?? ROLE_BENCHMARKS['Software Engineering']
  const mandatory = getRoleMandatorySections(domain)
  const sections = a ? inferSections(a) : { leetcode: false, github: false, resume: false, aptitude: false, communication: false }
  const addons: RecommendedAddon[] = []

  if (!sections.leetcode && bench.dsa >= 55) {
    addons.push({
      key: 'leetcode',
      label: 'LeetCode (DSA)',
      reason: `${domain} benchmarks expect ${bench.dsa}%+ DSA — connect LeetCode for an evidence-based score.`,
      mandatory: mandatory.leetcode,
    })
  }
  if (!sections.github && bench.projects >= 55) {
    addons.push({
      key: 'github',
      label: 'GitHub (Projects)',
      reason: `${domain} roles target ${bench.projects}%+ project readiness — connect GitHub for live evidence.`,
      mandatory: mandatory.github,
    })
  }
  if (!sections.aptitude) {
    addons.push({
      key: 'aptitude',
      label: 'Aptitude Check',
      reason: `${domain} placement track expects ${bench.aptitude}%+ aptitude — take the adaptive quiz in Career Health.`,
      mandatory: mandatory.aptitude,
    })
  }
  if (!sections.communication) {
    addons.push({
      key: 'communication',
      label: 'Communication Check',
      reason: `${domain} interviews need ${bench.communication}%+ communication — voice check in Career Health (~2 min).`,
      mandatory: mandatory.communication,
    })
  }
  return addons
}

function meetsMandatorySections(
  mandatory: RoleMandatorySections,
  sections: AssessmentSections,
  resume: ResumeEvidence | null | undefined,
  comm: CommEvidence | null | undefined,
  aptitude: AptitudeEvidence | null | undefined,
): boolean {
  if (mandatory.resume && !resume) return false
  if (mandatory.leetcode && !sections.leetcode) return false
  if (mandatory.github && !sections.github) return false
  if (mandatory.aptitude && !aptitude) return false
  if (mandatory.communication && (!comm || comm.method === 'skipped')) return false
  return true
}

// ── Overall score from assessment (only measured sections count) ───────────────
export function inferSections(a: Assessment): AssessmentSections {
  return a.sections ?? {
    leetcode: a.dsa > 0,
    github: a.projects > 0,
    resume: !!a.resumeEvidence || a.resume > 0,
    aptitude: !!a.aptitudeEvidence || a.aptitude > 0,
    communication: !!a.commEvidence && a.commEvidence.method !== 'skipped',
  }
}

export function isAssessmentComplete(a: Assessment | null | undefined, domain = 'Software Engineering'): boolean {
  if (!a) return false
  const mandatory = getRoleMandatorySections(domain)
  const sections = inferSections(a)
  if (!meetsMandatorySections(mandatory, sections, a.resumeEvidence, a.commEvidence ?? null, a.aptitudeEvidence ?? null)) {
    return false
  }
  return !!a.resumeEvidence
}

export function computeOverall(a: Assessment): number {
  const s = inferSections(a)
  let weighted = 0
  let totalW = 0

  if (s.leetcode)       { weighted += a.dsa * WEIGHTS.dsa; totalW += WEIGHTS.dsa }
  if (s.github)         { weighted += a.projects * WEIGHTS.projects; totalW += WEIGHTS.projects }
  if (s.resume)         { weighted += a.resume * WEIGHTS.resume; totalW += WEIGHTS.resume }
  if (s.aptitude)       { weighted += a.aptitude * WEIGHTS.aptitude; totalW += WEIGHTS.aptitude }
  if (s.communication)  { weighted += a.communication * WEIGHTS.communication; totalW += WEIGHTS.communication }
  if ((a.interview ?? 0) > 0) { weighted += a.interview! * WEIGHTS.interview; totalW += WEIGHTS.interview }

  if (totalW === 0) return 0
  return Math.round(weighted / totalW)
}

export function readinessLabel(score: number): string {
  if (score >= 80) return 'Interview Ready'
  if (score >= 65) return 'Approaching Ready'
  if (score >= 45) return 'Building Foundation'
  return 'Early Stage'
}

// ── Gap analysis vs role benchmark ───────────────────────────────────────────
export interface GapItem {
  key: string; label: string; current: number; target: number; gap: number; color: string
}

export function computeGaps(a: Assessment, domain: string): GapItem[] {
  const bench = ROLE_BENCHMARKS[domain] ?? ROLE_BENCHMARKS['Software Engineering']
  const sections = inferSections(a)
  const scores: Record<string, number> = {
    dsa: a.dsa, resume: a.resume, projects: a.projects,
    aptitude: a.aptitude, communication: a.communication,
    interview: a.interview ?? 0,
  }
  const sectionMap: Record<string, boolean> = {
    dsa: sections.leetcode,
    projects: sections.github,
    resume: sections.resume,
    aptitude: sections.aptitude,
    communication: sections.communication,
    interview: (a.interview ?? 0) > 0,
  }
  return Object.keys(WEIGHTS)
    .filter(k => sectionMap[k])
    .map(k => ({
      key: k, label: LABELS[k], current: scores[k],
      target: bench[k], gap: Math.max(0, bench[k] - scores[k]), color: COLORS[k],
    }))
    .sort((a, b) => b.gap - a.gap)
}

// ── Dynamic next actions from gaps ───────────────────────────────────────────
export interface NextAction { category: string; text: string; time: string; urgent: boolean }

const ACTION_MAP: Record<string, (gap: number) => { category: string; text: string; time: string }> = {
  dsa:           g => ({ category: 'dsa', text: g > 20 ? 'Solve 5 LeetCode Medium problems (Arrays, DP, Graphs)' : 'Solve 2 LeetCode Hard problems to push your DSA ceiling', time: '60 min' }),
  resume:        g => ({ category: 'resume', text: g > 15 ? 'Add 3 quantified achievements to your resume (use numbers/%)' : 'Run your resume through Jobscan ATS checker and fix flagged issues', time: '30 min' }),
  projects:      g => ({ category: 'projects', text: g > 20 ? 'Start a new project or deploy an existing one to Vercel' : 'Push 3 commits to GitHub and improve your project README', time: '90 min' }),
  communication: g => ({ category: 'communication', text: g > 20 ? 'Practice 3 STAR-format behavioral answers out loud (record yourself)' : 'Review a mock HR question recording and count filler words', time: '45 min' }),
  aptitude:      g => ({ category: 'aptitude', text: g > 20 ? 'Complete 20 quant questions on IndiaBix (Time & Work, Percentages)' : 'Complete 10 logical reasoning questions on IndiaBix', time: '40 min' }),
  interview:     _g => ({ category: 'interview', text: 'Log your last interview in Failure Intel to extract improvement patterns', time: '20 min' }),
}

export function generateNextActions(gaps: GapItem[]): NextAction[] {
  const prioritized = [...gaps].sort((a, b) => b.gap - a.gap)
  const withGaps = prioritized.filter(g => g.gap > 0)
  const source = withGaps.length > 0 ? withGaps : prioritized
  return source.slice(0, 4).map((g, i) => {
    const a = ACTION_MAP[g.key]?.(g.gap) ?? { category: g.key, text: `Work on ${g.label}`, time: '30 min' }
    return { ...a, urgent: i === 0 }
  })
}

export type { ResourceItem } from '../types'

const RESOURCE_DB: Record<string, ResourceItem[]> = {
  dsa: [
    { title: 'NeetCode 150 – Structured DSA Roadmap', type: 'Course', tag: 'DSA', url: 'https://neetcode.io', why: 'Best structured list covering all patterns tested in placements', impact: 'High', effort: '60 min/day' },
    { title: 'LeetCode Blind 75 – Must-solve List', type: 'Practice', tag: 'DSA', url: 'https://leetcode.com/discuss/general-discussion/460599', why: 'Covers patterns repeatedly asked in product companies', impact: 'High', effort: '45 min/day' },
    { title: 'Striver\'s A2Z DSA Sheet', type: 'Roadmap', tag: 'DSA', url: 'https://takeuforward.org/strivers-a2z-dsa-course/', why: 'Comprehensive topic-wise sheet popular for Indian placements', impact: 'High', effort: '90 min/day' },
    { title: 'GFG DSA Self Paced', type: 'Course', tag: 'DSA', provider: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/dsa-self-paced-course/', why: 'Structured learning with practice problems per topic', impact: 'Medium', effort: '60 min/day' },
  ],
  resume: [
    { title: 'Harvard Resume Template (LaTeX)', type: 'Template', tag: 'Resume', url: 'https://www.overleaf.com/gallery/tagged/cv', why: 'Clean ATS-friendly format used by top candidates', impact: 'High', effort: '2 hrs one-time' },
    { title: 'Jobscan – ATS Resume Checker', type: 'Tool', tag: 'Resume', url: 'https://www.jobscan.co', why: 'Checks your resume against actual ATS parsers', impact: 'High', effort: '30 min/use' },
    { title: 'Resume Worded – Line-by-line Feedback', type: 'Tool', tag: 'Resume', url: 'https://resumeworded.com', why: 'AI-based scoring with actionable line-level suggestions', impact: 'High', effort: '30 min/use' },
    { title: 'Action Verbs for Tech Resumes', type: 'Reference', tag: 'Resume', url: 'https://www.themuse.com/advice/185-powerful-verbs-that-will-make-your-resume-awesome', why: 'Stronger verbs = better ATS scoring and recruiter attention', impact: 'Medium', effort: '15 min/use' },
  ],
  projects: [
    { title: 'Full Stack Open – Helsinki MOOC', type: 'Course', tag: 'Projects', url: 'https://fullstackopen.com', why: 'Best free full-stack course for building real projects', impact: 'High', effort: '3 hrs/week' },
    { title: 'Awesome Project Ideas – GitHub', type: 'Reference', tag: 'Projects', url: 'https://github.com/practical-tutorials/project-based-learning', why: 'Curated list of build-to-learn projects with tutorials', impact: 'Medium', effort: '2 hrs/project' },
    { title: 'Vercel – Free Deployment Platform', type: 'Tool', tag: 'Projects', url: 'https://vercel.com', why: 'Deploy in one click – deployed projects score higher', impact: 'High', effort: '15 min/deploy' },
    { title: 'System Design Primer', type: 'Reference', tag: 'Projects', url: 'https://github.com/donnemartin/system-design-primer', why: 'Understanding system design boosts project credibility in interviews', impact: 'High', effort: '45 min/day' },
  ],
  aptitude: [
    { title: 'IndiaBix – Quantitative Aptitude', type: 'Practice', tag: 'Aptitude', url: 'https://www.indiabix.com/aptitude/questions-and-answers/', why: 'Most used platform for placement aptitude prep in India', impact: 'High', effort: '30 min/day' },
    { title: 'Arun Sharma – Quantitative Aptitude (PDF)', type: 'Book', tag: 'Aptitude', url: 'https://drive.google.com/drive/folders/1IyHtGSR_RLvzwHAHoHkXEHoovQNW3JyX', why: 'Gold standard book for quant prep, covers all placement patterns', impact: 'High', effort: '45 min/day' },
    { title: 'Logical Reasoning by IndiaBix', type: 'Practice', tag: 'Aptitude', url: 'https://www.indiabix.com/logical-reasoning/questions-and-answers/', why: 'Covers all patterns in campus placement logical reasoning', impact: 'Medium', effort: '20 min/day' },
  ],
  communication: [
    { title: 'STAR Method – Behavioral Interview Guide', type: 'Guide', tag: 'Communication', url: 'https://www.themuse.com/advice/star-interview-method', why: 'STAR format dramatically improves clarity in HR interviews', impact: 'High', effort: '1 hr/week' },
    { title: 'Toastmasters – Public Speaking Practice', type: 'Practice', tag: 'Communication', url: 'https://www.toastmasters.org', why: 'Structured peer feedback accelerates verbal confidence', impact: 'High', effort: '2 hrs/week' },
    { title: 'Speeko – Public Speaking App', type: 'App', tag: 'Communication', url: 'https://www.speeko.co', why: 'Daily 5-minute exercises for pacing and filler word reduction', impact: 'Medium', effort: '10 min/day' },
  ],
  interview: [
    { title: 'Pramp – Free Mock Interviews', type: 'Practice', tag: 'Interview', url: 'https://www.pramp.com', why: 'Peer mock interviews simulate real placement rounds', impact: 'High', effort: '1 hr/session' },
    { title: 'InterviewBit – Interview Prep', type: 'Course', tag: 'Interview', url: 'https://www.interviewbit.com', why: 'Company-specific preparation with real interview questions', impact: 'High', effort: '45 min/day' },
    { title: 'Glassdoor – Company Interview Reviews', type: 'Research', tag: 'Interview', url: 'https://www.glassdoor.com', why: 'Real interview questions shared by candidates from your target companies', impact: 'High', effort: '30 min/company' },
  ],
}

export interface ResourceCategory { key: string; label: string; gap: number; items: ResourceItem[] }

export type PrepLevel = 'beginner' | 'intermediate' | 'advanced'

export const LEVEL_LABELS: Record<PrepLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const LEVEL_BENCHMARK_SCALE: Record<PrepLevel, number> = {
  beginner: 0.78,
  intermediate: 1.0,
  advanced: 1.08,
}

const LEVEL_RESOURCE_COUNT: Record<PrepLevel, number> = {
  beginner: 4,
  intermediate: 3,
  advanced: 3,
}

export interface RemainingPrepSummary {
  totalGapPoints: number
  skillsWithGaps: number
  prepCompletedPct: number
  estimatedWeeks: number
  weeklyHoursMid: number
  burden: 'Light' | 'Moderate' | 'Heavy' | 'Intensive'
  level: PrepLevel
  domain: string
  readinessStage: string
}

export interface ResourcePlan {
  summary: RemainingPrepSummary
  gaps: GapItem[]
  categories: ResourceCategory[]
  topPicks: ResourceItem[]
  companySections: CompanyPrepSection[]
  matchedCompanies: string[]
  unmatchedCompanies: string[]
}

export function parseWeeklyHoursMid(weeklyHours: string): number {
  const match = weeklyHours.match(/(\d+)/g)
  if (!match?.length) return 12
  if (match.length === 1) return Math.max(parseInt(match[0], 10), 5)
  const a = parseInt(match[0], 10)
  const b = parseInt(match[1], 10)
  return Math.round((a + b) / 2)
}

export function getAdjustedBenchmarks(domain: string, level: PrepLevel = 'intermediate'): Record<string, number> {
  const base = ROLE_BENCHMARKS[resolveDomain(domain)] ?? ROLE_BENCHMARKS['Software Engineering']
  const scale = LEVEL_BENCHMARK_SCALE[level]
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [k, Math.min(Math.round(v * scale), 95)]),
  )
}

export function computeGapsForLevel(a: Assessment, domain: string, level: PrepLevel = 'intermediate'): GapItem[] {
  const bench = getAdjustedBenchmarks(domain, level)
  const sections = inferSections(a)
  const scores: Record<string, number> = {
    dsa: a.dsa, resume: a.resume, projects: a.projects,
    aptitude: a.aptitude, communication: a.communication,
    interview: a.interview ?? 0,
  }
  const sectionMap: Record<string, boolean> = {
    dsa: sections.leetcode,
    projects: sections.github,
    resume: sections.resume,
    aptitude: sections.aptitude,
    communication: sections.communication,
    interview: (a.interview ?? 0) > 0,
  }
  return Object.keys(WEIGHTS)
    .filter(k => sectionMap[k])
    .map(k => ({
      key: k, label: LABELS[k], current: scores[k],
      target: bench[k], gap: Math.max(0, bench[k] - scores[k]), color: COLORS[k],
    }))
    .sort((a, b) => b.gap - a.gap)
}

export function computeRemainingPrep(
  assessment: Assessment | null | undefined,
  domain: string,
  level: PrepLevel = 'intermediate',
  weeklyHours = '10 – 20 hrs',
): RemainingPrepSummary {
  const resolved = resolveDomain(domain)
  const weeklyHoursMid = parseWeeklyHoursMid(weeklyHours)
  const bench = getAdjustedBenchmarks(resolved, level)

  if (!assessment) {
    const totalTarget = Object.values(bench).reduce((s, v) => s + v, 0)
    const estimatedWeeks = Math.max(4, Math.ceil(totalTarget / Math.max(weeklyHoursMid * 2.5, 10)))
    return {
      totalGapPoints: totalTarget,
      skillsWithGaps: Object.keys(bench).length,
      prepCompletedPct: 0,
      estimatedWeeks,
      weeklyHoursMid,
      burden: estimatedWeeks >= 12 ? 'Intensive' : estimatedWeeks >= 8 ? 'Heavy' : estimatedWeeks >= 4 ? 'Moderate' : 'Light',
      level,
      domain: resolved,
      readinessStage: 'Not Started',
    }
  }

  const gaps = computeGapsForLevel(assessment, resolved, level)
  const totalGapPoints = gaps.reduce((s, g) => s + g.gap, 0)
  const skillsWithGaps = gaps.filter(g => g.gap > 0).length
  const overall = computeOverall(assessment)
  const avgTarget = Object.values(bench).reduce((s, v) => s + v, 0) / Object.keys(bench).length
  const prepCompletedPct = Math.min(Math.round((overall / avgTarget) * 100), 100)
  const pointsPerHour = level === 'beginner' ? 1.8 : level === 'advanced' ? 2.8 : 2.2
  const estimatedWeeks = totalGapPoints > 0
    ? Math.max(1, Math.ceil(totalGapPoints / (weeklyHoursMid * pointsPerHour)))
    : 0

  const burden: RemainingPrepSummary['burden'] =
    estimatedWeeks >= 14 ? 'Intensive'
    : estimatedWeeks >= 8 ? 'Heavy'
    : estimatedWeeks >= 4 ? 'Moderate'
    : 'Light'

  return {
    totalGapPoints,
    skillsWithGaps,
    prepCompletedPct,
    estimatedWeeks,
    weeklyHoursMid,
    burden,
    level,
    domain: resolved,
    readinessStage: readinessLabel(overall),
  }
}

export function recommendResourcePlan(opts: {
  assessment?: Assessment | null
  domain: string
  level?: PrepLevel
  weeklyHours?: string
  targetCompanies?: string[]
}): ResourcePlan {
  const level = opts.level ?? 'intermediate'
  const domain = opts.domain
  const resolved = resolveDomain(domain)
  const gaps = opts.assessment
    ? computeGapsForLevel(opts.assessment, domain, level)
    : []
  const categories = getResourcesByCategory(gaps, domain, level)
  const gapKeys = gaps.filter(g => g.gap > 0).map(g => g.key)
  const companies = opts.targetCompanies ?? []

  const roleExtras = ROLE_RESOURCE_EXTENSIONS[resolved] ?? []
  const basePicks = categories.flatMap(c => c.items)
  const mergedPicks = mergeCompanyResources(
    [...roleExtras, ...basePicks],
    companies,
    gapKeys,
    12,
  )

  const companySections = buildCompanyPrepSections(companies, gapKeys)
  const matched = resolveCompanyProfiles(companies).map(p => p.name)
  const unmatched = companies.filter(c => !matchCompanyProfile(c))

  const summary = computeRemainingPrep(opts.assessment, domain, level, opts.weeklyHours)

  return {
    summary,
    gaps,
    categories,
    topPicks: mergedPicks.slice(0, 6),
    companySections,
    matchedCompanies: matched,
    unmatchedCompanies: unmatched,
  }
}

export function getResourcesByCategory(
  gaps: GapItem[],
  domain = 'Software Engineering',
  level: PrepLevel = 'intermediate',
): ResourceCategory[] {
  const resolved = resolveDomain(domain)
  const priority = DOMAIN_SKILL_PRIORITY[resolved] ?? DOMAIN_SKILL_PRIORITY['Software Engineering']
  const count = LEVEL_RESOURCE_COUNT[level]

  if (!gaps.length) {
    return getStarterResourcesForDomain(resolved, level)
  }

  const withGaps = gaps.filter(g => g.gap > 0)
  const sorted = [...(withGaps.length > 0 ? withGaps : [...gaps].sort((a, b) => a.current - b.current))]
    .sort((a, b) => {
      const pa = priority.indexOf(a.key)
      const pb = priority.indexOf(b.key)
      const aRank = pa === -1 ? 99 : pa
      const bRank = pb === -1 ? 99 : pb
      if (aRank !== bRank) return aRank - bRank
      return b.gap - a.gap
    })
    .filter(g => isSkillRelevantForDomain(g.key, resolved, g.gap))

  const topGaps = sorted.slice(0, 4)

  return topGaps
    .map(g => ({
      key: g.key,
      label: g.label,
      gap: g.gap,
      items: getResourcesForSkill(g.key, resolved, level).slice(0, count),
    }))
    .filter(c => c.items.length > 0)
}

export function getRecommendedResources(
  gaps: GapItem[],
  domain: string,
  level: PrepLevel = 'intermediate',
): ResourceItem[] {
  if (!gaps.length) return getStarterResourcesForDomain(domain, level).flatMap(c => c.items)
  return getResourcesByCategory(gaps, domain, level).flatMap(c => c.items)
}

/** Tabs shown on Preparation page — ordered by domain relevance. */
export function getPreparationTabs(domain: string): string[] {
  const resolved = resolveDomain(domain)
  const priority = DOMAIN_SKILL_PRIORITY[resolved] ?? DOMAIN_SKILL_PRIORITY['Software Engineering']
  const skillToTab: Record<string, string> = {
    dsa: 'DSA',
    projects: 'Projects',
    resume: 'Resume',
    aptitude: 'Resources',
    communication: 'Resources',
    interview: 'Resources',
  }
  const tabs: string[] = []
  for (const skill of priority) {
    const tab = skillToTab[skill]
    if (tab && !tabs.includes(tab)) tabs.push(tab)
  }
  if (!tabs.includes('Resources')) tabs.push('Resources')
  return tabs
}

function resolveDomain(domain: string): string {
  if (ROLE_BENCHMARKS[domain]) return domain
  const lower = domain.toLowerCase()
  if (lower.includes('product')) return 'Product Management'
  if (lower.includes('data scien')) return 'Data Science'
  if (lower.includes('cyber') || lower.includes('security')) return 'Cybersecurity'
  if (lower.includes('ui') || lower.includes('ux') || lower.includes('design')) return 'UI / UX Design'
  if (lower.includes('ai') || lower.includes('ml') || lower.includes('machine learning')) return 'AI / ML'
  if (lower.includes('cloud') || lower.includes('devops') || lower.includes('sre')) return 'Cloud & DevOps'
  if (lower.includes('software') || lower.includes('engineer') || lower.includes('developer')) return 'Software Engineering'
  return 'Other'
}

/** Normalize free-text role/domain to a known placement track. */
export function resolveRoleDomain(domain: string): string {
  return resolveDomain(domain)
}

export function getDomainSkillPriority(domain: string): string[] {
  const resolved = resolveDomain(domain)
  return DOMAIN_SKILL_PRIORITY[resolved] ?? DOMAIN_SKILL_PRIORITY['Software Engineering']
}

const DOMAIN_SKILL_PRIORITY: Record<string, string[]> = {
  'Software Engineering': ['dsa', 'projects', 'resume', 'aptitude', 'communication', 'interview'],
  'Product Management':   ['communication', 'resume', 'aptitude', 'projects', 'interview', 'dsa'],
  'Data Science':         ['projects', 'aptitude', 'dsa', 'resume', 'communication', 'interview'],
  'Cybersecurity':        ['projects', 'dsa', 'resume', 'aptitude', 'communication', 'interview'],
  'UI / UX Design':       ['projects', 'resume', 'communication', 'aptitude', 'interview', 'dsa'],
  'AI / ML':              ['projects', 'dsa', 'aptitude', 'resume', 'communication', 'interview'],
  'Cloud & DevOps':       ['projects', 'dsa', 'resume', 'aptitude', 'communication', 'interview'],
  'Other':                ['resume', 'projects', 'communication', 'aptitude', 'dsa', 'interview'],
}

function isSkillRelevantForDomain(skillKey: string, domain: string, gap: number): boolean {
  const priority = DOMAIN_SKILL_PRIORITY[domain] ?? DOMAIN_SKILL_PRIORITY['Software Engineering']
  const rank = priority.indexOf(skillKey)
  if (rank === -1) return false
  const bench = ROLE_BENCHMARKS[domain]?.[skillKey] ?? 60
  // Deprioritize skills with very low domain benchmarks unless gap is significant
  if (bench <= 30 && gap < 15) return false
  if (rank >= 4 && gap < 12) return false
  return true
}

function mergeResources(primary: ResourceItem[], secondary: ResourceItem[]): ResourceItem[] {
  const seen = new Set<string>()
  const out: ResourceItem[] = []
  for (const r of [...primary, ...secondary]) {
    if (seen.has(r.url)) continue
    seen.add(r.url)
    out.push(r)
  }
  return out
}

const LEVEL_RESOURCE_EXTRAS: Record<PrepLevel, Partial<Record<string, ResourceItem[]>>> = {
  beginner: {
    dsa: [
      { title: 'CS50 – Introduction to Computer Science', type: 'Course', tag: 'Foundations', url: 'https://cs50.harvard.edu/x/', why: 'Build programming fundamentals before heavy DSA grind', impact: 'High', effort: '5 hrs/week' },
      { title: 'Khan Academy – Algorithms Basics', type: 'Course', tag: 'Foundations', url: 'https://www.khanacademy.org/computing/computer-science/algorithms', why: 'Visual intro to sorting, searching, and complexity', impact: 'Medium', effort: '30 min/day' },
    ],
    resume: [
      { title: 'Resume for Freshers – GeeksforGeeks', type: 'Guide', tag: 'Foundations', url: 'https://www.geeksforgeeks.org/resume-building-for-freshers/', why: 'Step-by-step campus placement resume from scratch', impact: 'High', effort: '2 hrs one-time' },
    ],
    projects: [
      { title: 'freeCodeCamp – Responsive Web Design', type: 'Course', tag: 'Foundations', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', why: 'First portfolio project with guided milestones', impact: 'High', effort: '4 hrs/week' },
    ],
    aptitude: [
      { title: 'RS Aggarwal Quantitative Aptitude (Basics)', type: 'Book', tag: 'Foundations', url: 'https://www.indiabix.com/aptitude/questions-and-answers/', why: 'Start with easy quant before timed OAs', impact: 'High', effort: '20 min/day' },
    ],
    communication: [
      { title: 'BBC Learning English – Speaking', type: 'Course', tag: 'Foundations', url: 'https://www.bbc.co.uk/learningenglish/', why: 'Daily short exercises to build interview confidence', impact: 'Medium', effort: '15 min/day' },
    ],
  },
  intermediate: {},
  advanced: {
    dsa: [
      { title: 'LeetCode Contest & Hard Problems', type: 'Practice', tag: 'Advanced', url: 'https://leetcode.com/contest/', why: 'Weekly contests simulate top-tier OA pressure', impact: 'High', effort: '90 min/week' },
      { title: 'Codeforces – Div 2 Problems', type: 'Practice', tag: 'Advanced', url: 'https://codeforces.com/problemset', why: 'Push problem-solving speed for FAANG-level rounds', impact: 'High', effort: '60 min/day' },
    ],
    projects: [
      { title: 'Build a Distributed System Mini-Project', type: 'Project', tag: 'Advanced', url: 'https://github.com/donnemartin/system-design-primer', why: 'System design depth separates senior-ready candidates', impact: 'High', effort: '6 hrs/week' },
    ],
    interview: [
      { title: 'Interviewing.io – Anonymous Mocks', type: 'Practice', tag: 'Advanced', url: 'https://interviewing.io', why: 'Real FAANG interviewer feedback on hard problems', impact: 'High', effort: '1 hr/session' },
    ],
  },
}

function pickResourcesForLevel(items: ResourceItem[], level: PrepLevel): ResourceItem[] {
  if (level === 'beginner') {
    const foundational = items.filter(r =>
      ['Course', 'Roadmap', 'Guide', 'Template', 'Reference'].includes(r.type),
    )
    return foundational.length >= 2 ? foundational : items.slice(0, 3)
  }
  if (level === 'advanced') {
    const advanced = items.filter(r =>
      ['Practice', 'Project'].includes(r.type) || r.tag === 'Advanced',
    )
    return advanced.length >= 2 ? advanced : items.slice(-3)
  }
  return items
}

function getResourcesForSkill(skillKey: string, domain: string, level: PrepLevel = 'intermediate'): ResourceItem[] {
  const domainItems = DOMAIN_RESOURCES[domain]?.[skillKey] ?? []
  const generic = RESOURCE_DB[skillKey] ?? []
  const levelExtras = LEVEL_RESOURCE_EXTRAS[level][skillKey] ?? []
  const merged = mergeResources(mergeResources(domainItems, generic), levelExtras)
  return pickResourcesForLevel(merged, level)
}

function getStarterResourcesForDomain(domain: string, level: PrepLevel = 'intermediate'): ResourceCategory[] {
  const priority = (DOMAIN_SKILL_PRIORITY[domain] ?? DOMAIN_SKILL_PRIORITY['Software Engineering'])
    .filter(k => k !== 'interview')
    .slice(0, level === 'beginner' ? 4 : 3)
  const count = LEVEL_RESOURCE_COUNT[level]
  return priority
    .map(key => ({
      key,
      label: LABELS[key] ?? key,
      gap: 0,
      items: getResourcesForSkill(key, domain, level).slice(0, count),
    }))
    .filter(c => c.items.length > 0)
}

const DOMAIN_RESOURCES: Record<string, Partial<Record<string, ResourceItem[]>>> = {
  'Product Management': {
    communication: [
      { title: 'Cracking the PM Interview', type: 'Book', tag: 'PM', url: 'https://www.crackingthepminterview.com', why: 'Gold standard for PM behavioral and product sense interviews', impact: 'High', effort: '45 min/day' },
      { title: 'Exponent – PM Interview Prep', type: 'Course', tag: 'PM', url: 'https://www.tryexponent.com', why: 'Structured PM mock interviews and frameworks (CIRCLES, etc.)', impact: 'High', effort: '1 hr/day' },
      { title: 'Product Alliance – Case Studies', type: 'Practice', tag: 'PM', url: 'https://www.productalliance.com', why: 'Real PM interview questions from top tech companies', impact: 'High', effort: '30 min/day' },
    ],
    aptitude: [
      { title: 'PM Aptitude & Guesstimates', type: 'Guide', tag: 'PM', url: 'https://www.tryexponent.com/blog/product-manager-interview-questions', why: 'Estimation and analytical questions common in PM OAs', impact: 'High', effort: '30 min/day' },
      { title: 'CaseInterview.com – Mental Math', type: 'Practice', tag: 'PM', url: 'https://www.caseinterview.com', why: 'Sharpens quant reasoning for product metrics questions', impact: 'Medium', effort: '20 min/day' },
    ],
    resume: [
      { title: 'PM Resume Template – Lenny\'s Newsletter', type: 'Template', tag: 'PM', url: 'https://www.lennysnewsletter.com', why: 'Impact-focused PM resume format recruiters expect', impact: 'High', effort: '2 hrs one-time' },
    ],
    projects: [
      { title: 'Build a Product Teardown Doc', type: 'Project', tag: 'PM', url: 'https://www.producthunt.com', why: 'Weekly product teardowns build PM thinking evidence', impact: 'High', effort: '2 hrs/week' },
    ],
  },
  'UI / UX Design': {
    projects: [
      { title: 'Figma Community – UI Kits', type: 'Tool', tag: 'Design', url: 'https://www.figma.com/community', why: 'Build portfolio-ready case studies with professional UI kits', impact: 'High', effort: '3 hrs/week' },
      { title: 'Behance – Portfolio Inspiration', type: 'Reference', tag: 'Design', url: 'https://www.behance.net', why: 'Study top portfolios and publish your own case studies', impact: 'High', effort: '1 hr/week' },
      { title: 'Google UX Design Certificate', type: 'Course', tag: 'Design', url: 'https://grow.google/uxdesign/', why: 'Structured path to portfolio projects recruiters recognize', impact: 'High', effort: '5 hrs/week' },
    ],
    resume: [
      { title: 'UX Portfolio Checklist', type: 'Guide', tag: 'Design', url: 'https://www.nngroup.com/articles/ux-portfolio/', why: 'NN/g guidance on what hiring managers look for in design portfolios', impact: 'High', effort: '1 hr one-time' },
    ],
    communication: [
      { title: 'Presenting Design Work – NN/g', type: 'Guide', tag: 'Design', url: 'https://www.nngroup.com/articles/presenting-design-work/', why: 'Design interviews require clear walkthrough of your process', impact: 'High', effort: '45 min/week' },
    ],
  },
  'Data Science': {
    projects: [
      { title: 'Kaggle – Competitions & Datasets', type: 'Practice', tag: 'Data', url: 'https://www.kaggle.com', why: 'Live ML projects with public notebooks for your portfolio', impact: 'High', effort: '4 hrs/week' },
      { title: 'fast.ai – Practical Deep Learning', type: 'Course', tag: 'Data', url: 'https://course.fast.ai', why: 'Hands-on ML projects that translate to interview discussions', impact: 'High', effort: '5 hrs/week' },
    ],
    dsa: [
      { title: 'LeetCode SQL & Array (DS-focused)', type: 'Practice', tag: 'DSA', url: 'https://leetcode.com/problemset/database/', why: 'Data roles need SQL fluency plus core Python/DSA patterns', impact: 'Medium', effort: '30 min/day' },
    ],
    aptitude: [
      { title: 'StatQuest – Statistics Fundamentals', type: 'Course', tag: 'Data', url: 'https://www.youtube.com/c/joshstarmer', why: 'Stats & probability questions dominate data science OAs', impact: 'High', effort: '30 min/day' },
    ],
  },
  'Cybersecurity': {
    projects: [
      { title: 'TryHackMe – Guided Labs', type: 'Practice', tag: 'Security', url: 'https://tryhackme.com', why: 'Hands-on security labs for portfolio and interview stories', impact: 'High', effort: '3 hrs/week' },
      { title: 'Hack The Box – CTF Practice', type: 'Practice', tag: 'Security', url: 'https://www.hackthebox.com', why: 'Real-world pentest scenarios asked in security interviews', impact: 'High', effort: '4 hrs/week' },
    ],
    dsa: [
      { title: 'Python for Security Scripting', type: 'Course', tag: 'Security', url: 'https://www.codecademy.com/learn/learn-python-3', why: 'Automation scripting is tested more than pure algorithms in security roles', impact: 'Medium', effort: '30 min/day' },
    ],
  },
  'AI / ML': {
    projects: [
      { title: 'Papers With Code – SOTA Models', type: 'Reference', tag: 'ML', url: 'https://paperswithcode.com', why: 'Stay current on architectures discussed in ML interviews', impact: 'High', effort: '1 hr/week' },
      { title: 'Hugging Face Course', type: 'Course', tag: 'ML', url: 'https://huggingface.co/learn', why: 'Build NLP/CV projects with industry-standard tooling', impact: 'High', effort: '4 hrs/week' },
    ],
    dsa: [
      { title: 'NeetCode 150 – Core Patterns', type: 'Course', tag: 'DSA', url: 'https://neetcode.io', why: 'ML engineer roles still test medium DSA at top companies', impact: 'Medium', effort: '45 min/day' },
    ],
    aptitude: [
      { title: '3Blue1Brown – Linear Algebra', type: 'Course', tag: 'ML', url: 'https://www.3blue1brown.com/topics/linear-algebra', why: 'Math fundamentals tested in ML aptitude and technical rounds', impact: 'High', effort: '30 min/day' },
    ],
  },
  'Cloud & DevOps': {
    projects: [
      { title: 'AWS Skill Builder – Free Labs', type: 'Course', tag: 'Cloud', url: 'https://skillbuilder.aws', why: 'Certification-ready projects for cloud/DevOps portfolios', impact: 'High', effort: '3 hrs/week' },
      { title: 'KodeKloud – DevOps Labs', type: 'Practice', tag: 'DevOps', url: 'https://kodekloud.com', why: 'Docker, K8s, CI/CD hands-on labs recruiters value', impact: 'High', effort: '3 hrs/week' },
    ],
    dsa: [
      { title: 'LeetCode Easy/Medium (Ops roles)', type: 'Practice', tag: 'DSA', url: 'https://leetcode.com', why: 'Light DSA coverage — focus on arrays, strings, and scripting logic', impact: 'Medium', effort: '20 min/day' },
    ],
  },
  'Software Engineering': {},
  'Other': {},
}

// ── Consistency & health engine ───────────────────────────────────────────────
export interface ConsistencyMetrics {
  streak: number
  completionRate: number
  activeDays: number
  consistencyScore: number
}

export function computeConsistency(log: ActivityLog[]): ConsistencyMetrics {
  const m = computeConsistencyMetrics(log)
  return {
    streak: m.streak,
    completionRate: m.completionRate,
    activeDays: m.activeDays,
    consistencyScore: m.consistencyScore,
  }
}

export { computeConsistencyMetrics } from './activityEngine'

export type MomentumTrend = 'rising' | 'declining' | 'stable'

export function computeMomentumTrend(log: ActivityLog[]): MomentumTrend {
  return computeActivityMomentumTrend(log)
}

export interface HealthFactors {
  consistency: number
  interview: number
  application: number
  preparation: number
  overall: number
}

export function computeHealthFactors(
  log: ActivityLog[], apps: Application[], assessment: Assessment | null
): HealthFactors {
  const { consistencyScore } = computeConsistency(log)

  const attended = apps.filter(a =>
    ['Technical Interview', 'HR Interview', 'Online Assessment', 'Selected', 'Rejected'].includes(a.status)
  ).length
  const offers = apps.filter(a => a.status === 'Selected').length
  const interviewScore = Math.min(attended > 0 ? Math.round((offers / attended) * 100) : 0, 100) // Score based on success rate

  // The user's requested weights include 'Interview' (10%), not 'Applications'.
  // So, 'application' here refers to the score for active applications, which contributes to overall health but not directly to the readiness score.

  const activeApplications = apps.filter(a => !['Rejected', 'Selected'].includes(a.status)).length
  const applicationScore = Math.min(Math.round(activeApplications * 10), 100)

  const preparation = assessment
    ? Math.round(assessment.dsa * 0.4 + assessment.projects * 0.3 + assessment.resume * 0.3)
    : 50

  const overall = Math.round(
    consistencyScore * 0.3 + interviewScore * 0.2 + applicationScore * 0.2 + preparation * 0.3
  ) // This overall health score is different from the readiness score.

  return { consistency: consistencyScore, interview: interviewScore, application: applicationScore, preparation, overall }
}

export function buildWeeklySnapshots(
  log: ActivityLog[], assessment: Assessment | null
): { week: string; readiness: number; hours: number; activeDays: number }[] {
  const today = new Date()
  const base = assessment ? computeOverall(assessment) : 0
  const result: { week: string; readiness: number; hours: number; activeDays: number }[] = []

  for (let w = 4; w >= 0; w--) {
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() - w * 7)
    const weekDays = Array.from({ length: 7 }, (_, d) => {
      const date = new Date(weekEnd)
      date.setDate(date.getDate() - (6 - d))
      return localDateKey(date)
    })
    const weekEntries = weekDays.map(d => getDayEntry(log, d)).filter(Boolean) as ActivityLog[]
    const hours = parseFloat(weekEntries.reduce((a, l) => a + l.hoursSpent, 0).toFixed(1))
    const activeDays = weekEntries.filter(isExecutionDay).length
    const executions = weekEntries.reduce((a, l) => a + (l.executions ?? 0), 0)

    const activityFactor = activeDays > 0
      ? Math.min(1, (activeDays / 5) * 0.5 + (executions / 10) * 0.3 + (hours / 10) * 0.2)
      : 0
    const readiness = activeDays > 0 && assessment
      ? Math.round(base * (0.85 + activityFactor * 0.15))
      : 0

    const label = new Date(weekDays[0]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    result.push({ week: label, readiness, hours, activeDays })
  }
  return result
}

// ── Evidence-based scoring from real platform data ─────────────────────────
import type { PlatformData } from '../types'

export function computeFromEvidence(
  platform: PlatformData,
  resume: ResumeEvidence | null,
  comm: CommEvidence | null,
  aptitude: AptitudeEvidence | null,
  domain = 'Software Engineering',
): Assessment {
  const sections: AssessmentSections = {
    leetcode: !!platform.leetcode,
    github: !!platform.github,
    resume: !!resume,
    aptitude: !!aptitude,
    communication: !!comm && comm.method !== 'skipped',
  }

  // DSA from LeetCode — only if connected
  let dsa = 0
  const lc = platform.leetcode
  if (lc) {
    const total = lc.totalSolved
    if (total >= 300)      dsa = 90
    else if (total >= 200) dsa = 78
    else if (total >= 100) dsa = 62
    else if (total >= 50)  dsa = 46
    else if (total >= 20)  dsa = 30
    else if (total > 0)    dsa = 15
    if (lc.hardSolved >= 20)     dsa = Math.min(dsa + 10, 100)
    else if (lc.hardSolved >= 5) dsa = Math.min(dsa + 5,  100)
    const medRatio = total > 0 ? lc.mediumSolved / total : 0
    if (medRatio > 0.4) dsa = Math.min(dsa + 5, 100)
  }

  // Projects from GitHub — only if connected
  let projects = 0
  const gh = platform.github
  if (gh) {
    const repos = gh.publicRepos
    if (repos >= 15)      projects = 85
    else if (repos >= 8)  projects = 70
    else if (repos >= 4)  projects = 55
    else if (repos >= 2)  projects = 38
    else if (repos > 0)   projects = 20
    if (gh.recentCommitDays >= 15)     projects = Math.min(projects + 10, 100)
    else if (gh.recentCommitDays >= 7) projects = Math.min(projects + 5,  100)
    if (gh.topLanguages.length >= 3)   projects = Math.min(projects + 5,  100)
  }

  const resumeScore = resume ? resume.rawScore : 0
  const communicationScore = comm && comm.method !== 'skipped' ? comm.score : 0
  const aptitudeScore = aptitude ? aptitude.score : 0

  const mandatory = getRoleMandatorySections(domain)
  const completed = meetsMandatorySections(mandatory, sections, resume, comm, aptitude)

  return {
    dsa,
    resume: resumeScore,
    projects,
    communication: communicationScore,
    aptitude: aptitudeScore,
    interview: 0,
    completed,
    sections,
    assessedAt: new Date().toISOString(),
    resumeEvidence: resume ?? undefined,
    commEvidence: comm ?? undefined,
    aptitudeEvidence: aptitude ?? undefined,
  }
}

// ── Placement probability engine ─────────────────────────────────────────────
export function computePlacementProbability(a: Assessment, apps: Application[]): {
  probability: number
  topBooster: string
  topBlocker: string
} {
  const overall = computeOverall(a)
  const attended = apps.filter(ap =>
    ['Technical Interview', 'HR Interview', 'Online Assessment', 'Selected', 'Rejected'].includes(ap.status)
  ).length
  const offers = apps.filter(ap => ap.status === 'Selected').length
  const successRate = attended > 0 ? (offers / attended) * 100 : 0
  const appBonus = Math.min(apps.length * 2, 10)

  const probability = overall > 0
    ? Math.min(Math.round(overall * 0.75 + successRate * 0.15 + appBonus), 99)
    : 0

  const scores: Record<string, number> = {
    DSA: a.dsa, Resume: a.resume, Projects: a.projects,
    Communication: a.communication, Aptitude: a.aptitude,
  }
  const sorted = Object.entries(scores).sort((x, y) => y[1] - x[1])
  const weakest = sorted[sorted.length - 1]
  const topBooster = `Improve ${weakest[0]} — currently ${weakest[1]}% (+${Math.round((100 - weakest[1]) * 0.3)} pts)`
  const topBlocker = weakest[0]

  return { probability, topBooster, topBlocker }
}

// ── Failure pattern analysis ──────────────────────────────────────────────────
export interface FailurePattern {
  topTag: string; topTagCount: number; totalFails: number
  dsaFailPct: number; hrFailPct: number; oaFailPct: number
  insight: string; recovery: string
  recoveryResources: ResourceItem[]
}

const REASON_SKILL_MAP: Record<string, string[]> = {
  'Ran out of time': ['DSA', 'Time Management'],
  'Did not know the concept': ['DSA', 'Technical'],
  'Nervous / anxious': ['Communication', 'HR'],
  'Poor communication': ['Communication', 'HR'],
  'Could not optimise solution': ['DSA', 'Technical'],
  'Other': [],
}

const SKILL_TO_RESOURCE_KEY: Record<string, string> = {
  DSA: 'dsa', Technical: 'dsa', Communication: 'communication', HR: 'communication',
  'Time Management': 'dsa', Aptitude: 'aptitude', Resume: 'resume', Projects: 'projects',
}

function inferFailureSkills(f: FailureEntry): string[] {
  const skills = new Set<string>(f.tags)
  for (const s of REASON_SKILL_MAP[f.reason] ?? []) skills.add(s)
  const round = f.round.toLowerCase()
  if (round.includes('hr') || round.includes('behavioral')) skills.add('Communication')
  if (round.includes('technical') || round.includes('coding') || round.includes('dsa')) skills.add('DSA')
  if (round.includes('assessment') || round.includes('oa') || round.includes('aptitude')) skills.add('Aptitude')
  return [...skills]
}

export function inferTagsFromFailure(entry: Omit<FailureEntry, 'id'>): string[] {
  const tags = new Set(entry.tags)
  for (const s of REASON_SKILL_MAP[entry.reason] ?? []) tags.add(s)
  const round = entry.round.toLowerCase()
  if (round.includes('hr')) tags.add('HR')
  if (round.includes('technical') || round.includes('coding')) tags.add('Technical')
  if (round.includes('assessment')) tags.add('Online Assessment')
  return [...tags]
}

export function analyzeFailures(failures: FailureEntry[]): FailurePattern | null {
  if (!failures.length) return null

  const skillFreq: Record<string, number> = {}
  failures.forEach(f => inferFailureSkills(f).forEach(s => { skillFreq[s] = (skillFreq[s] || 0) + 1 }))

  const sorted = Object.entries(skillFreq).sort((a, b) => b[1] - a[1])
  const topTag = sorted[0]?.[0] ?? 'General preparation'
  const topTagCount = sorted[0]?.[1] ?? 0
  const total = failures.length

  const dsaFails = failures.filter(f => inferFailureSkills(f).some(s => ['DSA', 'Technical'].includes(s))).length
  const hrFails  = failures.filter(f => f.round.toLowerCase().includes('hr') || inferFailureSkills(f).includes('HR')).length
  const oaFails  = failures.filter(f => f.round.toLowerCase().includes('assessment') || inferFailureSkills(f).includes('Online Assessment')).length

  const topCat   = dsaFails >= hrFails && dsaFails >= oaFails ? 'Technical rounds'
    : hrFails >= oaFails ? 'HR rounds' : 'Online Assessments'
  const topCatPct = Math.round((Math.max(dsaFails, hrFails, oaFails) / total) * 100)

  const insight = topTagCount > 0
    ? `${topCatPct}% of rejections cluster in ${topCat}. Most repeated weakness: "${topTag}" (${topTagCount}×).`
    : `${topCatPct}% of rejections cluster in ${topCat}. Add skill tags or root causes for sharper recommendations.`

  const resourceKey = SKILL_TO_RESOURCE_KEY[topTag] ?? 'dsa'
  const recoveryResources = (RESOURCE_DB[resourceKey] ?? RESOURCE_DB.dsa).slice(0, 3)
  const recovery = topTagCount > 0
    ? `Priority fix: ${topTag}. Start with "${recoveryResources[0]?.title ?? 'targeted practice'}" — ${recoveryResources[0]?.why ?? 'build consistency in your weakest area'}.`
    : `Log root causes when adding rejections — PrepUp maps them to DSA, Communication, or Aptitude resources automatically.`

  return {
    topTag, topTagCount, totalFails: total,
    dsaFailPct: Math.round((dsaFails / total) * 100),
    hrFailPct: Math.round((hrFails / total) * 100),
    oaFailPct: Math.round((oaFails / total) * 100),
    insight, recovery, recoveryResources,
  }
}
