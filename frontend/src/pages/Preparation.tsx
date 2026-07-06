import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../store/AppContext'
import type { Project, PlatformData } from '../types'
import { ProgressBar, Badge, InsightBanner } from '../components/UI'
import { GitBranch, ExternalLink, Plus, BookOpen, Code2, X, RefreshCcw, Loader2 } from 'lucide-react'
import { getResourcesByCategory, isAssessmentComplete, getRecommendedAddons, getPreparationTabs, computeGapsForLevel, computeRemainingPrep, LEVEL_LABELS } from '../engine/intelligence'
import { fetchLeetCode, fetchGitHub } from '../services/platformAPI'

const EMPTY_PROJECT: Omit<Project, 'id'> = {
  name: '', description: '', github: '', demo: '',
  status: 'In Progress', tech: [],
}

function scoreProject(p: Project): { score: number; label: string; insights: string[] } {
  let score = 0
  const insights: string[] = []
  if (p.name)        score += 10
  if (p.description) score += 10
  if (p.github)      { score += 25; } else { insights.push('Add a GitHub link to boost credibility') }
  if (p.demo)        { score += 20; } else { insights.push('Deploy the project to show it works') }
  if (p.status === 'Deployed')  score += 20
  else if (p.status === 'Completed') score += 10
  if (p.tech.length >= 2) { score += 15; } else { insights.push('List the tech stack used') }
  if (insights.length === 0) insights.push('Strong project — make sure the README explains it clearly')
  const label = score >= 80 ? 'Strong' : score >= 55 ? 'Good' : score >= 30 ? 'Needs Work' : 'Incomplete'
  return { score: Math.min(score, 100), label, insights }
}

export default function Preparation() {
  const { user, assessment, projects, setProjects, platformData, setPlatformData } = useApp()
  const [tab, setTab] = useState('DSA')

  // Platform refresh state
  const [lcState, setLcState] = useState<'idle'|'loading'|'success'|'error'>(platformData?.leetcode ? 'success' : 'idle')
  const [ghState, setGhState] = useState<'idle'|'loading'|'success'|'error'>(platformData?.github ? 'success' : 'idle')
  const [lcUsername, setLcUsername] = useState(platformData?.leetcode?.username ?? '')
  const [ghUsername, setGhUsername] = useState(platformData?.github?.username ?? '')
  const [lcError, setLcError] = useState('')
  const [ghError, setGhError] = useState('')

  const lc = platformData?.leetcode
  const gh = platformData?.github

  const refreshLC = async () => {
    if (!lcUsername.trim()) return
    setLcState('loading'); setLcError('')
    try {
      const data = await fetchLeetCode(lcUsername.trim())
      const updated: PlatformData = { ...platformData!, leetcode: data, fetchedAt: new Date().toISOString() }
      setPlatformData(updated)
      setLcState('success')
    } catch (e) { setLcError((e as Error).message); setLcState('error') }
  }

  const refreshGH = async () => {
    if (!ghUsername.trim()) return
    setGhState('loading'); setGhError('')
    try {
      const data = await fetchGitHub(ghUsername.trim())
      const updated: PlatformData = { ...platformData!, github: data, fetchedAt: new Date().toISOString() }
      setPlatformData(updated)
      setGhState('success')
    } catch (e) { setGhError((e as Error).message); setGhState('error') }
  }

  // Project add state
  const [showProjForm, setShowProjForm] = useState(false)
  const [projForm, setProjForm] = useState<Omit<Project, 'id'>>(EMPTY_PROJECT)
  const [techInput, setTechInput] = useState('')

  const domain     = user?.domain ?? 'Software Engineering'
  const level      = user?.level ?? 'intermediate'
  const domainTabs = getPreparationTabs(domain)
  const assessed   = isAssessmentComplete(assessment, domain)
  const gaps       = assessment ? computeGapsForLevel(assessment, domain, level) : []
  const prepSummary = computeRemainingPrep(assessment, domain, level, user?.weeklyHours)
  const categories = getResourcesByCategory(gaps, domain, level)
  const addonRecs  = getRecommendedAddons(domain, assessment)

  useEffect(() => {
    if (!domainTabs.includes(tab)) setTab(domainTabs[0])
  }, [domain, domainTabs.join(',')])

  const addProject = () => {
    if (!projForm.name) return
    setProjects([{ ...projForm, id: Date.now().toString() }, ...projects])
    setProjForm(EMPTY_PROJECT); setTechInput(''); setShowProjForm(false)
  }

  const addTech = () => {
    const t = techInput.trim()
    if (t && !projForm.tech.includes(t)) setProjForm(p => ({ ...p, tech: [...p.tech, t] }))
    setTechInput('')
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
      <header className="space-y-2">
        <p className="text-label">Execution</p>
        <h1 className="text-display font-display">Preparation</h1>
        <p className="text-base" style={{ color: 'var(--text-2)' }}>
          {domain} track · {LEVEL_LABELS[level]} · Resources prioritized for your target role
          {categories.length > 0 && !assessed && ' · Starter picks based on your domain'}
        </p>
      </header>

      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-muted)' }}>
        {domainTabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t ? 'var(--bg-card)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--text-2)',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.06)' : undefined,
            }}>{t}
          </button>
        ))}
      </div>

      {/* ── DSA Tab ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
      {tab === 'DSA' && (
        <motion.div key="DSA" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.28 }} className="space-y-5">
          {/* LeetCode live card */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Code2 size={15} style={{ color: '#C26D3B' }} />
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>LeetCode</p>
              {lc && <span className="ml-auto text-xs font-bold" style={{ color: '#C26D3B' }}>@{lc.username}</span>}
            </div>
            {lc ? (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Total', value: lc.totalSolved },
                    { label: 'Easy', value: lc.easySolved },
                    { label: 'Medium', value: lc.mediumSolved },
                    { label: 'Hard', value: lc.hardSolved },
                  ].map(s => (
                    <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                      <p className="text-xl font-bold" style={{ color: '#C26D3B' }}>{s.value}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <ProgressBar label="Easy" value={lc.easySolved} max={Math.max(lc.totalSolved,1)} color="#10b981" right={String(lc.easySolved)} />
                  <ProgressBar label="Medium" value={lc.mediumSolved} max={Math.max(lc.totalSolved,1)} color="#f59e0b" right={String(lc.mediumSolved)} />
                  <ProgressBar label="Hard" value={lc.hardSolved} max={Math.max(lc.totalSolved,1)} color="#ef4444" right={String(lc.hardSolved)} />
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>No LeetCode data. Connect below.</p>
            )}
            <div className="flex gap-2 pt-1">
              <input value={lcUsername} onChange={e => setLcUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && refreshLC()}
                placeholder="LeetCode username"
                className="flex-1 rounded-xl px-3 py-2 text-sm border outline-none focus:border-[#C26D3B]"
                style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <button onClick={refreshLC} disabled={!lcUsername.trim() || lcState === 'loading'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: '#0F172A' }}>
                {lcState === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <><RefreshCcw size={13} />{lc ? 'Refresh' : 'Fetch'}</>}
              </button>
            </div>
            {lcError && <p className="text-xs text-red-500">{lcError}</p>}
          </div>

          {/* GitHub live card */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <GitBranch size={15} style={{ color: 'var(--text)' }} />
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>GitHub</p>
              {gh && <span className="ml-auto text-xs font-bold" style={{ color: '#C26D3B' }}>@{gh.username}</span>}
            </div>
            {gh ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Repos', value: gh.publicRepos },
                    { label: 'Stars', value: gh.totalStars },
                    { label: 'Active Days', value: `${gh.recentCommitDays}/30` },
                  ].map(s => (
                    <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                      <p className="text-xl font-bold" style={{ color: '#C26D3B' }}>{s.value}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <ProgressBar label="Commit consistency (last 30 days)" value={gh.recentCommitDays} max={30} color="#6366f1" right={`${gh.recentCommitDays} days`} />
                {gh.topLanguages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {gh.topLanguages.map(l => (
                      <span key={l} className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--accent-l)', color: '#C26D3B' }}>{l}</span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>No GitHub data. Connect below.</p>
            )}
            <div className="flex gap-2 pt-1">
              <input value={ghUsername} onChange={e => setGhUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && refreshGH()}
                placeholder="GitHub username"
                className="flex-1 rounded-xl px-3 py-2 text-sm border outline-none focus:border-[#C26D3B]"
                style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <button onClick={refreshGH} disabled={!ghUsername.trim() || ghState === 'loading'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: '#0F172A' }}>
                {ghState === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <><RefreshCcw size={13} />{gh ? 'Refresh' : 'Fetch'}</>}
              </button>
            </div>
            {ghError && <p className="text-xs text-red-500">{ghError}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Solved', value: lc ? lc.totalSolved : '—', color: '#C26D3B' },
              { label: 'Hard Solved',  value: lc ? lc.hardSolved  : '—', color: '#ef4444' },
              { label: 'DSA Score',    value: assessment ? `${assessment.dsa}%` : '—', color: '#6366f1' },
            ].map(s => (
              <div key={s.label} className="card p-5 text-center">
                <p className="text-3xl font-bold mb-1" style={{ color: s.color }}>{s.value}</p>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Projects Tab ────────────────────────────────────────────────── */}
      {tab === 'Projects' && (
        <motion.div key="Projects" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.28 }} className="space-y-4">
          {projects.length === 0 && !showProjForm ? (
            <div className="card p-10 text-center space-y-4">
              <p className="font-semibold text-lg" style={{ color: 'var(--text)' }}>No projects added yet</p>
              <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-2)' }}>
                Add your projects. PrepUp will analyse their quality based on GitHub presence, deployment status, and tech stack relevance.
              </p>
              <button onClick={() => setShowProjForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                style={{ background: '#0F172A' }}>
                <Plus size={14} /> Add Project
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>{projects.length} project{projects.length !== 1 ? 's' : ''} tracked</p>
                <button onClick={() => setShowProjForm(v => !v)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                  style={{ background: '#0F172A' }}>
                  {showProjForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Project</>}
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {projects.map(p => {
                  const { score, label, insights } = scoreProject(p)
                  return (
                    <div key={p.id} className="card p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-muted)' }}>
                          <Code2 size={18} style={{ color: '#C26D3B' }} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge label={p.status} variant={p.status === 'Deployed' ? 'success' : p.status === 'Completed' ? 'accent' : 'warn'} />
                          <span className={`text-xs font-bold ${score >= 80 ? 'text-emerald-600' : score >= 55 ? 'text-amber-600' : 'text-red-500'}`}>
                            {score}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{p.name}</h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{p.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {p.tech.map(t => <Badge key={t} label={t} variant="default" />)}
                      </div>
                      <div className="flex gap-4">
                        {p.github && (
                          <a href={`https://${p.github}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-medium hover:text-[#C26D3B] transition-colors" style={{ color: 'var(--text-2)' }}>
                            <GitBranch size={12} /> GitHub
                          </a>
                        )}
                        {p.demo && (
                          <a href={`https://${p.demo}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-medium hover:text-[#C26D3B] transition-colors" style={{ color: 'var(--text-2)' }}>
                            <ExternalLink size={12} /> Live Demo
                          </a>
                        )}
                      </div>
                      {/* Smart analysis */}
                      <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: 'var(--bg-muted)' }}>
                        <p className="font-semibold" style={{ color: 'var(--text-3)' }}>Quality: {label}</p>
                        {insights.map((ins, i) => (
                          <p key={i} style={{ color: 'var(--text-2)' }}>· {ins}</p>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {showProjForm && (
            <div className="card p-6 space-y-4">
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Add Project</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'name',        label: 'Project Name',    placeholder: 'PrepUp' },
                  { key: 'description', label: 'Description',     placeholder: 'Placement intelligence platform' },
                  { key: 'github',      label: 'GitHub URL',      placeholder: 'github.com/you/project' },
                  { key: 'demo',        label: 'Live Demo URL',   placeholder: 'project.vercel.app' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>{f.label}</label>
                    <input placeholder={f.placeholder}
                      value={(projForm as unknown as Record<string, string>)[f.key] ?? ''}
                      onChange={e => setProjForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none focus:border-[#C26D3B] transition-colors"
                      style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>Status</label>
                  <select value={projForm.status} onChange={e => setProjForm(p => ({ ...p, status: e.target.value as Project['status'] }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none focus:border-[#C26D3B] transition-colors"
                    style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    {['In Progress', 'Completed', 'Deployed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>Tech Stack (press Enter)</label>
                  <div className="flex gap-2">
                    <input placeholder="e.g. React"
                      value={techInput} onChange={e => setTechInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTech()}
                      className="flex-1 rounded-xl px-4 py-2.5 text-sm border outline-none focus:border-[#C26D3B] transition-colors"
                      style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    <button onClick={addTech} className="px-3 py-2 rounded-xl text-sm"
                      style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Add</button>
                  </div>
                  {projForm.tech.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {projForm.tech.map(t => (
                        <button key={t} onClick={() => setProjForm(p => ({ ...p, tech: p.tech.filter(x => x !== t) }))}
                          className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--accent-l)', color: '#C26D3B' }}>
                          {t} ×
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={addProject}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                style={{ background: '#0F172A' }}>
                Save Project
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Resume Tab ──────────────────────────────────────────────────── */}
      {tab === 'Resume' && (
        <motion.div key="Resume" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.28 }} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-6">
            <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--text-3)' }}>
              Resume Health (from assessment)
            </p>
            {assessed && assessment?.resumeEvidence ? (
              <div className="space-y-4">
                {[
                  { label: 'Overall ATS Score', value: assessment.resume },
                  { label: 'Contact Info', value: (assessment.resumeEvidence.hasEmail ? 50 : 0) + (assessment.resumeEvidence.hasPhone ? 30 : 0) + (assessment.resumeEvidence.hasGithub ? 20 : 0) },
                  { label: 'Section Completeness', value: [assessment.resumeEvidence.hasEducation, assessment.resumeEvidence.hasExperience, assessment.resumeEvidence.hasProjects, assessment.resumeEvidence.hasSkills].filter(Boolean).length * 25 },
                  { label: 'Quantified Impact', value: Math.min(assessment.resumeEvidence.quantifiedCount * 20, 100) },
                  { label: 'Action Verbs', value: Math.min(assessment.resumeEvidence.actionVerbCount * 12, 100) },
                ].map(i => <ProgressBar key={i.label} label={i.label} value={i.value} color="#6366f1" />)}
                <p className="text-xs mt-2 p-3 rounded-xl" style={{ background: 'var(--bg-muted)', color: 'var(--text-2)' }}>
                  Scores from ATS analysis of {assessment.resumeEvidence.fileName} ({assessment.resumeEvidence.wordCount} words).
                  Retake assessment after improving your resume.
                </p>
              </div>
            ) : (
              <p className="text-sm py-4" style={{ color: 'var(--text-2)' }}>Complete assessment to see resume health.</p>
            )}
          </div>
          <div className="card p-6">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>
              Improvement Recommendations
            </p>
            {assessed && assessment?.resumeEvidence ? (
              <div className="space-y-3">
                {([
                  !assessment.resumeEvidence.hasEmail && { type: 'warn' as const, msg: 'Add a professional email at the top of your resume.' },
                  assessment.resumeEvidence.quantifiedCount < 2 && { type: 'warn' as const, msg: `Only ${assessment.resumeEvidence.quantifiedCount} quantified impacts found — add numbers (%, users, ms) to bullets.` },
                  !assessment.resumeEvidence.hasGithub && { type: 'info' as const, msg: 'Add your GitHub link — recruiters click it for tech roles.' },
                  assessment.resumeEvidence.actionVerbCount < 5 && { type: 'info' as const, msg: `Use stronger action verbs (built, deployed, optimized) — found ${assessment.resumeEvidence.actionVerbCount}.` },
                  assessment.resumeEvidence.estimatedPages > 1 && { type: 'warn' as const, msg: 'Resume is longer than 1 page — trim for campus placements.' },
                ].filter((x): x is { type: 'warn' | 'info'; msg: string } => Boolean(x))).map((f, i) => (
                  <div key={i} className={`p-3 rounded-xl border text-sm ${
                    f.type === 'warn'    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-700 text-amber-700 dark:text-amber-400' :
                    'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                  }`}>{f.msg}</div>
                ))}
              </div>
            ) : (
              <p className="text-sm py-4" style={{ color: 'var(--text-2)' }}>Complete assessment to unlock recommendations.</p>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Resources Tab ───────────────────────────────────────────────── */}
      {tab === 'Resources' && (
        <motion.div key="Resources" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.28 }} className="space-y-4">
          {addonRecs.length > 0 && (
            <InsightBanner
              label="Recommended skill checks"
              message={addonRecs.map(r => `${r.label}${r.mandatory ? ' (required)' : ''}: ${r.reason}`).join(' · ')}
              type="info"
            />
          )}
          <InsightBanner
            label={categories.length > 0 ? `Resource Recommender — ${domain}` : 'Resource Recommender'}
            message={categories.length > 0
              ? gaps.some(g => g.gap > 0)
                ? `${LEVEL_LABELS[level]} track — ${prepSummary.totalGapPoints} pts gap across ${prepSummary.skillsWithGaps} areas · ~${prepSummary.estimatedWeeks} weeks at ${user?.weeklyHours ?? 'your pace'}.`
                : `Benchmarks met for ${domain} (${LEVEL_LABELS[level]}) — resources for stretch growth areas.`
              : 'Complete a Career Health module to refine these recommendations with your scores.'}
            type="info"
          />
          {categories.length > 0 ? (
            <div className="space-y-6">
              {categories.map(cat => (
                <div key={cat.key}>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{cat.label}</p>
                    <span className="badge badge-blue text-xs">Gap: {cat.gap}pts</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {cat.items.map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-4 card p-4 transition-all hover:border-[#C26D3B40]">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-muted)' }}>
                          <BookOpen size={16} style={{ color: '#C26D3B' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{r.title}</p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{r.why}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge label={r.tag} variant="accent" />
                            <Badge label={r.type} variant="default" />
                            {r.impact && <Badge label={`Impact: ${r.impact}`} variant="default" />}
                          </div>
                        </div>
                        <ExternalLink size={14} style={{ color: 'var(--text-3)' }} className="shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center space-y-3">
              <p className="font-semibold" style={{ color: 'var(--text)' }}>No resources yet</p>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                Complete the assessment — PrepUp will recommend resources based on your actual weak areas.
              </p>
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
