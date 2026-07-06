import type { GapItem } from './intelligence'
import { getDomainSkillPriority, resolveRoleDomain } from './intelligence'

export type RoleTaskDef = { text: string; mins: number; category: string; topic?: string }

const SWE_DSA: RoleTaskDef[] = [
  { text: 'Solve 2 LeetCode Medium on Arrays — two-pointer patterns', mins: 50, category: 'DSA', topic: 'Arrays' },
  { text: 'Solve 2 LeetCode Medium on Trees — BFS/DFS traversals', mins: 55, category: 'DSA', topic: 'Trees' },
  { text: 'Solve 1 LeetCode Hard on Dynamic Programming', mins: 60, category: 'DSA', topic: 'DP' },
  { text: 'Timed OA mock: 2 problems in 90 minutes', mins: 90, category: 'DSA', topic: 'OA' },
]

const DEVOPS: RoleTaskDef[] = [
  { text: 'Deploy a sample app to AWS EC2/ECS — document the pipeline in README', mins: 60, category: 'Cloud & DevOps', topic: 'AWS' },
  { text: 'Write Dockerfile + docker-compose with health checks for a full-stack app', mins: 45, category: 'Cloud & DevOps', topic: 'Docker' },
  { text: 'Set up GitHub Actions CI/CD: lint, test, build, deploy on push', mins: 50, category: 'Cloud & DevOps', topic: 'CI/CD' },
  { text: 'Kubernetes minikube: deploy app, service, ingress, rolling update', mins: 60, category: 'Cloud & DevOps', topic: 'K8s' },
  { text: 'Terraform lab: provision VPC + EC2 + S3 (destroy after practice)', mins: 55, category: 'Cloud & DevOps', topic: 'IaC' },
]

const PM: RoleTaskDef[] = [
  { text: 'Write a 1-page PRD: problem, users, success metrics, scope, risks', mins: 45, category: 'Product', topic: 'PRD' },
  { text: 'Prioritize 10 feature ideas with RICE scoring — defend top 3', mins: 35, category: 'Product', topic: 'Prioritization' },
  { text: 'Draft user stories + acceptance criteria for one core workflow', mins: 40, category: 'Product', topic: 'Stories' },
  { text: 'Analyze a product teardown (Swiggy/UPI) — metrics, funnel, trade-offs', mins: 40, category: 'Product', topic: 'Teardown' },
]

const DATA_SCIENCE: RoleTaskDef[] = [
  { text: 'Kaggle: complete 1 EDA notebook — clean data, visualize, state 3 insights', mins: 55, category: 'Data Science', topic: 'EDA' },
  { text: 'Train + evaluate a sklearn model — report precision/recall and confusion matrix', mins: 50, category: 'Data Science', topic: 'ML' },
  { text: 'SQL practice: 5 window-function queries on interview-style datasets', mins: 40, category: 'Data Science', topic: 'SQL' },
  { text: 'Explain bias-variance trade-off with a real project example (written)', mins: 25, category: 'Data Science', topic: 'Theory' },
]

const AI_ML: RoleTaskDef[] = [
  { text: 'Fine-tune or prompt-engineer a small LLM task — document eval metrics', mins: 55, category: 'AI / ML', topic: 'LLM' },
  { text: 'Implement training loop for a classifier in PyTorch — log loss curves', mins: 60, category: 'AI / ML', topic: 'Deep Learning' },
  { text: 'Build feature pipeline + cross-validation for tabular ML problem', mins: 50, category: 'AI / ML', topic: 'MLOps' },
  { text: 'Read 1 paper abstract + reproduce a key equation in code comments', mins: 35, category: 'AI / ML', topic: 'Research' },
]

const UX: RoleTaskDef[] = [
  { text: 'Redesign one app screen — wireframe, hierarchy, accessibility notes', mins: 45, category: 'UI / UX', topic: 'Wireframe' },
  { text: 'Conduct 3-user mini usability test — record findings + 2 fixes', mins: 50, category: 'UI / UX', topic: 'Research' },
  { text: 'Build Figma component library for a dashboard (8+ components)', mins: 55, category: 'UI / UX', topic: 'Design System' },
  { text: 'Write case study for portfolio project — problem, process, outcome', mins: 40, category: 'UI / UX', topic: 'Portfolio' },
]

const CYBER: RoleTaskDef[] = [
  { text: 'TryHackMe / PicoCTF: complete 1 beginner room — document findings', mins: 50, category: 'Cybersecurity', topic: 'CTF' },
  { text: 'Set up Wireshark capture — analyze HTTP traffic and list 5 security observations', mins: 40, category: 'Cybersecurity', topic: 'Network' },
  { text: 'OWASP Top 10 review — test one vulnerability on a local DVWA/lab app', mins: 45, category: 'Cybersecurity', topic: 'AppSec' },
  { text: 'Write incident response runbook for phishing scenario (1 page)', mins: 35, category: 'Cybersecurity', topic: 'IR' },
]

const APTITUDE: RoleTaskDef[] = [
  { text: 'IndiaBix — 15 Time & Work + Percentage (timed)', mins: 35, category: 'Aptitude' },
  { text: 'IndiaBix — 10 logical reasoning puzzles under 25 min', mins: 30, category: 'Aptitude' },
  { text: 'Complete 1 full aptitude mock (30 questions, 30 min)', mins: 35, category: 'Aptitude' },
]

const COMM: RoleTaskDef[] = [
  { text: 'Record 3 STAR behavioral answers — count filler words', mins: 30, category: 'Communication' },
  { text: 'Practice 60-second self-introduction on camera', mins: 15, category: 'Communication' },
  { text: 'Mock HR: 5 behavioral questions with timer', mins: 30, category: 'Communication' },
]

const RESUME: RoleTaskDef[] = [
  { text: 'Add 2 quantified bullet points — metrics and impact', mins: 30, category: 'Resume' },
  { text: 'Tailor resume summary for your primary target company and role', mins: 35, category: 'Resume' },
  { text: 'Run resume through Jobscan — fix top ATS flags', mins: 25, category: 'Resume' },
]

const PROJECTS: RoleTaskDef[] = [
  { text: 'Push 3 meaningful commits — README with demo link', mins: 45, category: 'Projects' },
  { text: 'Deploy project live and add URL to resume', mins: 40, category: 'Projects' },
  { text: 'Write system design paragraph for best project (scale, trade-offs)', mins: 35, category: 'Projects' },
]

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

function rolePrimaryPool(resolved: string, gapKey: string): RoleTaskDef[] {
  if (gapKey === 'aptitude') return APTITUDE
  if (gapKey === 'communication') return COMM
  if (gapKey === 'resume') return RESUME
  if (gapKey === 'projects') return PROJECTS
  if (gapKey === 'interview') return COMM

  switch (resolved) {
    case 'Cloud & DevOps':
      return gapKey === 'dsa' ? [...DEVOPS, ...SWE_DSA.slice(0, 2)] : DEVOPS
    case 'Product Management':
      return gapKey === 'dsa' ? PM : PM
    case 'Data Science':
      return gapKey === 'dsa' ? [...DATA_SCIENCE, ...SWE_DSA.slice(0, 1)] : DATA_SCIENCE
    case 'AI / ML':
      return gapKey === 'dsa' ? [...AI_ML, ...SWE_DSA.slice(0, 1)] : AI_ML
    case 'UI / UX Design':
      return gapKey === 'dsa' ? UX : UX
    case 'Cybersecurity':
      return gapKey === 'dsa' ? [...CYBER, ...SWE_DSA.slice(0, 1)] : CYBER
    default:
      return gapKey === 'dsa' ? SWE_DSA : PROJECTS
  }
}

export function rankGapsForRole(gaps: GapItem[], domain: string): GapItem[] {
  const priority = getDomainSkillPriority(domain)
  return [...gaps].sort((a, b) => {
    const ai = priority.indexOf(a.key)
    const bi = priority.indexOf(b.key)
    const ar = ai === -1 ? 99 : ai
    const br = bi === -1 ? 99 : bi
    if (ar !== br) return ar - br
    return b.gap - a.gap
  })
}

export function buildRoleGapTask(
  domain: string,
  gap: GapItem,
  seed: number,
  company?: string,
): RoleTaskDef & { why: string } {
  const resolved = resolveRoleDomain(domain)
  const pool = rolePrimaryPool(resolved, gap.key)
  const task = pick(pool, seed)
  const companyNote = company ? ` for ${company}` : ''
  const roleNote = `${resolved} track`
  return {
    ...task,
    text: company && gap.key === 'dsa' && resolved === 'Software Engineering'
      ? `${task.text} (${company} OA patterns)`
      : `[${roleNote}] ${task.text}${companyNote}`,
    why: `${roleNote} · Close ${gap.label} gap (${gap.gap} pts) · ${task.topic ?? task.category}`,
  }
}

export function primarySkillPoolForDay(domain: string, dayIndex: number): RoleTaskDef[] {
  const resolved = resolveRoleDomain(domain)
  const priority = getDomainSkillPriority(resolved)
  const skill = priority[dayIndex % Math.min(priority.length, 3)] ?? 'projects'
  return rolePrimaryPool(resolved, skill)
}
