import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, Brain, ChevronRight, Target, TrendingUp, Zap,
  ArrowRight, FileText, Code2, FolderGit2, CheckCircle2, Circle, Lock,
  Briefcase, Calendar, Flame, BookOpen,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  computeOverall, readinessLabel, computeGaps,
  computePlacementProbability, recommendResourcePlan,
  computeConsistency, computeMomentumTrend,
} from '../engine/intelligence'
import {
  computeReadinessConfidence,
  getTopPriority,
  getAssessmentModuleCards,
  type AssessmentModuleId,
} from '../engine/assessmentEngine'
import { buildGuidedFlow } from '../engine/guidedFlowEngine'
import { backendAPI } from '../services/api'
import ReadinessRadar from '../components/design/ReadinessRadar'
import MomentumPanel from '../components/design/MomentumPanel'
import AnimatedNumber from '../components/motion/AnimatedNumber'
import LiveSyncStrip from '../components/LiveSyncStrip'
import DashboardCoach from '../components/dashboard/DashboardCoach'
import DailyReminderStrip from '../components/reminders/DailyReminderStrip'
import AIEngineStrip from '../components/dashboard/AIEngineStrip'
import { SKIPPED_MODULES_KEY } from '../services/storageKeys'

type BackendData = {
  risk_level: string
  final_probability: number
  trend: string
  ml_placement_pct?: number
  ml_top_feature?: string
}

const MODULE_ICON: Record<AssessmentModuleId, typeof Mic> = {
  resume: FileText,
  github: FolderGit2,
  coding: Code2,
  communication: Mic,
  aptitude: Brain,
  interview: Target,
}

function loadSkipped(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SKIPPED_MODULES_KEY) || '{}') } catch { return {} }
}

export default function Dashboard() {
  const {
    user, assessment, recovery, applications, activityLog,
    backendOnline, platformData, mongoOnline, apiOnline,
    intelligenceEvents, lastSyncedAt, isSyncing, pullLiveSession,
    refreshBackendHealth, setView,
  } = useApp()
  const navigate = useNavigate()
  const [backendData, setBackendData] = useState<BackendData | null>(null)

  useEffect(() => { refreshBackendHealth() }, [refreshBackendHealth])
  useEffect(() => {
    if (user && !user.domain?.trim()) setView('onboarding')
  }, [user, setView])

  const skippedModules = useMemo(() => loadSkipped(), [assessment])
  const flow = useMemo(
    () => buildGuidedFlow(user, assessment, applications, activityLog, platformData, skippedModules),
    [user, assessment, applications, activityLog, platformData, skippedModules],
  )

  const confidence = computeReadinessConfidence(assessment, platformData ?? null)
  const hasEvidence = flow.hasAssessmentEvidence
  const score = assessment && hasEvidence ? computeOverall(assessment) : null
  const label = score !== null && score > 0 ? readinessLabel(score) : null
  const gaps = assessment && hasEvidence ? computeGaps(assessment, flow.preferences.domain || 'Software Engineering') : []
  const placementProb = (assessment && hasEvidence && score !== null)
    ? computePlacementProbability(assessment, applications) : null
  const resourcePlan = recommendResourcePlan({
    assessment: hasEvidence ? assessment : null,
    domain: flow.preferences.domain || 'Software Engineering',
    level: user?.level ?? 'intermediate',
    weeklyHours: user?.weeklyHours,
    targetCompanies: flow.preferences.targetCompanies,
  })
  const topPriority = getTopPriority(user, assessment, platformData, skippedModules)
  const moduleCards = getAssessmentModuleCards(assessment, platformData, skippedModules)
  const completedModules = moduleCards.filter(c => ['completed', 'connected'].includes(c.status)).length
  const { consistencyScore, streak } = computeConsistency(activityLog)
  const activityTrend = computeMomentumTrend(activityLog)

  useEffect(() => {
    if (!hasEvidence || !assessment || !backendOnline) return
    const momentum = Math.min(consistencyScore, 100)
    backendAPI.fullAnalysis({
      dsa: assessment.dsa, aptitude: assessment.aptitude,
      communication: assessment.communication, resume: assessment.resume, momentum,
    }).then(analysis => {
      setBackendData({
        risk_level: analysis.diagnosis.risk_level,
        final_probability: analysis.probability.final_probability,
        trend: analysis.momentum.trend,
        ml_placement_pct: analysis.ml_placement?.placement_probability_pct,
        ml_top_feature: analysis.ml_placement?.top_feature,
      })
    }).catch(() => {})
  }, [assessment, backendOnline, hasEvidence, consistencyScore])

  const prob = backendData?.final_probability ?? placementProb?.probability ?? null
  const trend = backendOnline && backendData
    ? (backendData.trend as 'rising' | 'declining' | 'stable') : activityTrend
  const radarScores = assessment ? {
    dsa: assessment.dsa, resume: assessment.resume, projects: assessment.projects,
    communication: assessment.communication, aptitude: assessment.aptitude, interview: assessment.interview ?? 0,
  } : { dsa: 0, resume: 0, projects: 0, communication: 0, aptitude: 0, interview: 0 }

  const openModule = (id: AssessmentModuleId) => navigate(`/health?module=${id}`)
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const handleNavigate = (path: string) => {
    if (path === '/onboarding') { setView('onboarding'); return }
    navigate(path)
  }

  const pipelineTotal = applications.length
  const optionalModules = flow.exploreSteps.filter(s => !s.done).slice(0, 5)

  return (
    <div className="dash-layout">
      <DashboardCoach
        firstName={firstName}
        flow={flow}
        hasEvidence={hasEvidence}
        onNavigate={handleNavigate}
        onOpenModule={openModule}
      />

      <LiveSyncStrip
        mongoOnline={mongoOnline}
        apiOnline={apiOnline}
        lastSyncedAt={lastSyncedAt}
        isSyncing={isSyncing}
        onRefresh={pullLiveSession}
      />
      <AIEngineStrip />

      {user && (
        <DailyReminderStrip
          userKey={user.email ?? user.phone ?? 'user'}
          activityLog={activityLog}
        />
      )}

      <header className="dash-topbar">
        <div>
          <p className="dash-topbar-kicker">Command center</p>
          <h1 className="dash-topbar-title">Good {getGreeting()}, {firstName}</h1>
          <p className="dash-topbar-sub">
            {!flow.preferences.isComplete
              ? 'Complete identity setup to personalize'
              : !hasEvidence
                ? `${flow.preferences.domain} · Start with one assessment below`
                : `${flow.preferences.domain} · ${score}% ready · ${label}`}
          </p>
        </div>
        {flow.nextRequired ? (
          <button type="button" onClick={() => handleNavigate(flow.nextRequired!.path)} className="dash-cta-primary">
            {flow.nextRequired.title} <ArrowRight size={16} />
          </button>
        ) : flow.setupComplete ? (
          <button type="button" onClick={() => navigate('/planner')} className="dash-cta-primary">
            Daily plan <ArrowRight size={16} />
          </button>
        ) : null}
      </header>

      <div className="dash-grid">
        <main className="dash-main space-y-5">
          {flow.nextRequired && (
            <section className="dash-panel dash-panel-accent">
              <p className="dash-panel-label">Required now</p>
              <h2 className="dash-panel-title">{flow.nextRequired.title}</h2>
              <p className="dash-panel-desc">{flow.nextRequired.reason}</p>
              <button type="button" onClick={() => handleNavigate(flow.nextRequired!.path)} className="dash-cta-primary mt-3">
                Start <ArrowRight size={14} />
              </button>
            </section>
          )}

          <section className="dash-panel">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="dash-panel-label">Assessment hub</p>
                <h2 className="dash-panel-title">Evidence tests</h2>
              </div>
              <span className="dash-pill">{completedModules}/{moduleCards.length} done</span>
            </div>
            <div className="dash-test-grid">
              {moduleCards.map(({ module, status, statusLabel, score: modScore }) => {
                const Icon = MODULE_ICON[module.id]
                const done = ['completed', 'connected'].includes(status)
                const optional = module.optional || status === 'optional'
                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => openModule(module.id)}
                    className={`dash-test-card ${done ? 'is-done' : ''} ${optional ? 'is-optional' : ''}`}
                  >
                    <div className="dash-test-card-top">
                      <Icon size={18} />
                      {done ? <CheckCircle2 size={14} className="text-emerald-500" /> : optional ? <Circle size={14} /> : <Zap size={14} style={{ color: 'var(--accent)' }} />}
                    </div>
                    <p className="dash-test-name">{module.title.replace(' Intelligence', '')}</p>
                    <p className="dash-test-meta">{statusLabel}{modScore != null ? ` · ${modScore}%` : ''} · {module.estimatedMinutes}m</p>
                  </button>
                )
              })}
            </div>
          </section>

          {hasEvidence && (
            <>
              <section className="dash-panel">
                <p className="dash-panel-label mb-3">Placement intelligence</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard icon={Target} label="Readiness" value={score} suffix="%" sub={label ?? '—'} />
                  <MetricCard icon={TrendingUp} label="Odds" value={prob} suffix="%" sub={placementProb?.topBlocker ? `Fix ${placementProb.topBlocker}` : 'Estimate'} />
                  <MetricCard icon={Zap} label="Streak" value={streak} suffix="d" sub={`Momentum ${consistencyScore}%`} />
                  <MetricCard icon={Target} label="Gaps" value={gaps.length} suffix="" sub={`~${resourcePlan.summary.estimatedWeeks} wks`} />
                </div>
              </section>

              {topPriority && flow.setupComplete && (
                <section className="dash-panel">
                  <p className="dash-panel-label flex items-center gap-1"><Zap size={12} /> Priority action</p>
                  <h2 className="dash-panel-title">{topPriority.title}</h2>
                  <p className="dash-panel-desc">{topPriority.reason}</p>
                  <button type="button" onClick={() => openModule(topPriority.moduleId)} className="dash-link-btn mt-2">
                    Execute <ArrowRight size={14} />
                  </button>
                </section>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="dash-panel p-0 overflow-hidden">
                  <ReadinessRadar scores={radarScores} onSkillClick={() => navigate('/readiness')} />
                </section>
                <section className="dash-panel">
                  <MomentumPanel activityLog={activityLog} trend={trend} recoveryActive={recovery.inactive} />
                  <button type="button" onClick={() => navigate('/momentum')} className="dash-link-btn mt-3">Momentum center →</button>
                </section>
              </div>
            </>
          )}
        </main>

        <aside className="dash-aside space-y-4">
          {flow.preferences.isComplete && (
            <section className="dash-panel dash-panel-compact">
              <p className="dash-panel-label">Identity</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[flow.preferences.domain, flow.preferences.targetRole, flow.preferences.level].filter(Boolean).map(chip => (
                  <span key={chip} className="dash-chip">{chip}</span>
                ))}
              </div>
              <button type="button" onClick={() => setView('onboarding')} className="dash-link-btn mt-3 text-xs">Edit →</button>
            </section>
          )}

          <section className="dash-panel dash-panel-compact">
            <p className="dash-panel-label">Additional</p>
            <ul className="dash-aside-links">
              {[
                { icon: Briefcase, label: 'Applications', path: '/applications', badge: pipelineTotal || undefined },
                { icon: Calendar, label: 'Daily planner', path: '/planner' },
                { icon: BookOpen, label: 'Resources', path: '/resources' },
                { icon: Flame, label: 'Momentum', path: '/momentum' },
              ].map(item => (
                <li key={item.path}>
                  <button type="button" onClick={() => navigate(item.path)} className="dash-aside-link">
                    <item.icon size={15} />
                    <span>{item.label}</span>
                    {item.badge != null && item.badge > 0 && <span className="dash-aside-badge">{item.badge}</span>}
                    <ChevronRight size={14} className="ml-auto opacity-40" />
                  </button>
                </li>
              ))}
            </ul>
            {optionalModules.length > 0 && (
              <>
                <p className="dash-panel-label mt-4 mb-2">Optional modules</p>
                <ul className="space-y-1">
                  {optionalModules.map(step => (
                    <li key={step.id}>
                      <button
                        type="button"
                        disabled={step.locked}
                        onClick={() => handleNavigate(step.path)}
                        className="dash-aside-link text-xs disabled:opacity-50"
                      >
                        {step.locked ? <Lock size={13} /> : <Circle size={13} />}
                        <span className="truncate">{step.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {intelligenceEvents.length > 0 && (
            <section className="dash-panel dash-panel-compact">
              <p className="dash-panel-label">Activity log</p>
              <ul className="dash-activity-list">
                {intelligenceEvents.slice(0, 5).map((e, i) => (
                  <li key={`${e.at}-${i}`}>
                    <p className="dash-activity-title">{e.title}</p>
                    <p className="dash-activity-time">
                      {new Date(e.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function MetricCard({ icon: Icon, label, value, suffix, sub }: {
  icon: typeof Target
  label: string
  value?: number | null
  suffix?: string
  sub?: ReactNode
}) {
  return (
    <div className="dash-metric-v2">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color: 'var(--accent)' }} />
        <p className="dash-panel-label !mb-0">{label}</p>
      </div>
      <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>
        {value != null ? <AnimatedNumber value={value} suffix={suffix} /> : '—'}
      </p>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{sub}</div>
    </div>
  )
}
