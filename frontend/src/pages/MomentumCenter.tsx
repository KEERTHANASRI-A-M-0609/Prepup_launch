import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Flame, TrendingUp, TrendingDown, Minus, Activity, Clock, Target, AlertTriangle, Briefcase } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useApp } from '../store/AppContext'
import {
  computeConsistencyMetrics,
  buildActivityHeatmap,
  buildMonthlyMomentum,
  computeMomentumTrend,
  computeDaysInactive,
  buildWeeklyExecutionSeries,
  buildDailyExecutionSeries,
  hasLoggedActivity,
  isExecutionDay,
} from '../engine/activityEngine'
import { InsightBanner } from '../components/UI'

export default function MomentumCenter() {
  const { activityLog, applications, recovery, user } = useApp()
  const navigate = useNavigate()

  const metrics = computeConsistencyMetrics(activityLog)
  const trend = computeMomentumTrend(activityLog)
  const daysInactive = computeDaysInactive(activityLog)
  const heatmap = buildActivityHeatmap(activityLog, 84)
  const monthly = buildMonthlyMomentum(activityLog)
  const weeklyChart = buildWeeklyExecutionSeries(activityLog, 8)
  const dailyChart = buildDailyExecutionSeries(activityLog, 7)
  const hasActivity = hasLoggedActivity(activityLog)

  const lastActiveDate = useMemo(() => {
    const active = activityLog.filter(isExecutionDay)
    if (active.length === 0) return null
    return active.reduce((max, e) => (e.date > max ? e.date : max), active[0].date)
  }, [activityLog])

  const appsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000
    return applications.filter(a => {
      const ts = Number(a.id)
      return !Number.isNaN(ts) && ts >= weekAgo
    }).length
  }, [applications])

  const TrendIcon = trend === 'rising' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus
  const trendColor = trend === 'rising' ? 'var(--success)' : trend === 'declining' ? 'var(--danger)' : 'var(--text-3)'

  const riskLabel = !hasActivity
    ? 'No activity logged yet'
    : metrics.dropOffRisk === 'high'
      ? 'High drop-off risk'
      : metrics.dropOffRisk === 'medium'
        ? 'Moderate engagement risk'
        : 'Engagement healthy'

  const levelColor = (l: number) => {
    if (l === 0) return 'var(--bg-muted)'
    if (l === 1) return 'color-mix(in srgb, var(--accent) 25%, var(--bg-muted))'
    if (l === 2) return 'color-mix(in srgb, var(--accent) 45%, var(--bg-muted))'
    if (l === 3) return 'color-mix(in srgb, var(--accent) 70%, var(--bg-muted))'
    return 'var(--accent)'
  }

  const weeklyHasData = weeklyChart.some(w => w.hours > 0 || w.tasks > 0 || w.executions > 0)
  const dailyHasData = dailyChart.some(d => d.hours > 0 || d.tasks > 0)

  return (
    <div className="page-container py-6 sm:py-10 space-y-8 max-w-[1200px]">
      <header className="space-y-2">
        <p className="text-label">Momentum Center</p>
        <h1 className="text-display font-display">Execution intelligence</h1>
        <p className="text-base max-w-xl" style={{ color: 'var(--text-2)' }}>
          Streaks, consistency, and engagement derived from your real activity — planner tasks, assessments, applications, and modules.
        </p>
        {lastActiveDate && (
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Last activity: {new Date(lastActiveDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Flame} label="Execution streak" value={`${metrics.streak}d`} sub="consecutive active days" />
        <StatCard icon={Activity} label="Momentum score" value={`${metrics.consistencyScore}%`} sub="consistency index" />
        <StatCard icon={Clock} label="Hours this week" value={`${metrics.hoursThisWeek}h`} sub={`${metrics.verifiedTasksThisWeek} verified tasks`} />
        <StatCard icon={Target} label="Longest streak" value={`${metrics.longestStreak}d`} sub={`${metrics.activeDays}/14 active days`} />
        <StatCard icon={Briefcase} label="Applications (7d)" value={String(appsThisWeek)} sub={`${applications.length} total tracked`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Weekly execution hours</p>
            <span className="flex items-center gap-1 text-xs font-semibold capitalize" style={{ color: trendColor }}>
              <TrendIcon size={14} /> {trend}
            </span>
          </div>
          {weeklyHasData ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                  formatter={(value, name) => {
                    const n = typeof value === 'number' ? value : Number(value ?? 0)
                    if (name === 'hours') return [`${n}h`, 'Hours']
                    return [n, String(name)]
                  }}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { activeDays?: number; tasks?: number; executions?: number } | undefined
                    if (!row) return ''
                    return `${row.activeDays ?? 0} active days · ${row.tasks ?? 0} tasks · ${row.executions ?? 0} actions`
                  }}
                />
                <Bar dataKey="hours" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Complete planner tasks or assessment modules to see your weekly execution chart." />
          )}
        </div>

        <div className="card p-6">
          <p className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Last 7 days</p>
          {dailyHasData ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="hours" fill="color-mix(in srgb, var(--accent) 70%, var(--bg-muted))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No execution logged in the last 7 days." compact />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <p className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>12-week execution heatmap</p>
          {hasActivity ? (
            <div className="grid gap-[3px] max-w-2xl" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
              {Array.from({ length: 12 }, (_, week) => (
                <div key={week} className="flex flex-col gap-[3px]">
                  {heatmap.slice(week * 7, week * 7 + 7).map(cell => (
                    <div
                      key={cell.date}
                      className="aspect-square w-full rounded-sm"
                      style={{ background: levelColor(cell.level), minHeight: 10 }}
                      title={`${cell.date}: intensity ${cell.level}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart message="Your heatmap fills in as you log daily execution." compact />
          )}
        </div>

        <div className="card p-6">
          <p className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Engagement risk</p>
          <div className="space-y-3">
            <div className="p-4 rounded-xl" style={{
              background: !hasActivity
                ? 'var(--bg-muted)'
                : metrics.dropOffRisk === 'high'
                  ? 'var(--danger-soft)'
                  : metrics.dropOffRisk === 'medium'
                    ? 'var(--warning-soft)'
                    : 'var(--success-soft)',
            }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{riskLabel}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
                {!hasActivity
                  ? 'Verify planner tasks or complete modules to start tracking.'
                  : daysInactive === 0
                    ? 'You executed today or are on track.'
                    : `${daysInactive} day${daysInactive === 1 ? '' : 's'} since last execution.`}
              </p>
            </div>
            {recovery.inactive && (
              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'var(--warning-soft)' }}>
                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>{recovery.reason}</p>
              </div>
            )}
            <button type="button" onClick={() => navigate('/planner')} className="btn-accent w-full text-sm">
              Open Daily Execution Center
            </button>
          </div>
        </div>
      </div>

      {monthly.length > 0 && (
        <div className="card p-6">
          <p className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Monthly momentum</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthly.map(m => (
              <div key={m.month} className="p-4 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                  {new Date(`${m.month}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </p>
                <p className="text-lg font-bold mt-1" style={{ color: 'var(--text)' }}>{m.activeDays} active days</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>{m.hours}h · {m.executions} actions</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <InsightBanner
        label="How streaks are calculated"
        message={`Each day counts when you complete planner tasks, assessment modules, add applications, log failures, or finish interviews. ${user?.name?.split(' ')[0] ?? 'Your'} streak is ${metrics.streak} days — longest ever ${metrics.longestStreak} days.`}
        type="info"
      />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: typeof Flame; label: string; value: string; sub: string
}) {
  return (
    <motion.div className="card p-5" whileHover={{ y: -2 }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} style={{ color: 'var(--accent)' }} />
        <p className="text-label">{label}</p>
      </div>
      <p className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{sub}</p>
    </motion.div>
  )
}

function EmptyChart({ message, compact }: { message: string; compact?: boolean }) {
  return (
    <p className={`text-sm text-center ${compact ? 'py-8' : 'py-12'}`} style={{ color: 'var(--text-2)' }}>
      {message}
    </p>
  )
}
