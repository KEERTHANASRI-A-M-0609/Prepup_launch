import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Code2, RefreshCcw, Loader2, CheckCircle2 } from 'lucide-react'
import { fetchLeetCode } from '../../../services/platformAPI'
import { parseLeetCodeUsername } from '../../../utils/leetcodeUsername'
import { buildCodingProfile } from '../../../services/codingIntelligence'
import type { PlatformData } from '../../../types'

interface Props {
  platformData: PlatformData | null
  onComplete: (data: PlatformData, codingScore: number) => void
  onClose: () => void
}

export default function CodingIntelligenceModule({ platformData, onComplete, onClose }: Props) {
  const [lcUser, setLcUser] = useState(platformData?.leetcode?.username ?? '')
  const [hrUser, setHrUser] = useState('')
  const [ccUser, setCcUser] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<ReturnType<typeof buildCodingProfile> | null>(null)
  const [localPlatform, setLocalPlatform] = useState<PlatformData | null>(platformData)

  const fetchAll = async () => {
    const handle = parseLeetCodeUsername(lcUser)
    if (!handle) {
      setError('Enter your LeetCode username (e.g. neetcode) or paste your profile URL')
      return
    }
    setLoading(true)
    setError('')
    try {
      const lc = await fetchLeetCode(handle)
      const gh = platformData?.github ?? localPlatform?.github ?? null
      const data: PlatformData = { leetcode: lc, github: gh, fetchedAt: new Date().toISOString() }
      setLocalPlatform(data)
      const p = buildCodingProfile(data, { leetcode: handle, hackerrank: hrUser, codechef: ccUser, github: gh?.username })
      setProfile(p)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 size={18} style={{ color: '#C26D3B' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Coding Intelligence</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)]"><X size={16} /></button>
      </div>

      {!profile ? (
        <div className="space-y-3">
          <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>
            LeetCode powers your DSA readiness score. Connect GitHub separately in the GitHub Intelligence module.
          </p>
          {[
            { label: 'LeetCode', value: lcUser, set: setLcUser, ph: 'neetcode or leetcode.com/u/yourname' },
            { label: 'HackerRank', value: hrUser, set: setHrUser, ph: 'hackerrank-username (optional)' },
            { label: 'CodeChef', value: ccUser, set: setCcUser, ph: 'codechef-username (optional)' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-3)' }}>{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none focus:border-[#C26D3B]"
                style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
          ))}
          {error && (
            <p className="text-xs text-red-500 p-3 rounded-lg" style={{ background: '#FEF2F2' }}>
              {error}
              {error.includes('backend') || error.includes('rate limit') ? (
                <span className="block mt-1 text-[var(--text-3)]">Tip: run <code>cd backend && npm run dev</code> for reliable platform fetching.</span>
              ) : null}
            </p>
          )}
          <button onClick={fetchAll} disabled={loading}
            className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
            Analyze Coding Profile
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="text-center p-5 glass-card">
            <p className="text-4xl font-bold" style={{ color: '#C26D3B' }}>{profile.readinessScore}%</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Coding Readiness Score</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { l: 'Problems', v: profile.problemsSolved },
              { l: 'Hard', v: profile.hardSolved },
              { l: 'Medium', v: profile.mediumSolved },
              { l: 'Consistency', v: `${profile.consistencyScore}%` },
            ].map(s => (
              <div key={s.l} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-muted)' }}>
                <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{s.v}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{s.l}</p>
              </div>
            ))}
          </div>
          {profile.weakTopics.length > 0 && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--warning-l)' }}>
              <strong>Weak topics:</strong> {profile.weakTopics.join(', ')}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-3)' }}>Learning Roadmap</p>
            {profile.roadmap.map((r, i) => (
              <p key={i} className="text-xs mb-1" style={{ color: 'var(--text-2)' }}>• {r}</p>
            ))}
          </div>
          <button onClick={() => localPlatform && onComplete(localPlatform, profile.readinessScore)}
            className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
            <CheckCircle2 size={14} /> Save & Update Readiness
          </button>
        </motion.div>
      )}
    </div>
  )
}
