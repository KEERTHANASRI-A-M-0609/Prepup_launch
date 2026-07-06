import { motion } from 'framer-motion'
import { Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ActivityLog } from '../../types'
import { computeConsistencyMetrics, buildActivityHeatmap } from '../../engine/activityEngine'

interface Props {
  activityLog: ActivityLog[]
  trend?: 'rising' | 'declining' | 'stable'
  recoveryActive?: boolean
}

export default function MomentumPanel({ activityLog, trend = 'stable', recoveryActive }: Props) {
  const { streak, consistencyScore, activeDays, completionRate, executionsThisWeek } =
    computeConsistencyMetrics(activityLog)
  const cells = buildActivityHeatmap(activityLog, 84)

  const levelColor = (l: number) => {
    if (l === 0) return 'var(--bg-muted)'
    if (l === 1) return 'color-mix(in srgb, var(--accent) 25%, var(--bg-muted))'
    if (l === 2) return 'color-mix(in srgb, var(--accent) 45%, var(--bg-muted))'
    if (l === 3) return 'color-mix(in srgb, var(--accent) 70%, var(--bg-muted))'
    return 'var(--accent)'
  }

  const TrendIcon = trend === 'rising' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus
  const trendColor = trend === 'rising' ? 'var(--success)' : trend === 'declining' ? 'var(--danger)' : 'var(--text-3)'

  return (
    <div className="surface-elevated p-6 h-full flex flex-col">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-label">Momentum</p>
          <p className="font-display text-xl font-bold mt-1" style={{ color: 'var(--text)' }}>
            Execution Rhythm
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: trendColor }}>
          <TrendIcon size={16} />
          {trend}
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div
          className="flex-1 p-4 rounded-xl"
          style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame size={16} style={{ color: 'var(--warning)' }} />
            <span className="text-label">Execution streak</span>
          </div>
          <p className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
            {streak}<span className="text-sm font-medium ml-1" style={{ color: 'var(--text-3)' }}>days</span>
          </p>
        </div>
        <div
          className="flex-1 p-4 rounded-xl"
          style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-label mb-1">Consistency</p>
          <p className="text-2xl font-bold font-display" style={{ color: 'var(--accent)' }}>
            {consistencyScore}%
          </p>
        </div>
        <div
          className="flex-1 p-4 rounded-xl hidden sm:block"
          style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-label mb-1">Active (14d)</p>
          <p className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
            {activeDays}<span className="text-sm font-medium ml-1" style={{ color: 'var(--text-3)' }}>/14</span>
          </p>
        </div>
      </div>

      <div className="flex-1">
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-3)' }}>
          Execution activity · last 12 weeks
        </p>
        {streak === 0 && executionsThisWeek === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--text-2)' }}>
            Complete tasks in Daily Planner or assessment modules to start your streak.
          </p>
        ) : (
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
            {Array.from({ length: 12 }, (_, week) => (
              <div key={week} className="flex flex-col gap-[3px]">
                {cells.slice(week * 7, week * 7 + 7).map((cell, di) => (
                  <motion.div
                    key={cell.date}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (week * 7 + di) * 0.003 }}
                    className="heatmap-cell aspect-square w-full"
                    style={{ background: levelColor(cell.level), minHeight: 10 }}
                    title={`${cell.date}: intensity ${cell.level}`}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {recoveryActive && (
        <div className="mt-4 p-3 rounded-xl alert-warning text-xs font-medium">
          Recovery mode active — reduced daily targets until momentum returns.
        </div>
      )}

      <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>Task completion (7d)</span>
        <div className="flex items-center gap-2">
          <div className="w-24 progress-track">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              style={{ background: 'var(--accent)' }}
            />
          </div>
          <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{completionRate}%</span>
        </div>
      </div>
    </div>
  )
}
