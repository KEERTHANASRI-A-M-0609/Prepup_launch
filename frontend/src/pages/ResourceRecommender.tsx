import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Clock, Target, TrendingUp, ExternalLink, ArrowRight,
  Layers, Calendar, Building2, ChevronRight, LayoutList,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Badge, InsightBanner, ProgressBar } from '../components/UI'
import {
  recommendResourcePlan, LEVEL_LABELS, type PrepLevel,
} from '../engine/intelligence'
import { computeReadinessConfidence } from '../engine/assessmentEngine'
import { providerLabel, matchCompanyProfile } from '../engine/companyResourceEngine'
import AnimatedNumber from '../components/motion/AnimatedNumber'

const BURDEN_COLORS: Record<string, string> = {
  Light: '#0F766E',
  Moderate: '#475569',
  Heavy: '#1E3A5F',
  Intensive: '#0F172A',
}

const PROVIDER_COLORS: Record<string, string> = {
  GeeksforGeeks: '#2F8D46',
  Udemy: '#A435F0',
  Coursera: '#0056D2',
  YouTube: '#CC0000',
  LeetCode: '#FFA116',
  InterviewBit: '#1E3A5F',
  IndiaBix: '#334155',
  Official: '#1E3A5F',
  NeetCode: '#1E3A5F',
}

export default function ResourceRecommender() {
  const { user, assessment, platformData } = useApp()
  const navigate = useNavigate()
  const [activeCompany, setActiveCompany] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const domain = user?.domain ?? 'Software Engineering'
  const level = (user?.level ?? 'intermediate') as PrepLevel
  const weeklyHours = user?.weeklyHours ?? '10 – 20 hrs'
  const targetCompanies = user?.targetCompanies ?? []

  const confidence = computeReadinessConfidence(assessment, platformData ?? null)
  const hasEvidence = confidence.measuredSections > 0

  const plan = recommendResourcePlan({
    assessment: hasEvidence ? assessment : null,
    domain,
    level,
    weeklyHours,
    targetCompanies,
  })

  const { summary, gaps, categories, topPicks, companySections, matchedCompanies, unmatchedCompanies } = plan
  const selectedSection = activeCompany
    ? companySections.find(s => s.company === activeCompany)
    : companySections[0]
  const visibleCategories = activeCategory
    ? categories.filter(c => c.key === activeCategory)
    : categories
  const visibleTopPicks = activeCategory
    ? categories.find(c => c.key === activeCategory)?.items ?? []
    : topPicks

  if (!hasEvidence) {
    return (
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-16 text-center space-y-6">
        <BookOpen size={48} className="mx-auto opacity-30" />
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Resources unlock after assessment</h1>
        <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-2)' }}>
          Complete at least one Career Health module (start with Resume) so we can analyze your gaps and rank resources for {domain}.
        </p>
        <button type="button" onClick={() => navigate('/health?module=resume')} className="btn-primary mx-auto">
          Start Resume Assessment <ArrowRight size={14} className="inline ml-1" />
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <section className="resource-hero">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-100 mb-1">Learning Intelligence</p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Resource Workspace</h1>
          <p className="text-sm text-white/85 max-w-2xl">
            Curated from GeeksforGeeks, Coursera, Udemy, LeetCode, InterviewBit, and YouTube —
            ranked for <strong>{summary.domain}</strong> ({LEVEL_LABELS[level]}) and your target companies.
          </p>
          {targetCompanies.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4">
              {targetCompanies.map(c => (
                <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 border border-white/25 text-white">
                  <Building2 size={11} />
                  {c}
                  {unmatchedCompanies.includes(c) && <span className="text-white/60">(general)</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: 'Prep completed', value: summary.prepCompletedPct, suffix: '%', sub: summary.readinessStage, icon: TrendingUp, color: '#059669', bg: '#D1FAE5' },
          { title: 'Gap remaining', value: summary.totalGapPoints, suffix: ' pts', sub: `${summary.skillsWithGaps} skills`, icon: Target, color: '#7C3AED', bg: '#EDE9FE' },
          { title: 'Est. timeline', value: summary.estimatedWeeks, suffix: ' wks', sub: `~${summary.weeklyHoursMid} hrs/wk`, icon: Calendar, color: '#1E56C0', bg: '#DBEAFE' },
          { title: 'Load', value: null as number | null, text: summary.burden, sub: LEVEL_LABELS[level], icon: Layers, color: '#D97706', bg: '#FEF3C7' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.title} className="dash-metric">
              <div className="dash-metric-icon" style={{ background: s.bg }}>
                <Icon size={20} style={{ color: s.color }} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{s.title}</p>
              <p className="text-2xl font-bold text-slate-900">
                {s.value !== null ? <AnimatedNumber value={s.value} suffix={s.suffix} /> : s.text}
              </p>
              <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
            </div>
          )
        })}
      </div>

      <InsightBanner
        label={`${LEVEL_LABELS[level]} · ${summary.domain}`}
        message={
          hasEvidence
            ? companySections.length > 0
              ? `Resources prioritized for ${matchedCompanies.join(', ')} based on your gaps (${gapKeysLabel(gaps)}) and each company's interview focus.`
              : `Add target companies in onboarding to unlock company-specific prep tracks. Showing role-based resources from verified platforms.`
            : `Complete Career Health assessments to unlock gap-weighted picks. Starter resources shown for ${summary.domain}.`
        }
        type="info"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[480px]">
        <aside className="lg:col-span-3 dash-section space-y-1 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider px-2 py-2" style={{ color: 'var(--text-3)' }}>
            Workspace
          </p>
          <NavItem icon={LayoutList} label="Top picks" active={!activeCompany && !activeCategory} onClick={() => { setActiveCompany(null); setActiveCategory(null) }} />
          {companySections.map(section => (
            <NavItem
              key={section.company}
              icon={Building2}
              label={section.company}
              active={activeCompany === section.company}
              onClick={() => { setActiveCompany(section.company); setActiveCategory(null) }}
              meta={`${section.resources.length}`}
            />
          ))}
          {categories.map(cat => (
            <NavItem
              key={cat.key}
              icon={BookOpen}
              label={cat.label}
              active={activeCategory === cat.key}
              onClick={() => { setActiveCompany(null); setActiveCategory(cat.key) }}
              meta={cat.gap > 0 ? `−${cat.gap}` : undefined}
            />
          ))}
        </aside>

        <main className="lg:col-span-9 dash-section">
          {activeCompany && selectedSection ? (
            <CompanyPanel section={selectedSection} />
          ) : (
            <>
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Priority picks</h2>
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>Gap + company ranked</span>
                </div>
                <div className="space-y-2">
                  {visibleTopPicks.length > 0 ? visibleTopPicks.map((r, i) => (
                    <ResourceRow key={`${r.url}-${i}`} resource={r} index={i} />
                  )) : (
                    <EmptyState onAssess={() => navigate('/health')} />
                  )}
                </div>
              </section>

              {companySections.length > 0 && (
                <section className="space-y-3">
                  <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Company prep tracks</h2>
                  {companySections.map(section => (
                    <button
                      key={section.company}
                      type="button"
                      onClick={() => setActiveCompany(section.company)}
                      className="w-full text-left p-4 rounded-lg flex items-center gap-4 transition-colors hover:bg-[var(--bg-muted)]"
                      style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'var(--accent-soft)' }}>
                        <Building2 size={18} style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{section.company}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>
                          {section.focusAreas.join(' · ')}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                          Rounds: {section.rounds.join(' → ')}
                        </p>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--text-3)' }} />
                    </button>
                  ))}
                </section>
              )}
            </>
          )}

          {!activeCompany && visibleCategories.length > 0 && (
            <section className="space-y-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>
                {activeCategory ? visibleCategories[0]?.label : 'By skill area'}
              </h2>
              {visibleCategories.map(cat => (
                <div key={cat.key} className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{cat.label}</p>
                    {cat.gap > 0 && <Badge label={`Gap ${cat.gap} pts`} variant="warn" />}
                  </div>
                  {cat.gap > 0 && (
                    <ProgressBar label="" value={100 - cat.gap} max={100} color="var(--accent)" />
                  )}
                  <div className="space-y-2">
                    {cat.items.map((r, i) => (
                      <ResourceRow key={`${cat.key}-${i}`} resource={r} index={i} compact />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>
      </div>

      <div className="flex flex-wrap gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button type="button" onClick={() => navigate('/planner')} className="btn-secondary text-sm">
          Add to daily plan
        </button>
        <button type="button" onClick={() => navigate('/readiness')} className="btn-ghost text-sm">
          View readiness gaps <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

function gapKeysLabel(gaps: { label: string; gap: number }[]) {
  const top = gaps.filter(g => g.gap > 0).slice(0, 3).map(g => g.label)
  return top.length ? top.join(', ') : 'full coverage'
}

function NavItem({ icon: Icon, label, active, onClick, meta }: {
  icon: typeof BookOpen; label: string; active: boolean; onClick: () => void; meta?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left transition-colors"
      style={{
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-2)',
        fontWeight: active ? 600 : 400,
      }}
    >
      <Icon size={14} className="shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {meta && <span className="text-xs" style={{ color: 'var(--text-3)' }}>{meta}</span>}
    </button>
  )
}

function ResourceRow({ resource: r, index, compact }: {
  resource: import('../types').ResourceItem
  index: number
  compact?: boolean
}) {
  const provider = providerLabel(r.provider)
  const providerColor = PROVIDER_COLORS[provider] ?? 'var(--accent)'

  return (
    <motion.a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-start gap-3 p-3 sm:p-4 rounded-lg group transition-colors hover:bg-[var(--bg-muted)]"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)', textDecoration: 'none' }}
    >
      <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold uppercase"
        style={{ background: 'var(--bg-muted)', color: providerColor, border: '1px solid var(--border)' }}>
        {provider.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-snug group-hover:underline" style={{ color: 'var(--text)' }}>
            {r.title}
          </p>
          <ExternalLink size={13} className="shrink-0 opacity-0 group-hover:opacity-100 mt-0.5" style={{ color: 'var(--text-3)' }} />
        </div>
        {!compact && r.why && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-2)' }}>{r.why}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-muted)', color: providerColor }}>
            {provider}
          </span>
          {r.company && <Badge label={r.company} variant="navy" />}
          <Badge label={r.type} variant="default" />
          {r.impact && <span className="text-[10px] font-medium" style={{ color: 'var(--text-3)' }}>{r.impact} impact</span>}
          {r.effort && (
            <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--text-3)' }}>
              <Clock size={9} /> {r.effort}
            </span>
          )}
        </div>
      </div>
    </motion.a>
  )
}

function CompanyPanel({ section }: { section: import('../engine/companyResourceEngine').CompanyPrepSection }) {
  return (
    <div className="space-y-5">
      <div className="p-5 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <p className="text-label mb-1">Company prep track</p>
        <h2 className="text-xl font-semibold font-display" style={{ color: 'var(--text)' }}>{section.company}</h2>
        <p className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>
          Focus: {section.focusAreas.join(', ')}
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
          Typical rounds: {section.rounds.join(' → ')}
        </p>
        <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>
          Priority skills for this company: {section.prioritySkills.join(', ')}
        </p>
      </div>
      <div className="space-y-2">
        {section.resources.map((r, i) => (
          <ResourceRow key={`${r.url}-${i}`} resource={r} index={i} />
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onAssess }: { onAssess: () => void }) {
  return (
    <div className="p-10 text-center rounded-lg" style={{ border: '1px dashed var(--border)' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>No personalized resources yet</p>
      <p className="text-xs mt-2 mb-4" style={{ color: 'var(--text-2)' }}>
        Complete Career Health modules and set target companies to unlock company-specific prep.
      </p>
      <button type="button" onClick={onAssess} className="btn-accent text-sm">Open Assessment Center</button>
    </div>
  )
}
