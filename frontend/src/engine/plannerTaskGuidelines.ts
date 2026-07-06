import type { PlannerTaskItem } from './plannerEngine'

type GuideTemplate = {
  resourceUrl: string
  resourceLabel: string
  guidelines: string
}

const BY_CATEGORY: Record<string, GuideTemplate> = {
  DSA: {
    resourceUrl: 'https://leetcode.com/problemset/',
    resourceLabel: 'LeetCode Problem Set',
    guidelines: [
      '1. Open LeetCode → filter by today\'s topic (Array, Tree, Graph, etc.)',
      '2. Solve the required number of problems without peeking at solutions first',
      '3. For each problem: note approach, time complexity, and one edge case',
      '4. When verifying: paste your LeetCode submission or problem URL(s)',
    ].join('\n'),
  },
  'Cloud & DevOps': {
    resourceUrl: 'https://github.com/',
    resourceLabel: 'GitHub',
    guidelines: [
      '1. Follow the task steps in a real repo (new branch recommended)',
      '2. Document commands and config in README or commit messages',
      '3. Run and test before marking complete',
      '4. When verifying: paste GitHub commit, PR, or pipeline run URL',
    ].join('\n'),
  },
  Aptitude: {
    resourceUrl: 'https://www.indiabix.com/aptitude/questions-and-answers/',
    resourceLabel: 'IndiaBix Aptitude',
    guidelines: [
      '1. Open IndiaBix section mentioned in the task',
      '2. Use a timer — simulate OA conditions (no pauses mid-set)',
      '3. Score yourself and note weak sub-topics',
      '4. When verifying: paste section URL or screenshot link with score',
    ].join('\n'),
  },
  Communication: {
    resourceUrl: '/health?module=communication',
    resourceLabel: 'Career Health → Communication',
    guidelines: [
      '1. Record answers out loud (phone voice memo or Career Health module)',
      '2. Use STAR format for behavioral questions',
      '3. Replay and count filler words (um, like, basically)',
      '4. When verifying: note duration and improvement vs last session',
    ].join('\n'),
  },
  Resume: {
    resourceUrl: 'https://www.jobscan.co/',
    resourceLabel: 'Jobscan ATS Check',
    guidelines: [
      '1. Edit resume in your master DOC/PDF',
      '2. Add quantified metrics (%, users, latency, revenue)',
      '3. Run through Jobscan or similar ATS checker',
      '4. When verifying: paste Jobscan result or drive link to updated resume',
    ].join('\n'),
  },
  Projects: {
    resourceUrl: 'https://github.com/',
    resourceLabel: 'GitHub',
    guidelines: [
      '1. Make meaningful commits (not single-line typo fixes)',
      '2. Update README with setup, demo link, and architecture note',
      '3. Deploy if task requires live URL',
      '4. When verifying: paste repo, PR, or live demo URL',
    ].join('\n'),
  },
  Interview: {
    resourceUrl: '/health?module=interview',
    resourceLabel: 'Mock Interview Module',
    guidelines: [
      '1. Set 90-min timer for OA-style tasks or use Mock Interview module',
      '2. No IDE autocomplete shortcuts you won\'t have in real OA',
      '3. Log mistakes in Failure Intel after session',
      '4. When verifying: paste session notes or mock interview score',
    ].join('\n'),
  },
  Applications: {
    resourceUrl: '/applications',
    resourceLabel: 'Application Pipeline',
    guidelines: [
      '1. Open Application Pipeline in PrepUp',
      '2. Update status, deadline, and next action for the company',
      '3. Tailor resume/cover if applying today',
      '4. When verifying: paste portal confirmation or pipeline screenshot',
    ].join('\n'),
  },
  Momentum: {
    resourceUrl: '/momentum',
    resourceLabel: 'Momentum Center',
    guidelines: [
      '1. Pick one high-impact task from today\'s plan',
      '2. Complete it fully before anything else',
      '3. Verify with proof to restore streak',
    ].join('\n'),
  },
}

const TOPIC_HINTS: Record<string, string> = {
  Arrays: 'Focus: two-pointer, sliding window, prefix sum on LeetCode Medium',
  Trees: 'Focus: BFS/DFS, recursion, level-order traversal',
  DP: 'Focus: 1D/2D tabulation — start with brute force then optimize',
  Graphs: 'Focus: BFS, DFS, union-find, or Dijkstra as appropriate',
  Patterns: 'Use NeetCode 150 or Striver sheet for structured revision',
  AWS: 'AWS Free Tier: EC2/ECS lab — tear down resources after',
  Docker: 'Test with docker compose up and healthcheck endpoint',
  'CI/CD': 'GitHub Actions: lint → test → build on pull_request',
  Linux: 'Practice on WSL or a small VM — document commands used',
  IaC: 'Terraform apply then terraform destroy to avoid charges',
  K8s: 'Use minikube or kind locally — one deployment + service',
  Monitoring: 'Prometheus scrape config + one Grafana panel',
}

export function enrichPlannerTask(task: PlannerTaskItem): PlannerTaskItem {
  const base = BY_CATEGORY[task.category] ?? BY_CATEGORY.DSA
  let guidelines = task.guidelines ?? base.guidelines

  for (const [topic, hint] of Object.entries(TOPIC_HINTS)) {
    if (task.text.includes(topic) || task.why?.includes(topic)) {
      guidelines = `${hint}\n\n${guidelines}`
      break
    }
  }

  if (task.category !== 'Applications' && task.resourceUrl?.startsWith('/')) {
    return {
      ...task,
      guidelines,
      resourceUrl: task.resourceUrl,
    }
  }

  return {
    ...task,
    resourceUrl: task.resourceUrl ?? base.resourceUrl,
    guidelines,
    why: task.why
      ? `${task.why} · Resource: ${base.resourceLabel}`
      : `Resource: ${base.resourceLabel}`,
  }
}

export function enrichPlannerTasks(tasks: PlannerTaskItem[]): PlannerTaskItem[] {
  return tasks.map(enrichPlannerTask)
}

export function getCategoryResourceLabel(category: string): string {
  return BY_CATEGORY[category]?.resourceLabel ?? 'Resource'
}
