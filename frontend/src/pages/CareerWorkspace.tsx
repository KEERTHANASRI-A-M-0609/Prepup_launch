import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarDays, Briefcase, Activity, Flame, BarChart3, BookOpen,
  Brain, Target, ChevronRight, Sparkles, LayoutGrid, Clock, Zap, Library,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  computeGaps, computeOverall, computePlacementProbability, readinessLabel,
  computeConsistency,
} from '../engine/intelligence'
import { computeReadinessConfidence, getTopPriority } from '../engine/assessmentEngine'
import { CAREER_MODULES } from '../data/careerModules'
import { SKIPPED_MODULES_KEY } from '../services/storageKeys'

const TOOL_ICONS: Record<string, typeof CalendarDays> = {
  'command-center': Target,
  'study-planner': CalendarDays,
  'application-kanban': Briefcase,
  'career-health-score': Activity,
  'resource-library': BookOpen,
  'progress-heatmap': Flame,
  'weekly-review': BarChart3,
  'placement-journal': Brain,
}

function loadSkipped() {
  try { return JSON.parse(localStorage.getItem(SKIPPED_MODULES_KEY) || '{}') } catch { return {} }
}

export default function CareerWorkspace() {
  const navigate = useNavigate()
  const { user, assessment, applications, activityLog, platformData } = useApp()
  const [showRoadmap, setShowRoadmap] = useState(false)

  const domain = user?.domain || 'Software Engineering'
  const companies = user?.targetCompanies ?? []
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const skipped = loadSkipped()
  const confidence = computeReadinessConfidence(assessment, platformData ?? null)
  const hasEvidence = confidence.measuredSections > 0
  const score = assessment && hasEvidence ? computeOverall(assessment) : null
  const gaps = assessment && hasEvidence ? computeGaps(assessment, domain) : []
  const topPriority = getTopPriority(user, assessment, platformData, skipped)
  const { streak } = computeConsistency(activityLog)
  const placementProb = assessment && hasEvidence && score != null
    ? computePlacementProbability(assessment, applications)
    : null

  const activeApps = applications.filter(a => !['Rejected', 'Selected'].includes(a.status))
  const soonDeadline = applications.filter(a => {
    if (!a.deadline || ['Rejected', 'Selected'].includes(a.status)) return false
    const days = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 7
  })

  const actionCards = useMemo(() => {
    const cards: { title: string; desc: string; cta: string; path: string; accent: string; badge?: string }[] = []

    cards.push({
      title: "Today's study plan",
      desc: `AI tasks for ${domain}${companies[0] ? ` → ${companies[0]}` : ''}`,
      cta: 'Open planner',
      path: '/planner',
      accent: '#DC2626',
      badge: 'Daily',
    })

    if (topPriority) {
      cards.push({
        title: topPriority.title,
        desc: topPriority.reason,
        cta: 'Start now',
        path: `/health?module=${topPriority.moduleId}`,
        accent: '#1E56C0',
        badge: 'Priority',
      })
    } else if (!hasEvidence) {
      cards.push({
        title: 'Unlock your readiness score',
        desc: 'Complete Resume Intelligence first — takes ~2 minutes.',
        cta: 'Start assessment',
        path: '/health?module=resume',
        accent: '#1E56C0',
        badge: 'Required',
      })
    }

    if (soonDeadline[0]) {
      const a = soonDeadline[0]
      const days = Math.ceil((new Date(a.deadline!).getTime() - Date.now()) / 86400000)
      cards.push({
        title: `${a.company} deadline`,
        desc: `${a.role} — ${days} day${days !== 1 ? 's' : ''} left · ${a.status}`,
        cta: 'Update pipeline',
        path: '/applications',
        accent: '#D97706',
        badge: 'Urgent',
      })
    }

    cards.push({
      title: streak > 0 ? `${streak}-day execution streak` : 'Build your streak',
      desc: streak > 0 ? 'Keep momentum — verify one planner task today.' : 'Complete one verified task in Daily Planner.',
      cta: 'View momentum',
      path: '/momentum',
      accent: '#EA580C',
      badge: 'Streak',
    })

    cards.push({
      title: 'Knowledge Hub',
      desc: 'Notes, wiki, journal, company research, bookmarks',
      cta: 'Open knowledge',
      path: '/knowledge',
      accent: '#7C3AED',
      badge: 'Workspace',
    })

    return cards.slice(0, 5)
  }, [domain, companies, topPriority, hasEvidence, soonDeadline, streak])

  const yourTools = useMemo(() => {
    const ids = [
      'command-center', 'study-planner', 'application-kanban', 'career-health-score',
      'resource-library', 'progress-heatmap', 'weekly-review', 'placement-journal',
      'placement-wiki', 'personal-notes', 'company-research', 'referral-tracker',
    ]
    return CAREER_MODULES.filter(m => ids.includes(m.id) && m.status !== 'planned' && m.route)
  }, [])

  const comingSoon = CAREER_MODULES.filter(m => m.status === 'planned')

  const openRoute = (route: string) => {
    const [path, search] = route.split('?')
    navigate(search ? `${path}?${search}` : path)
  }

  return (
    <div className="page-container py-6 sm:py-8 space-y-6 max-w-[1200px]" style={{ background: 'var(--landing-bg, #F4F7FB)' }}>
      {/* Hero — plain language */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="dash-hero"
      >
        <div className="dash-hero-inner">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid size={16} className="text-emerald-300" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-200">Your placement HQ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Hi {firstName} — everything for your placement in one place</h1>
          <p className="text-white/85 text-sm sm:text-base max-w-2xl leading-relaxed">
            This is <strong>not</strong> a static list. It connects your <strong>{domain}</strong> track
            {companies.length ? <> targeting <strong>{companies.slice(0, 3).join(', ')}</strong></> : null}
            {' '}to daily actions, assessments, and your application pipeline.
          </p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <span className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/25">
              Readiness: <strong>{score != null ? `${score}%` : '—'}</strong>
              {score != null ? ` · ${readinessLabel(score)}` : ''}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/25">
              Placement odds: <strong>{placementProb?.probability ?? '—'}%</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/25">
              Active apps: <strong>{activeApps.length}</strong>
            </span>
            {gaps[0] && (
              <span className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/25">
                Top gap: <strong>{gaps[0].label}</strong> ({gaps[0].gap} pts)
              </span>
            )}
          </div>
        </div>
      </motion.section>

      {/* Do this now */}
      <section className="dash-section">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-amber-500" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Step 1</p>
            <h2 className="text-lg font-bold text-slate-900">Do this now</h2>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-4 max-w-xl">
          Personalized from your profile — not a generic module catalog. Pick one and execute.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {actionCards.map((card, i) => (
            <motion.button
              key={card.title}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(card.path)}
              className="text-left p-4 rounded-xl border-2 border-slate-100 hover:border-blue-300 hover:shadow-lg transition-all bg-white group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="deal-badge text-[9px]" style={{ background: card.accent, color: '#fff' }}>{card.badge}</span>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{card.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
              <span className="inline-block mt-3 text-xs font-bold text-blue-600">{card.cta} →</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Your tools — Flipkart-style category grid */}
      <section className="dash-section">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Step 2</p>
            <h2 className="text-lg font-bold text-slate-900">Your active tools</h2>
            <p className="text-xs text-slate-500 mt-1">Everything here works today — click to open</p>
          </div>
          <button type="button" onClick={() => navigate('/')} className="text-sm font-semibold text-blue-600">
            Command Center →
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {yourTools.map((tool, i) => {
            const Icon = TOOL_ICONS[tool.id] ?? Sparkles
            const colors = ['#1E56C0', '#059669', '#D97706', '#7C3AED', '#0D9488', '#DC2626', '#EA580C', '#0891B2']
            const color = colors[i % colors.length]
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => tool.route && openRoute(tool.route)}
                className="dash-module flex-col items-center text-center py-5 px-3"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2" style={{ background: `${color}18` }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <span className="text-xs font-bold text-slate-800 leading-tight">{tool.title.replace(/ System| Center| Hub/g, '')}</span>
                <span className="text-[10px] text-slate-400 mt-1 line-clamp-2">{tool.description.split('—')[0]}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* How it fits together */}
      <section className="dash-section bg-gradient-to-br from-slate-50 to-blue-50/50">
        <h2 className="text-lg font-bold text-slate-900 mb-3">How your placement OS works</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          {[
            { step: '1', title: 'Assess', desc: 'Career Health measures real skills — resume, coding, aptitude.', path: '/health' },
            { step: '2', title: 'Plan', desc: 'Daily Planner gives role + company-specific tasks every day.', path: '/planner' },
            { step: '3', title: 'Execute', desc: 'Track applications, momentum, and interviews until offer.', path: '/applications' },
          ].map(s => (
            <button
              key={s.step}
              type="button"
              onClick={() => navigate(s.path)}
              className="text-left p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all"
            >
              <span className="inline-flex w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold items-center justify-center mb-2">{s.step}</span>
              <p className="font-bold text-slate-900">{s.title}</p>
              <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Roadmap — collapsed by default */}
      <section className="dash-section">
        <button
          type="button"
          onClick={() => setShowRoadmap(v => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-slate-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Coming later on the roadmap</h2>
              <p className="text-xs text-slate-500">{comingSoon.length} modules planned — mentor workspace, AI chat, calendars, CRM…</p>
            </div>
          </div>
          <ChevronRight size={18} className={`text-slate-400 transition-transform ${showRoadmap ? 'rotate-90' : ''}`} />
        </button>
        {showRoadmap && (
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {comingSoon.slice(0, 12).map(m => (
              <div key={m.id} className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
                {m.title}
              </div>
            ))}
            {comingSoon.length > 12 && (
              <p className="text-xs text-slate-400 col-span-full">+{comingSoon.length - 12} more in development</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
