import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../store/AppContext'
import type { FailureEntry } from '../types'
import { Badge, InsightBanner } from '../components/UI'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, ChevronDown, ChevronUp, AlertTriangle, Brain, TrendingDown, Calendar } from 'lucide-react'
import { analyzeFailures, inferTagsFromFailure } from '../engine/intelligence'
import { backendAPI } from '../services/api'

const PIE_COLORS = ['#C26D3B', '#6366f1', '#ec4899', '#f59e0b', '#ef4444', '#06b6d4']

const REASONS = [
  'Ran out of time', 'Did not know the concept', 'Nervous / anxious',
  'Poor communication', 'Could not optimise solution', 'Other',
]

const EMPTY: Omit<FailureEntry, 'id'> = {
  company: '', role: '', round: '', date: '', questionsAsked: '',
  confidence: 3, difficulty: 'Medium', reason: '', tags: [],
}

const QUICK_TAGS = ['DSA', 'Technical', 'Communication', 'HR', 'Aptitude', 'System Design']

export default function FailureIntelligence() {
  const { failures, setFailures } = useApp()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<FailureEntry, 'id'>>(EMPTY)
  const [tagInput, setTagInput] = useState('')
  const [backendRecovery, setBackendRecovery] = useState<string[]>([])
  const [mlInsights, setMlInsights] = useState<{
    insight?: string
    clusters?: { label: string; size: number; keywords: string[] }[]
    top_topics?: string[]
  } | null>(null)

  const pattern = analyzeFailures(failures)

  const tagFreq: Record<string, number> = {}
  failures.forEach(f => f.tags.forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 1 }))
  const tagData = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t])
    setTagInput('')
  }

  const submit = () => {
    if (!form.company || !form.round) return
    const enriched = { ...form, tags: inferTagsFromFailure(form) }
    const entry = { ...enriched, id: Date.now().toString() }
    setFailures([entry, ...failures])
    const reasons = [entry.reason, ...entry.tags].filter(Boolean)
    if (reasons.length > 0) {
      backendAPI.failureIntelligence(reasons)
        .then(res => {
          setBackendRecovery(res.recovery_plan ?? [])
          if (res.ml_insights) setMlInsights(res.ml_insights)
        })
        .catch(() => {})
    }
    setForm(EMPTY); setTagInput(''); setShowForm(false)
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-10">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <p className="text-label">Failure Intelligence</p>
          <h1 className="text-display font-display">Every rejection is data</h1>
          <p className="text-base" style={{ color: 'var(--text-2)' }}>
            PrepUp finds patterns in your rejections and turns them into actionable improvements.
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-accent">
          <Plus size={15} /> Log Rejection
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Rejections', value: failures.length, icon: AlertTriangle, cls: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Technical Fails', value: `${pattern?.dsaFailPct ?? 0}%`, icon: TrendingDown, cls: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'HR Fails', value: `${pattern?.hrFailPct ?? 0}%`, icon: Brain, cls: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Patterns Found', value: tagData.length, icon: Calendar, cls: 'text-[#C26D3B]', bg: 'bg-[#F3E8DF] dark:bg-[#2A1A10]' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={16} className={s.cls} />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {pattern && (
        <InsightBanner label="Pattern Detected" message={pattern.insight} type="warn" />
      )}

      {mlInsights?.insight && (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: 'var(--accent)' }}>
            <Brain size={14} /> ML Failure Clustering (TF-IDF + K-Means)
          </p>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>{mlInsights.insight.replace(/\*\*/g, '')}</p>
          {mlInsights.clusters && mlInsights.clusters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {mlInsights.clusters.map(c => (
                <span key={c.label} className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                  {c.label}: {c.keywords.slice(0, 3).join(', ')} ({c.size})
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="card p-6 overflow-hidden">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Log a Rejection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { label: 'Company', key: 'company', placeholder: 'Google' },
                { label: 'Role', key: 'role', placeholder: 'SWE Intern' },
                { label: 'Round', key: 'round', placeholder: 'Technical Round 2' },
                { label: 'Date', key: 'date', placeholder: '', type: 'date' },
              ] as { label: string; key: string; placeholder: string; type?: string }[]).map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>{f.label}</label>
                  <input type={f.type ?? 'text'} placeholder={f.placeholder}
                    className="w-full rounded-xl px-4 py-3 text-sm border outline-none focus:border-[#C26D3B] transition-colors"
                    style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    value={(form as Record<string, unknown>)[f.key] as string ?? ''}
                    onChange={e => set(f.key as keyof typeof form, e.target.value as never)} />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>Questions Asked</label>
                <input placeholder="e.g. DP on grid, BFS traversal"
                  className="w-full rounded-xl px-4 py-3 text-sm border outline-none focus:border-[#C26D3B] transition-colors"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={form.questionsAsked}
                  onChange={e => set('questionsAsked', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>Root Cause</label>
                <select className="w-full rounded-xl px-4 py-3 text-sm border outline-none focus:border-[#C26D3B] transition-colors"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={form.reason} onChange={e => set('reason', e.target.value)}>
                  <option value="">Select reason</option>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>Confidence Level (1–5)</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => set('confidence', n as 1|2|3|4|5)}
                      className="flex-1 py-3 rounded-xl border text-sm font-semibold transition-all"
                      style={{
                        border: form.confidence === n ? '1px solid #C26D3B' : '1px solid var(--border)',
                        background: form.confidence === n ? 'var(--accent-l)' : 'var(--bg-muted)',
                        color: form.confidence === n ? '#C26D3B' : 'var(--text)',
                      }}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>Skill Tags (press Enter or pick below)</label>
                <div className="flex gap-2">
                  <input placeholder="e.g. Dynamic Programming"
                    className="flex-1 rounded-xl px-4 py-3 text-sm border outline-none focus:border-[#C26D3B] transition-colors"
                    style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag()} />
                  <button onClick={addTag}
                    className="px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                    Add
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {QUICK_TAGS.map(t => (
                    <button key={t} type="button"
                      onClick={() => !form.tags.includes(t) && set('tags', [...form.tags, t])}
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{ background: form.tags.includes(t) ? 'var(--accent-l)' : 'var(--bg-muted)', color: form.tags.includes(t) ? '#C26D3B' : 'var(--text-2)', border: '1px solid var(--border)' }}>
                      {t}
                    </button>
                  ))}
                </div>
                {form.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {form.tags.map(t => (
                      <button key={t} onClick={() => set('tags', form.tags.filter(x => x !== t))}
                        className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--accent-l)', color: '#C26D3B' }}>
                        {t} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--bg-muted)' }}>
                Cancel
              </button>
              <button onClick={submit}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                style={{ background: 'var(--primary)' }}>
                Save & Analyse
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Rejection Timeline</h2>
          {failures.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                No rejections logged yet. Log your first to start building failure intelligence.
              </p>
            </div>
          )}
          {failures.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} className="card overflow-hidden">
              <button className="w-full flex items-start gap-4 p-5 text-left"
                onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: '#C26D3B' }}>{f.company[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{f.company}</p>
                    <Badge label={f.round} variant="default" />
                    <Badge label={f.difficulty} variant={f.difficulty === 'Hard' ? 'danger' : f.difficulty === 'Medium' ? 'warn' : 'success'} />
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{f.role} · {f.date}</p>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {f.tags.map(t => <Badge key={t} label={t} variant="accent" />)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>Confidence: {f.confidence}/5</span>
                  {expanded === f.id
                    ? <ChevronUp size={14} style={{ color: 'var(--text-3)' }} />
                    : <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />}
                </div>
              </button>
              <AnimatePresence>
                {expanded === f.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
                    style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="p-5 space-y-4">
                      {f.questionsAsked && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Questions Asked</p>
                          <p className="text-sm" style={{ color: 'var(--text)' }}>{f.questionsAsked}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Root Cause</p>
                        <p className="text-sm" style={{ color: 'var(--text)' }}>{f.reason || '—'}</p>
                      </div>
                      {pattern && (
                        <div className="p-4 rounded-xl" style={{ background: 'var(--accent-l)', border: '1px solid #C26D3B30' }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: '#C26D3B' }}>Recovery Plan</p>
                          <p className="text-sm" style={{ color: 'var(--text)' }}>{pattern.recovery}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Pattern sidebar */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Skill Gap Analysis</h2>
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
              Failure Tags
            </p>
            {tagData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={tagData} cx="50%" cy="50%" innerRadius={38} outerRadius={72} dataKey="value" stroke="none">
                      {tagData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {tagData.map((t, i) => (
                    <div key={t.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span style={{ color: 'var(--text-2)' }}>{t.name}</span>
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--text)' }}>{t.value}×</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>
                Log rejections with tags to see patterns.
              </p>
            )}
          </div>

          {pattern && (
            <div className="card p-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
                Intelligence Insights
              </p>
              {[
                { msg: `Technical round failures: ${pattern.dsaFailPct}%`, type: pattern.dsaFailPct > 50 ? 'danger' : 'warn' },
                { msg: `HR round failures: ${pattern.hrFailPct}%`, type: pattern.hrFailPct > 40 ? 'warn' : 'success' },
                { msg: pattern.topTagCount > 0 ? `Most recurring weakness: "${pattern.topTag}" (${pattern.topTagCount}×)` : 'Select a root cause when logging — tags are auto-inferred', type: pattern.topTagCount > 0 ? 'danger' : 'warn' },
              ].map((ins, i) => (
                <div key={i} className={`p-3 rounded-xl border text-xs font-medium ${
                  ins.type === 'danger' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-700 dark:text-red-400' :
                  ins.type === 'warn'   ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-400' :
                  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                }`}>{ins.msg}</div>
              ))}
            </div>
          )}

          {pattern && pattern.recoveryResources.length > 0 && (
            <div className="card p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                Recommended Resources
              </p>
              {pattern.recoveryResources.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="block p-3 rounded-xl text-sm hover:opacity-80"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text)' }}>
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{r.why}</p>
                </a>
              ))}
            </div>
          )}

          {backendRecovery.length > 0 && (
            <div className="card p-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                Action Steps
              </p>
              {backendRecovery.map((step, i) => (
                <p key={i} className="text-sm" style={{ color: 'var(--text-2)' }}>• {step}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
