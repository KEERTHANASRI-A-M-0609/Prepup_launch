import type { PlannerTaskItem } from './plannerEngine'

export type PlannerTaskTier = 'core' | 'recommended' | 'optional'

const TIER_ORDER: Record<PlannerTaskTier, number> = { core: 0, recommended: 1, optional: 2 }

export function resolveTaskTier(
  task: Pick<PlannerTaskItem, 'tier' | 'category' | 'priority' | 'text'>,
  index = 0,
): PlannerTaskTier {
  if (task.tier) return task.tier
  if (['Momentum', 'Applications', 'General'].includes(task.category)) return 'core'
  if (task.category === 'Interview' || /simulation|when you have extra/i.test(task.text)) return 'optional'
  if (task.priority === 'high' && index < 2) return 'core'
  if (task.priority === 'low') return 'optional'
  if (index === 0) return 'core'
  return 'recommended'
}

export function sortTasksByTier<T extends Pick<PlannerTaskItem, 'tier' | 'category' | 'priority' | 'text'>>(
  tasks: T[],
): T[] {
  return [...tasks]
    .map((task, index) => ({ task, tier: resolveTaskTier(task, index) }))
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier])
    .map(({ task }) => task)
}

export function groupTasksByTier<T extends Pick<PlannerTaskItem, 'tier' | 'category' | 'priority' | 'text'>>(
  tasks: T[],
): Record<PlannerTaskTier, T[]> {
  const groups: Record<PlannerTaskTier, T[]> = { core: [], recommended: [], optional: [] }
  tasks.forEach((task, index) => {
    groups[resolveTaskTier(task, index)].push(task)
  })
  return groups
}

export function applyTierBudget(items: PlannerTaskItem[], dailyBudget: number): PlannerTaskItem[] {
  const core = items.filter(t => t.tier === 'core')
  const recommended = items.filter(t => t.tier === 'recommended')
  const optional = items.filter(t => t.tier === 'optional')

  const picked: PlannerTaskItem[] = []
  let totalMins = 0

  const tryAdd = (list: PlannerTaskItem[], max: number) => {
    for (const item of list) {
      if (picked.length >= 5 || picked.filter(p => resolveTaskTier(p) === resolveTaskTier(item)).length >= max) continue
      if (totalMins + item.estimatedMins > dailyBudget && picked.length >= 1) continue
      picked.push(item)
      totalMins += item.estimatedMins
    }
  }

  tryAdd(core, 3)
  tryAdd(recommended, 2)
  tryAdd(optional, 1)

  return sortTasksByTier(picked)
}
