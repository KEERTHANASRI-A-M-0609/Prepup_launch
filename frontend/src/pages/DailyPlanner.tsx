import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { isAssessmentComplete, getRecommendedAddons } from '../engine/intelligence'
import { getAssessmentBlockers } from '../engine/assessmentEngine'
import { groupTasksByTier, resolveTaskTier, type PlannerTaskTier } from '../engine/plannerTaskTiers'
import { generatePersonalizedPlan, generateWeeklyPlan, analyzeWeekPlan, getDayTheme, type PlannerTaskItem } from '../engine/plannerEngine'
import { enrichPlannerTask } from '../engine/plannerTaskGuidelines'
import { localDateKey } from '../engine/activityEngine'
import TaskVerificationModal, { type TaskVerifyPayload } from '../components/planner/TaskVerificationModal'
import DailyReminderStrip from '../components/reminders/DailyReminderStrip'
import { CheckCircle2, Circle, Plus, X, Calendar, Zap, Clock, ExternalLink, ShieldCheck, ShieldAlert, BookOpen, ChevronDown, ChevronUp, Target, Sparkles, ArrowRight } from 'lucide-react'

interface Task {
  id: string
  text: string
  category: string
  priority: 'high' | 'medium' | 'low'
  estimatedMins: number
  done: boolean
  verified?: boolean
  proofUrl?: string
  proofNote?: string
  verifiedAt?: string
  date: string
  source: 'ai' | 'manual'
  resourceUrl?: string
  why?: string
  guidelines?: string
  tier?: PlannerTaskTier
}

import { PLANNER_KEY, PLAN_GENERATED_KEY } from '../services/storageKeys'
function loadTasks(): Task[] {
  try { return JSON.parse(localStorage.getItem(PLANNER_KEY) || '[]') } catch { return [] }
}
function saveTasks(tasks: Task[]) {
  localStorage.setItem(PLANNER_KEY, JSON.stringify(tasks))
}

const today = () => localDateKey()
const dayLabel = (d: string) => {
  const diff = Math.round((new Date(d).getTime() - new Date(today()).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  if (diff === 1) return 'Tomorrow'
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
}

const PRIORITY_COLOR: Record<string, string> = {
  high: '#DC2626', medium: '#D97706', low: '#059669'
}

export default function DailyPlanner() {
  const navigate = useNavigate()
  const { user, assessment, applications, activityLog, recordVerifiedPlannerTask, studentId, backendOnline, mongoOnline } = useApp()
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [plannerMode, setPlannerMode] = useState<'daily' | 'weekly'>('daily')
  const [newTask, setNewTask] = useState('')
  const [newCat, setNewCat] = useState('DSA')
  const [newMins, setNewMins] = useState(30)
  const [showForm, setShowForm] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [weekAnalysis, setWeekAnalysis] = useState<ReturnType<typeof analyzeWeekPlan> | null>(null)
  const [verifyTask, setVerifyTask] = useState<Task | null>(null)
  const autoGenRef = useRef(false)
  const weekGenRef = useRef(false)

  const assessed = isAssessmentComplete(assessment, user?.domain)
  const domain = user?.domain || 'Software Engineering'
  const blockers = getAssessmentBlockers(domain, assessment, null)
  const recommendedAddons = getRecommendedAddons(domain, assessment)
  const mandatoryAddons = recommendedAddons.filter(a => a.mandatory)
  const pendingAddons = recommendedAddons.filter(a => !a.mandatory)

  const getWeek = () => {
    const d = new Date()
    const day = d.getDay()
    const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7))
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(mon); x.setDate(mon.getDate() + i)
      return localDateKey(x)
    })
  }
  const weekDates = getWeek()
  const todayTasks = tasks.filter(t => t.date === today())
  const verifiedTodayCount = todayTasks.filter(t => t.verified).length
  const checkedTodayCount = todayTasks.filter(t => t.done).length

  useEffect(() => { saveTasks(tasks) }, [tasks])

  const openVerifyModal = (task: Task) => {
    const enriched = enrichPlannerTask({
      text: task.text,
      category: task.category,
      priority: task.priority,
      estimatedMins: task.estimatedMins,
      resourceUrl: task.resourceUrl,
      guidelines: task.guidelines,
      why: task.why,
    })
    setVerifyTask({
      id: task.id,
      text: enriched.text,
      category: enriched.category,
      priority: enriched.priority,
      estimatedMins: enriched.estimatedMins,
      done: task.done,
      verified: task.verified,
      date: task.date,
      source: task.source,
      resourceUrl: enriched.resourceUrl,
      why: enriched.why,
      guidelines: enriched.guidelines,
      tier: task.tier ?? enriched.tier,
    })
  }

  const requestComplete = (task: Task) => {
    if (task.verified) {
      setTasks(prev => prev.map(t => t.id === task.id
        ? { ...t, done: false, verified: false, proofUrl: undefined, proofNote: undefined, verifiedAt: undefined }
        : t))
      return
    }
    openVerifyModal(task)
  }

  const handleVerify = (taskId: string, payload: TaskVerifyPayload) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    setTasks(prev => prev.map(t => t.id === taskId
      ? {
          ...t,
          done: true,
          verified: true,
          proofUrl: payload.proofUrl || undefined,
          proofNote: payload.reflection,
          verifiedAt: new Date().toISOString(),
        }
      : t))
    recordVerifiedPlannerTask(task.estimatedMins)
    setVerifyTask(null)
  }

  const remove = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const addManual = () => {
    if (!newTask.trim()) return
    const task: Task = {
      id: Date.now().toString(),
      text: newTask.trim(),
      category: newCat,
      priority: 'medium',
      estimatedMins: newMins,
      done: false,
      verified: false,
      date: today(),
      source: 'manual',
    }
    setTasks(prev => [task, ...prev])
    setNewTask(''); setShowForm(false)
  }

  const getYesterdayCompleted = useCallback(() => {
    const y = new Date()
    y.setDate(y.getDate() - 1)
    const key = localDateKey(y)
    return tasks.filter(t => t.date === key && t.verified).map(t => t.text)
  }, [tasks])

  const buildPlannerPayload = useCallback((date: string, mode: 'daily' | 'weekly') => ({
    date,
    mode,
    completedYesterday: getYesterdayCompleted(),
    applications: applications.map(a => ({
      company: a.company,
      role: a.role,
      status: a.status,
      deadline: a.deadline,
    })),
    activityLog: activityLog.map(l => ({
      date: l.date,
      tasksCompleted: l.tasksCompleted,
      hoursSpent: l.hoursSpent,
      executions: l.executions,
    })),
  }), [applications, activityLog, getYesterdayCompleted])

  const fetchPlanFromBackend = useCallback(async (mode: 'daily' | 'weekly'): Promise<Record<string, PlannerTaskItem[]>> => {
    const dateKey = today()
    const body = buildPlannerPayload(dateKey, mode)
    const input = {
      userId: user?.email,
      email: user?.email,
      domain,
      level: user?.level,
      weeklyHours: user?.weeklyHours,
      targetCompanies: user?.targetCompanies ?? [],
      assessment,
      applications,
      activityLog,
      completedYesterday: body.completedYesterday,
      date: dateKey,
      mode,
    }

    if (mode === 'weekly') {
      return generateWeeklyPlan(input)
    }
    return { [dateKey]: generatePersonalizedPlan({ ...input, date: dateKey }) }
  }, [assessment, applications, activityLog, buildPlannerPayload, domain, user])

  const applyPlan = useCallback((planByDate: Record<string, PlannerTaskItem[]>) => {
    const newTasks: Task[] = []
    const dates = Object.keys(planByDate)

    dates.forEach(date => {
      planByDate[date].forEach((item, i) => {
        newTasks.push({
          id: `ai_${date}_${i}_${Date.now()}`,
          text: item.text,
          category: item.category,
          priority: item.priority,
          estimatedMins: item.estimatedMins,
          done: false,
          verified: false,
          date,
          source: 'ai',
          resourceUrl: item.resourceUrl,
          why: item.why,
          guidelines: item.guidelines,
          tier: item.tier,
        })
      })
    })

    setTasks(prev => [
      ...newTasks,
      ...prev.filter(t => !(dates.includes(t.date) && t.source === 'ai')),
    ])
    localStorage.setItem(PLAN_GENERATED_KEY, today())
  }, [])

  const generateAIPlan = async (silent = false, mode: 'daily' | 'weekly' = plannerMode) => {
    if (!assessed || !assessment) {
      if (!silent) setAiError('Complete your assessment first to unlock personalized daily tasks.')
      return
    }

    setAiLoading(true)
    if (!silent) setAiError('')

    try {
      const planByDate = await fetchPlanFromBackend(mode)
      const total = Object.values(planByDate).reduce((n, arr) => n + arr.length, 0)
      if (total === 0) {
        if (!silent) setAiError('Could not generate tasks. Complete Career Health modules first.')
        return
      }
      applyPlan(planByDate)
      if (mode === 'weekly') {
        setWeekAnalysis(analyzeWeekPlan({
          userId: user?.email,
          email: user?.email,
          domain,
          level: user?.level,
          weeklyHours: user?.weeklyHours,
          targetCompanies: user?.targetCompanies ?? [],
          assessment,
          applications,
          activityLog,
        }))
      }
    } catch (e) {
      if (!silent) setAiError(e instanceof Error ? e.message : 'Could not generate plan. Try again.')
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (!assessed || !assessment || autoGenRef.current) return
    const hasTodayAi = tasks.some(t => t.date === today() && t.source === 'ai')
    const lastGen = localStorage.getItem(PLAN_GENERATED_KEY)
    if (!hasTodayAi && lastGen !== today()) {
      autoGenRef.current = true
      generateAIPlan(true, 'daily')
    }
  }, [assessed, assessment])

  useEffect(() => {
    if (!assessed || !assessment || plannerMode !== 'weekly' || weekGenRef.current) return
    const hasWeekAi = weekDates.some(d => tasks.some(t => t.date === d && t.source === 'ai'))
    if (!hasWeekAi) {
      weekGenRef.current = true
      generateAIPlan(true, 'weekly')
    }
  }, [plannerMode, assessed, assessment])

  const todayGroups = groupTasksByTier(todayTasks.filter(t => t.source === 'ai'))
  const todayManual = todayTasks.filter(t => t.source === 'manual')
  const coreToday = todayGroups.core
  const coreVerified = coreToday.filter(t => t.verified).length
  const completionPct = coreToday.length > 0
    ? Math.round((coreVerified / coreToday.length) * 100)
    : todayTasks.length > 0
      ? Math.round((verifiedTodayCount / todayTasks.length) * 100)
      : 0

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <section className="planner-hero">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-100 mb-1">Daily Execution</p>
            <h1 className="text-2xl sm:text-3xl font-bold">Daily Planner</h1>
            <p className="text-sm text-white/85 mt-2">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
              {assessed
                ? ` · Personalized for ${domain}${user?.targetCompanies?.length ? ` → ${user.targetCompanies.slice(0, 2).join(', ')}` : ''}`
                : ' · Complete assessment to unlock your plan'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg p-0.5 bg-white/15 border border-white/25">
              {(['daily', 'weekly'] as const).map(v => (
                <button key={v} onClick={() => setPlannerMode(v)}
                  className="px-3 py-1.5 rounded-md text-xs font-bold transition-all capitalize"
                  style={{
                    background: plannerMode === v ? '#fff' : 'transparent',
                    color: plannerMode === v ? '#1E56C0' : '#fff',
                  }}>
                  {v}
                </button>
              ))}
            </div>
            <button onClick={() => generateAIPlan(false)} disabled={aiLoading || !assessed}
              className="btn-commerce text-xs py-2 px-3 flex items-center gap-1.5 disabled:opacity-40 font-bold">
              {aiLoading
                ? <><span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />Analyzing...</>
                : <><Zap size={12} />Regenerate {plannerMode === 'weekly' ? 'week' : 'today'}</>}
            </button>
            <button onClick={() => setShowForm(v => !v)} className="px-3 py-2 rounded-lg text-xs font-bold bg-white/15 border border-white/25 text-white">
              {showForm ? <X size={12} /> : <><Plus size={12} className="inline mr-1" />Add</>}
            </button>
          </div>
        </div>
      </section>

      {user && (
        <DailyReminderStrip
          userKey={user.email ?? user.phone ?? 'user'}
          activityLog={activityLog}
          compact
        />
      )}

      {!assessed && (
        <div className="dash-section border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Target size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">Step 1 — Required</p>
              <h2 className="font-bold text-slate-900 mb-1">Complete assessments to unlock your plan</h2>
              <p className="text-sm text-slate-600 mb-4">
                {blockers.length > 0 ? (
                  <>Still needed for <strong>{domain}</strong>: {blockers.map(b => b.label).join(', ')}.</>
                ) : (
                  <>Finish your profile evidence to generate AI tasks.</>
                )}
              </p>
              <button
                type="button"
                onClick={() => navigate(blockers[0]?.path ?? '/health?module=resume')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700"
              >
                {blockers[0] ? `Start: ${blockers[0].label}` : 'Open Career Health'} <ArrowRight size={14} />
              </button>
            </div>
          </div>
          {mandatoryAddons.length > 0 && (
            <div className="mt-5 pt-4 border-t border-blue-100">
              <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2 flex items-center gap-1">
                <Target size={12} /> Required for your role
              </p>
              <ul className="space-y-2">
                {mandatoryAddons.map(addon => (
                  <li key={addon.key} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span><strong>{addon.label}</strong> — {addon.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pendingAddons.length > 0 && (
            <div className="mt-5 pt-4 border-t border-blue-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                <Sparkles size={12} /> Recommended next (not required yet)
              </p>
              <ul className="space-y-2">
                {pendingAddons.slice(0, 3).map(addon => (
                  <li key={addon.key} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">·</span>
                    <span><strong className="text-slate-800">{addon.label}</strong> — {addon.reason}</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => navigate('/health')}
                className="mt-3 text-xs font-semibold text-blue-600 hover:underline">
                Open Career Health when ready →
              </button>
            </div>
          )}
        </div>
      )}

      {assessed && pendingAddons.length > 0 && (
        <div className="dash-section flex items-start gap-3 text-sm bg-slate-50">
          <Sparkles size={16} className="text-teal-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-800">Sharpen your plan</p>
            <p className="text-slate-600 mt-0.5">
              Connect {pendingAddons.slice(0, 2).map(a => a.label).join(' or ')} in Career Health for more accurate daily tasks.
            </p>
            <button type="button" onClick={() => navigate('/health')}
              className="mt-2 text-xs font-semibold text-blue-600 hover:underline">
              Go to Career Health →
            </button>
          </div>
        </div>
      )}

      {plannerMode === 'weekly' && weekAnalysis && (
        <div className="dash-section">
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-1">Week analysis</p>
          <p className="text-sm font-semibold text-slate-800 mb-2">{weekAnalysis.weeklyTheme}</p>
          <div className="flex flex-wrap gap-2">
            {weekAnalysis.focusAreas.map((theme, i) => (
              <span key={theme} className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: i === ((new Date().getDay() + 6) % 7) ? '#DBEAFE' : '#F1F5F9', color: '#334155' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}: {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {aiError && (
        <div className="p-3 rounded-lg text-sm alert-warning">{aiError}</div>
      )}

      {plannerMode === 'daily' && todayTasks.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {coreToday.length > 0 ? 'Core focus verified' : 'Verified today'} — {coreToday.length > 0 ? coreVerified : verifiedTodayCount}/{coreToday.length > 0 ? coreToday.length : todayTasks.length}
              {checkedTodayCount > verifiedTodayCount && (
                <span className="text-xs font-normal text-amber-600 ml-2">
                  ({checkedTodayCount - verifiedTodayCount} unverified)
                </span>
              )}
            </span>
            <span className="text-sm font-bold" style={{ color: completionPct === 100 ? '#059669' : 'var(--primary)' }}>
              {completionPct}%
            </span>
          </div>
          <div className="progress-track">
            <motion.div className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 0.6 }}
              style={{ background: completionPct === 100 ? '#059669' : 'var(--primary)' }} />
          </div>
        </div>
      )}

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Add Manual Task</p>
          <div className="flex gap-2 flex-wrap">
            <input value={newTask} onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addManual()}
              placeholder="e.g. Solve 3 DP problems on LeetCode"
              className="input flex-1 min-w-48" />
            <select value={newCat} onChange={e => setNewCat(e.target.value)}
              className="input w-36"
              style={{ width: 'auto' }}>
              {['DSA', 'Resume', 'Projects', 'Aptitude', 'Applications', 'General'].map(c =>
                <option key={c} value={c}>{c}</option>
              )}
            </select>
            <select value={newMins} onChange={e => setNewMins(Number(e.target.value))}
              className="input w-28"
              style={{ width: 'auto' }}>
              {[15, 30, 45, 60, 90, 120].map(m =>
                <option key={m} value={m}>{m} min</option>
              )}
            </select>
            <button onClick={addManual} className="btn-primary text-sm px-4">Add</button>
          </div>
        </motion.div>
      )}

      {plannerMode === 'daily' && (
        <div className="space-y-3">
          {todayTasks.length === 0 ? (
            <div className="card p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
                style={{ background: 'var(--bg-muted)' }}>
                <Calendar size={22} style={{ color: 'var(--text-3)' }} />
              </div>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>No tasks for today</p>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                {assessed
                  ? 'Generate your AI plan or add tasks manually.'
                  : 'Complete assessment first, then use AI Plan to get personalized daily tasks.'}
              </p>
              {assessed && (
                <button onClick={() => generateAIPlan(false)} disabled={aiLoading} className="btn-primary text-sm py-2 px-5">
                  <Zap size={13} /> Generate today&apos;s plan
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {coreToday.length > 0 && (
                <PlannerTaskSection
                  title="Today's focus"
                  subtitle="Complete these in order — they drive your readiness and streak"
                  tier="core"
                  tasks={coreToday}
                  defaultOpen
                  onComplete={requestComplete}
                  onRemove={remove}
                />
              )}
              {todayGroups.recommended.length > 0 && (
                <PlannerTaskSection
                  title="Recommended when ready"
                  subtitle="Do these after core focus, or when today's plan highlights this area"
                  tier="recommended"
                  tasks={todayGroups.recommended}
                  defaultOpen={coreVerified >= coreToday.length}
                  onComplete={requestComplete}
                  onRemove={remove}
                />
              )}
              {todayGroups.optional.length > 0 && (
                <PlannerTaskSection
                  title="Optional extras"
                  subtitle="Use when you have extra time or the weekly plan suggests simulation practice"
                  tier="optional"
                  tasks={todayGroups.optional}
                  defaultOpen={false}
                  onComplete={requestComplete}
                  onRemove={remove}
                />
              )}
              {todayManual.length > 0 && (
                <PlannerTaskSection
                  title="Your manual tasks"
                  subtitle="Tasks you added yourself"
                  tier="recommended"
                  tasks={todayManual}
                  defaultOpen
                  onComplete={requestComplete}
                  onRemove={remove}
                />
              )}
            </div>
          )}
        </div>
      )}

      {plannerMode === 'weekly' && (
        <div className="space-y-3">
          {weekDates.map((date, dayIdx) => {
            const dayTasks = tasks.filter(t => t.date === date)
            const verified = dayTasks.filter(t => t.verified).length
            const isToday = date === today()
            const theme = getDayTheme(dayIdx)
            return (
              <div key={date} className={`planner-day-card ${isToday ? 'is-today' : ''}`}>
                <div className="planner-day-header">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm" style={{ color: isToday ? '#1E56C0' : '#0F172A' }}>
                      {dayLabel(date)}
                    </p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                      {theme}
                    </span>
                    {isToday && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">Today</span>}
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {verified}/{dayTasks.length} verified
                  </span>
                </div>
                <div className="p-3 sm:p-4">
                  {dayTasks.length > 0 ? (
                    <div className="space-y-3">
                      {(['core', 'recommended', 'optional'] as const).map(tier => {
                        const grouped = groupTasksByTier(dayTasks)
                        const list = grouped[tier]
                        if (!list.length) return null
                        const labels = { core: 'Focus', recommended: 'Also do', optional: 'Optional' }
                        return (
                          <div key={tier}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{labels[tier]}</p>
                            <div className="space-y-2">
                              {list.map(task => (
                                <TaskRow key={task.id} task={task} onComplete={requestComplete} onRemove={remove} compact showTierBadge />
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-2">No tasks — click Regenerate week</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {verifyTask && (
          <TaskVerificationModal
            task={verifyTask}
            onClose={() => setVerifyTask(null)}
            onVerify={handleVerify}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PlannerTaskSection({ title, subtitle, tier, tasks, defaultOpen, onComplete, onRemove }: {
  title: string
  subtitle: string
  tier: PlannerTaskTier
  tasks: Task[]
  defaultOpen?: boolean
  onComplete: (task: Task) => void
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  const tierStyle: Record<PlannerTaskTier, { border: string; badge: string; badgeBg: string }> = {
    core: { border: '#BFDBFE', badge: '#1D4ED8', badgeBg: '#DBEAFE' },
    recommended: { border: '#E2E8F0', badge: '#475569', badgeBg: '#F1F5F9' },
    optional: { border: '#E2E8F0', badge: '#64748B', badgeBg: '#F8FAFC' },
  }
  const style = tierStyle[tier]
  const verified = tasks.filter(t => t.verified).length

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: style.border }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-white hover:bg-slate-50 transition-colors"
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: style.badgeBg, color: style.badge }}>
              {verified}/{tasks.length} verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-2">
              {tasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={onComplete}
                  onRemove={onRemove}
                  orderLabel={tier === 'core' ? String(index + 1) : undefined}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TaskRow({ task, onComplete, onRemove, compact, showTierBadge, orderLabel }: {
  task: Task
  onComplete: (task: Task) => void
  onRemove: (id: string) => void
  compact?: boolean
  showTierBadge?: boolean
  orderLabel?: string
}) {
  const [showGuide, setShowGuide] = useState(false)
  const isVerified = !!task.verified
  const isPending = task.done && !task.verified
  const guidelines = task.guidelines ?? enrichPlannerTask({
    text: task.text,
    category: task.category,
    priority: task.priority,
    estimatedMins: task.estimatedMins,
    resourceUrl: task.resourceUrl,
    why: task.why,
  }).guidelines

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 rounded-lg transition-colors"
      style={{
        background: isVerified ? '#F0FDF4' : isPending ? '#FFFBEB' : 'var(--bg-card)',
        border: `1px solid ${isVerified ? '#86EFAC' : isPending ? '#FCD34D' : PRIORITY_COLOR[task.priority] + '30'}`,
        opacity: isVerified ? 0.95 : 1,
      }}>
      <button type="button" onClick={() => onComplete(task)} className="shrink-0" title={isVerified ? 'Undo verification' : 'Verify completion'}>
        {orderLabel ? (
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: isVerified ? '#D1FAE5' : '#DBEAFE', color: isVerified ? '#059669' : '#1D4ED8' }}>
            {isVerified ? <ShieldCheck size={14} /> : orderLabel}
          </span>
        ) : isVerified
          ? <ShieldCheck size={18} style={{ color: '#059669' }} />
          : isPending
            ? <ShieldAlert size={18} style={{ color: '#D97706' }} />
            : <Circle size={18} style={{ color: 'var(--text-3)' }} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{
          color: isVerified ? 'var(--text-3)' : 'var(--text)',
          textDecoration: isVerified ? 'line-through' : 'none',
        }}>
          {task.text}
        </p>
        {task.why && !isVerified && !compact && (
          <p className="text-xs mt-0.5 text-slate-500">{task.why}</p>
        )}
        {!isVerified && !compact && guidelines && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={() => setShowGuide(v => !v)}
              className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline"
            >
              <BookOpen size={11} />
              {showGuide ? 'Hide steps' : 'How to complete'}
              {showGuide ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {showGuide && (
              <pre className="text-xs mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                {guidelines}
              </pre>
            )}
          </div>
        )}
        {isVerified && task.proofNote && !compact && (
          <p className="text-xs mt-0.5 text-emerald-700">{task.proofNote}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 rounded" style={{
            background: PRIORITY_COLOR[task.priority] + '15',
            color: PRIORITY_COLOR[task.priority],
          }}>
            {task.category}
          </span>
          {showTierBadge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 capitalize">
              {resolveTaskTier(task)}
            </span>
          )}
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
            <Clock size={10} /> {task.estimatedMins}m
          </span>
          {isVerified && (
            <span className="text-xs flex items-center gap-0.5 font-semibold text-emerald-600">
              <ShieldCheck size={9} /> Verified
            </span>
          )}
          {!isVerified && (
            <button type="button" onClick={() => onComplete(task)}
              className="text-xs font-semibold text-blue-600 hover:underline">
              Verify completion
            </button>
          )}
          {task.proofUrl && (
            <a href={task.proofUrl.startsWith('http') ? task.proofUrl : `https://${task.proofUrl}`}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs flex items-center gap-0.5 hover:underline text-emerald-600">
              <ExternalLink size={9} /> Proof
            </a>
          )}
          {task.resourceUrl && !isVerified && (
            <a href={task.resourceUrl} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs flex items-center gap-0.5 hover:underline" style={{ color: 'var(--accent)' }}>
              <ExternalLink size={9} /> Resource
            </a>
          )}
        </div>
      </div>
      <button type="button" onClick={() => onRemove(task.id)} className="shrink-0 hover:opacity-70">
        <X size={14} style={{ color: 'var(--text-3)' }} />
      </button>
    </motion.div>
  )
}
