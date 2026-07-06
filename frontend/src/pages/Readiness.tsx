import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useApp } from '../store/AppContext'
import { ScoreRing, ProgressBar, InsightBanner } from '../components/UI'
import { RefreshCcw, GitBranch, Code2, Loader2, CheckCircle2, Mic, AlertTriangle, PenLine } from 'lucide-react'
import { computeOverall, computeGaps, WEIGHTS, COLORS, LABELS, computeFromEvidence, isAssessmentComplete } from '../engine/intelligence'
import { fetchLeetCode, fetchGitHub } from '../services/platformAPI'
import type { LeetCodeData, GitHubData } from '../services/platformAPI'
import type { PlatformData, CommEvidence } from '../types'
import CommunicationSkillCheck from '../components/CommunicationSkillCheck'
import CompanyEnginesPanel from '../components/readiness/CompanyEnginesPanel'

type FetchState = 'idle' | 'loading' | 'success' | 'error'

const improvements: Record<string, string> = {
  DSA:           'Solve 3 problems/day targeting your weakest topic. Use NeetCode 150 ordered by pattern.',
  Resume:        'Add quantifiable achievements (numbers, percentages, impact). Run through an ATS checker.',
  Projects:      'Deploy at least one project live. Add a polished README with setup instructions.',
  Communication: 'Practice STAR format for behavioral questions. Use the Communication Skill Check below.',
  Aptitude:      'Practice 10 quant + reasoning questions daily. IndiaBix is best for India placements.',
  'Interview Performance': 'Log every interview attempt in Failure Intel to get pattern-based recovery advice.',
}

function StatPill({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-xl text-center" style={{ background: 'var(--bg-muted)' }}>
      <span className="text-xl font-bold" style={{ color: '#C26D3B' }}>{value}</span>
      <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{label}</span>
      {sub && <span className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</span>}
    </div>
  )
}

export default function Readiness() {
  const { assessment, setAssessment, setView, setPlatformData, platformData, user, applications } = useApp()
  const domain = user?.domain ?? 'Software Engineering'

  const [lcUsername, setLcUsername] = useState(platformData?.leetcode?.username ?? '')
  const [ghUsername, setGhUsername] = useState(platformData?.github?.username ?? '')
  const [lcState, setLcState] = useState<FetchState>(platformData?.leetcode ? 'success' : 'idle')
  const [ghState, setGhState] = useState<FetchState>(platformData?.github ? 'success' : 'idle')
  const [lcData,  setLcData]  = useState<LeetCodeData | null>(platformData?.leetcode ?? null)
  const [ghData,  setGhData]  = useState<GitHubData | null>(platformData?.github ?? null)
  const [lcError, setLcError] = useState('')
  const [ghError, setGhError] = useState('')
  const [showRefetch, setShowRefetch] = useState(false)
  const [showCommCheck, setShowCommCheck] = useState(false)

  const refetchLC = async () => {
    if (!lcUsername.trim()) return
    setLcState('loading'); setLcError('')
    try {
      const data = await fetchLeetCode(lcUsername.trim())
      setLcData(data); setLcState('success')
    } catch (e) { setLcError((e as Error).message); setLcState('error') }
  }

  const refetchGH = async () => {
    if (!ghUsername.trim()) return
    setGhState('loading'); setGhError('')
    try {
      const data = await fetchGitHub(ghUsername.trim())
      setGhData(data); setGhState('success')
    } catch (e) { setGhError((e as Error).message); setGhState('error') }
  }

  const applyRefetch = () => {
    if (!lcData && !ghData) return
    const platform: PlatformData = {
      leetcode: lcData,
      github: ghData,
      fetchedAt: new Date().toISOString(),
    }
    const updated = computeFromEvidence(
      platform,
      assessment?.resumeEvidence ?? null,
      assessment?.commEvidence   ?? null,
      assessment?.aptitudeEvidence ?? null,
      domain,
    )
    setPlatformData(platform)
    setAssessment(updated)
    setShowRefetch(false)
  }

  const handleCommComplete = (ev: CommEvidence) => {
    const platform: PlatformData = {
      leetcode: platformData?.leetcode ?? null,
      github: platformData?.github ?? null,
      fetchedAt: platformData?.fetchedAt ?? new Date().toISOString(),
    }
    const updated = computeFromEvidence(platform, assessment?.resumeEvidence ?? null, ev, assessment?.aptitudeEvidence ?? null, domain)
    setAssessment(updated)
    setShowCommCheck(false)
  }

  if (!isAssessmentComplete(assessment, domain) || !assessment) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-6 pt-20">
        <p className="font-display text-2xl font-semibold" style={{ color: 'var(--text)' }}>No assessment yet</p>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          PrepUp needs your platform data to calculate a real score.
        </p>
        <button onClick={() => setView('assessment')}
          className="px-6 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90"
          style={{ background: '#0F172A' }}>
          Take Assessment
        </button>
      </div>
    )
  }

  const overall  = computeOverall(assessment)
  const gaps     = computeGaps(assessment, domain)
  const weakest  = gaps[0]
  const strongest = [...gaps].sort((a, b) => b.current - a.current)[0]

  // No static fallbacks — only real data
  const scores: Record<string, number> = {
    dsa: assessment.dsa,
    resume: assessment.resume,
    projects: assessment.projects,
    aptitude: assessment.aptitude,
    communication: assessment.communication,
    interview: assessment.interview ?? 0,
  }
  const barData = Object.keys(WEIGHTS).map(k => ({ name: LABELS[k], score: scores[k] ?? 0, fill: COLORS[k] }))
  const lc = platformData?.leetcode
  const gh = platformData?.github
  const fetchedAt = platformData?.fetchedAt
    ? new Date(platformData.fetchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <p className="text-label">Readiness</p>
          <h1 className="text-display font-display">Placement Readiness</h1>
          <p className="text-base" style={{ color: 'var(--text-2)' }}>
            Score from real platform data. Domain: {domain}.
            {fetchedAt && <span className="ml-2" style={{ color: 'var(--text-3)' }}>Last fetched: {fetchedAt}</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowCommCheck(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-[var(--bg-muted)]"
            style={{ border: '1px solid var(--border)', color: assessment.commEvidence ? '#059669' : '#D97706' }}>
            <Mic size={14} />
            {assessment.commEvidence ? `Comm: ${assessment.communication}%` : 'Communication Check'}
          </button>
          <button onClick={() => setShowRefetch(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-[var(--bg-muted)]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            <RefreshCcw size={14} /> Refresh Data
          </button>
          <button onClick={() => setView('assessment')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-[var(--bg-muted)]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            Retake
          </button>
        </div>
      </header>

      <CompanyEnginesPanel
        assessment={assessment}
        platformData={platformData}
        applications={applications}
        targetCompanies={user?.targetCompanies ?? []}
        domain={domain}
      />

      {/* Communication Skill Check — optional, highlighted */}
      {showCommCheck && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="card p-6 border-2" style={{ borderColor: '#D97706' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#FEF3C7' }}>
              <Mic size={14} style={{ color: '#D97706' }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Communication Skill Check</p>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#FEF3C7', color: '#D97706' }}>
              Optional
            </span>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
            Struggling with verbal communication in interviews? Take this quick skill check to get a real score
            based on your speech — pace, filler words, and content quality. You'll also get a personalized improvement plan.
          </p>
          <CommunicationSkillCheck
            onComplete={handleCommComplete}
            onSkip={() => setShowCommCheck(false)}
          />
        </motion.div>
      )}

      {/* Refetch panel */}
      {showRefetch && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="card p-5 space-y-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Refresh platform data to recalculate your score</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Code2 size={14} style={{ color: '#C26D3B' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>LeetCode</span>
                {lcState === 'success' && <CheckCircle2 size={13} className="text-emerald-500" />}
              </div>
              <div className="flex gap-2">
                <input value={lcUsername} onChange={e => setLcUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && refetchLC()}
                  placeholder="leetcode username"
                  className="flex-1 rounded-xl px-3 py-2 text-sm border outline-none focus:border-[#C26D3B]"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <button onClick={refetchLC} disabled={!lcUsername.trim() || lcState === 'loading'}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40"
                  style={{ background: '#0F172A' }}>
                  {lcState === 'loading' ? <Loader2 size={13} className="animate-spin" /> : 'Fetch'}
                </button>
              </div>
              {lcState === 'error' && <p className="text-xs text-red-500">{lcError}</p>}
              {lcData && <p className="text-xs text-emerald-600">✓ {lcData.totalSolved} problems fetched</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GitBranch size={14} style={{ color: 'var(--text)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>GitHub</span>
                {ghState === 'success' && <CheckCircle2 size={13} className="text-emerald-500" />}
              </div>
              <div className="flex gap-2">
                <input value={ghUsername} onChange={e => setGhUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && refetchGH()}
                  placeholder="github username"
                  className="flex-1 rounded-xl px-3 py-2 text-sm border outline-none focus:border-[#C26D3B]"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <button onClick={refetchGH} disabled={!ghUsername.trim() || ghState === 'loading'}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40"
                  style={{ background: '#0F172A' }}>
                  {ghState === 'loading' ? <Loader2 size={13} className="animate-spin" /> : 'Fetch'}
                </button>
              </div>
              {ghState === 'error' && <p className="text-xs text-red-500">{ghError}</p>}
              {ghData && <p className="text-xs text-emerald-600">✓ {ghData.publicRepos} repos fetched</p>}
            </div>
          </div>
          <button onClick={applyRefetch} disabled={!lcData && !ghData}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90"
            style={{ background: '#C26D3B' }}>
            Recalculate Score
          </button>
        </motion.div>
      )}

      {/* Evidence cards */}
      {(lc || gh) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lc && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Code2 size={15} style={{ color: '#C26D3B' }} />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>LeetCode Evidence</p>
                <span className="ml-auto text-xs font-bold" style={{ color: '#C26D3B' }}>@{lc.username}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <StatPill label="Total" value={lc.totalSolved} />
                <StatPill label="Easy" value={lc.easySolved} sub="easy" />
                <StatPill label="Medium" value={lc.mediumSolved} sub="med" />
                <StatPill label="Hard" value={lc.hardSolved} sub="hard" />
              </div>
              <div className="space-y-2">
                <ProgressBar label="Easy" value={lc.easySolved} max={Math.max(lc.totalSolved, 1)} color="#10b981" right={String(lc.easySolved)} />
                <ProgressBar label="Medium" value={lc.mediumSolved} max={Math.max(lc.totalSolved, 1)} color="#f59e0b" right={String(lc.mediumSolved)} />
                <ProgressBar label="Hard" value={lc.hardSolved} max={Math.max(lc.totalSolved, 1)} color="#ef4444" right={String(lc.hardSolved)} />
              </div>
            </div>
          )}
          {gh && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch size={15} style={{ color: 'var(--text)' }} />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>GitHub Evidence</p>
                <span className="ml-auto text-xs font-bold" style={{ color: '#C26D3B' }}>@{gh.username}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <StatPill label="Repos" value={gh.publicRepos} />
                <StatPill label="Stars" value={gh.totalStars} />
                <StatPill label="Active Days" value={`${gh.recentCommitDays}/30`} sub="last 30d" />
              </div>
              {gh.topLanguages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-3)' }}>Top Languages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {gh.topLanguages.map(l => (
                      <span key={l} className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: 'var(--accent-l)', color: '#C26D3B' }}>{l}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3">
                <ProgressBar label="Commit consistency" value={gh.recentCommitDays} max={30} color="#6366f1" right={`${gh.recentCommitDays} days`} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Score overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="card p-6 flex flex-col items-center text-center">
          <ScoreRing score={overall} size={130} strokeWidth={9} />
          <p className="font-semibold mt-4 text-sm" style={{ color: 'var(--text)' }}>Overall Readiness</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Weighted composite vs {domain} benchmark</p>
          {!lc && !gh && (
            <p className="text-xs mt-2 text-amber-600 flex items-center justify-center gap-1">
              <AlertTriangle size={12} /> No platform data — scores from assessment only
            </p>
          )}
        </div>

        <div className="lg:col-span-2 card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>
            Score vs Benchmark
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 12 }}
                formatter={(v: unknown) => [`${v}%`, 'Score']} />
              {barData.map(d => <Bar key={d.name} dataKey="score" fill={d.fill} radius={[6, 6, 0, 0]} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Biggest Gap</p>
            <p className="font-display text-lg font-semibold text-red-500">{weakest?.label}</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{weakest?.current}%</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Need {weakest?.target}% for {domain}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Strongest Area</p>
            <p className="font-display text-lg font-semibold text-emerald-600">{strongest?.label}</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{strongest?.current}%</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Your competitive edge</p>
          </div>
        </div>
      </div>

      {/* Gap cards */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>
          Priority order — fix the largest gap first
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {gaps.map((g, i) => (
            <motion.div key={g.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }} className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{g.label}</p>
                <span className="text-2xl font-bold" style={{ color: g.color }}>{g.current}%</span>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>
                Target: {g.target}% · Gap: {g.gap > 0 ? `${g.gap} pts` : '✓ Met'}
              </p>
              <ProgressBar label="" value={g.current} color={g.color} />
              <p className="text-xs mt-3" style={{ color: 'var(--text-2)' }}>
                {improvements[g.label] ?? `Work on ${g.label} to close the gap.`}
              </p>
              {g.key === 'communication' && !assessment.commEvidence && (
                <button onClick={() => setShowCommCheck(true)}
                  className="mt-2 text-xs font-semibold flex items-center gap-1 hover:underline"
                  style={{ color: '#D97706' }}>
                  <Mic size={11} /> Take Communication Skill Check
                </button>
              )}
              <p className="text-xs mt-2 font-medium flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                {g.key === 'dsa' && lc ? (
                  <><Code2 size={11} /> LeetCode: {lc.totalSolved} solved</>
                ) : g.key === 'projects' && gh ? (
                  <><GitBranch size={11} /> GitHub: {gh.publicRepos} repos</>
                ) : g.key === 'communication' && assessment.commEvidence ? (
                  <><Mic size={11} /> Voice analysis: {assessment.commEvidence.wordsPerMinute} wpm</>
                ) : (
                  <><PenLine size={11} /> From assessment</>
                )}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <InsightBanner
        label="How this score is calculated"
        message={`DSA${lc ? ` from LeetCode (${lc.totalSolved} solved)` : ' from assessment'}. Projects${gh ? ` from GitHub (${gh.publicRepos} repos, ${gh.recentCommitDays} active days)` : ' from assessment'}. Resume from ATS analysis. Aptitude from quiz. Communication${assessment.commEvidence ? ' from voice analysis' : ' not yet assessed — use Communication Check'}. No hardcoded defaults.`}
        type="info"
      />
    </div>
  )
}
