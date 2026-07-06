import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts'
import { useApp } from '../store/AppContext'
import { CheckCircle2, Clock, TrendingUp, Target, AlertCircle, Download } from 'lucide-react'
import ActionCategoryIcon from '../components/icons/ActionCategoryIcon'
import { InsightBanner } from '../components/UI'
import { computeOverall, buildWeeklySnapshots, computeConsistency, generateNextActions, computeGaps } from '../engine/intelligence'

export default function WeeklyReports() {
  const { activityLog, applications, assessment, user, failures } = useApp()

  const domain = user?.domain ?? 'Software Engineering'
  const gaps   = assessment ? computeGaps(assessment, domain) : []
  const actions = generateNextActions(gaps)
  const weekly  = buildWeeklySnapshots(activityLog, assessment)
  const { streak, completionRate } = computeConsistency(activityLog)

  // This week = last 7 days of activity
  const today = new Date()
  const last7 = activityLog.filter(l => {
    const diff = (today.getTime() - new Date(l.date).getTime()) / 86400000
    return diff <= 7
  })

  const hoursThisWeek = parseFloat(last7.reduce((a, l) => a + l.hoursSpent, 0).toFixed(1))
  const tasksThisWeek = last7.reduce((a, l) => a + l.tasksCompleted, 0)
  const appsThisWeek  = applications.filter(a => {
    if (!a.deadline) return false
    const diff = (today.getTime() - new Date(a.deadline).getTime()) / 86400000
    return Math.abs(diff) <= 7
  }).length

  const readinessGrowth = weekly.length >= 2
    ? weekly[weekly.length - 1].readiness - weekly[weekly.length - 2].readiness
    : 0

  // Daily breakdown for bar chart — last 7 days
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    const entry = activityLog.find(l => l.date === key)
    return { day: DAYS[d.getDay()], hours: entry?.hoursSpent ?? 0 }
  })

  // Missed goals = actions that haven't been logged yet
  const missedGoals = gaps.slice(0, 3).map(g =>
    `Work on ${g.label} (${g.gap} pts below ${domain} benchmark)`
  )

  const score = assessment ? computeOverall(assessment) : null

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <p className="text-label">Interactive Report</p>
          <h1 className="text-display font-display">Weekly Report</h1>
          <p className="text-base" style={{ color: 'var(--text-2)' }}>
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Auto-generated from your activity
          </p>
        </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border hover:bg-[var(--bg-muted)] transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            <Download size={14} /> Export
          </button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Hours Invested', value: hoursThisWeek > 0 ? `${hoursThisWeek}h` : '—', icon: Clock },
          { label: 'Tasks Completed', value: tasksThisWeek > 0 ? tasksThisWeek : '—', icon: CheckCircle2 },
          { label: 'Readiness Growth', value: readinessGrowth !== 0 ? `${readinessGrowth > 0 ? '+' : ''}${readinessGrowth}%` : '—', icon: TrendingUp },
          { label: 'Applications', value: appsThisWeek > 0 ? appsThisWeek : applications.length, icon: Target },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }} className="card p-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-muted)' }}>
              <s.icon size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--text-3)' }}>Daily Study Hours (This Week)</p>
          {dailyBreakdown.some(d => d.hours > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyBreakdown} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 12 }}
                  formatter={(v: unknown) => [`${v}h`, 'Hours']} />
                <Bar dataKey="hours" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-12" style={{ color: 'var(--text-2)' }}>
              No activity logged this week yet.
            </p>
          )}
        </div>

        <div className="card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--text-3)' }}>5-Week Readiness Growth</p>
          {weekly.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weekly}>
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: 'var(--text-3)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 12 }}
                  formatter={(v: unknown) => [`${v}%`, 'Readiness']} />
                <Area type="monotone" dataKey="readiness" stroke="var(--accent)" strokeWidth={2} fill="url(#wg)"
                  dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-12" style={{ color: 'var(--text-2)' }}>
              Complete assessment and log activity to see your trend.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={15} className="text-amber-500" />
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Open Gaps This Week</p>
          </div>
          {missedGoals.length > 0 ? (
            <div className="space-y-2">
              {missedGoals.map((g, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-700">
                  <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">{g}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>No gaps detected — complete assessment to analyse.</p>
          )}
        </div>

        <div className="card p-6">
          <p className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Next Week Focus</p>
          {actions.length > 0 ? (
            <div className="space-y-3">
              {actions.slice(0, 3).map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                  <ActionCategoryIcon category={r.category} size={18} />
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{r.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Complete assessment to get next week's focus plan.</p>
          )}
        </div>
      </div>

      <InsightBanner
        label="Monthly Intelligence"
        message={[
          score ? `Current readiness: ${score}%` : null,
          streak > 0 ? `${streak}-day active streak` : null,
          completionRate > 0 ? `${completionRate}% task completion rate` : null,
          failures.length > 0 ? `${failures.length} rejection(s) logged and analysed` : null,
          `${applications.filter(a => a.status === 'Selected').length} offer(s) · ${applications.filter(a => !['Rejected','Selected'].includes(a.status)).length} active pipeline`,
        ].filter(Boolean).join(' · ') || 'Log activity, complete assessment, and track applications to unlock monthly insights.'}
        type="success"
      />
    </div>
  )
}
