import { useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'

import { X } from 'lucide-react'

import type { AssessmentModuleId } from '../../engine/assessmentEngine'

import { ASSESSMENT_MODULES } from '../../engine/assessmentEngine'

import type { AptitudeEvidence, CommEvidence, MockInterviewSession, PlatformData, ResumeEvidence } from '../../types'

import CommunicationSkillCheck from '../CommunicationSkillCheck'

import AptitudeModule from './modules/AptitudeModule'

import CodingIntelligenceModule from './modules/CodingIntelligenceModule'

import MockInterviewModule from './modules/MockInterviewModule'

import ResumeIntelligenceModule from './modules/ResumeIntelligenceModule'

import { fetchGitHub } from '../../services/platformAPI'
import { computeGitHubScore, githubInsights } from '../../services/githubIntelligence'
import type { GitHubData } from '../../services/platformAPI'



interface Props {

  moduleId: AssessmentModuleId | null

  platformData: PlatformData | null

  targetDomain?: string

  onClose: () => void

  onResumeComplete: (evidence: ResumeEvidence, score: number) => void

  onCodingComplete: (data: PlatformData, score: number) => void

  onGitHubComplete?: (data: PlatformData, score: number) => void

  onCommComplete: (evidence: CommEvidence) => void

  onAptitudeComplete: (evidence: AptitudeEvidence) => void

  onInterviewComplete: (session: MockInterviewSession) => void

}



function GitHubModule({ platformData, onComplete, onClose }: {

  platformData: PlatformData | null

  onComplete: (data: PlatformData, score: number) => void

  onClose: () => void

}) {

  const [username, setUsername] = useState(platformData?.github?.username ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<GitHubData | null>(platformData?.github ?? null)

  const connect = async () => {
    if (!username.trim()) return
    setLoading(true)
    setError('')
    try {
      const gh = await fetchGitHub(username.trim())
      setPreview(gh)
    } catch (e) {
      setError((e as Error).message)
      setPreview(null)
    }
    setLoading(false)
  }

  const save = () => {
    if (!preview) return
    const data: PlatformData = {
      leetcode: platformData?.leetcode ?? null,
      github: preview,
      fetchedAt: new Date().toISOString(),
    }
    onComplete(data, computeGitHubScore(preview))
  }

  const insights = preview ? githubInsights(preview) : null



  return (

    <div className="space-y-4 max-w-xl">

      <p className="text-sm" style={{ color: 'var(--text-2)' }}>Connect GitHub to analyze repos, commits & project readiness.</p>

      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="github-username"

        className="w-full rounded-xl px-4 py-2.5 text-sm border"

        style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }} />

      {error && <p className="text-xs text-red-500">{error}</p>}
      {preview && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold" style={{ color: 'var(--text)' }}>@{preview.username}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{computeGitHubScore(preview)}%</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 rounded-lg" style={{ background: 'var(--bg-muted)' }}>Repos: {preview.publicRepos}</div>
            <div className="p-2 rounded-lg" style={{ background: 'var(--bg-muted)' }}>Stars: {preview.totalStars}</div>
            <div className="p-2 rounded-lg" style={{ background: 'var(--bg-muted)' }}>Active days: {preview.recentCommitDays}</div>
            <div className="p-2 rounded-lg" style={{ background: 'var(--bg-muted)' }}>Languages: {preview.topLanguages.slice(0, 3).join(', ') || '—'}</div>
          </div>
          {insights && (
            <div className="text-xs space-y-1" style={{ color: 'var(--text-2)' }}>
              {insights.strong.length > 0 && <p><strong>Strong:</strong> {insights.strong.join(' · ')}</p>}
              {insights.weak.length > 0 && <p><strong>Improve:</strong> {insights.weak.join(' · ')}</p>}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={connect} disabled={loading} className="btn-primary flex-1 py-3 text-sm">
          {loading ? 'Analyzing…' : preview ? 'Refresh' : 'Connect GitHub'}
        </button>
        {preview && (
          <button onClick={save} className="btn-accent flex-1 py-3 text-sm">Save & Update</button>
        )}

        <button onClick={onClose} className="btn-secondary px-4 py-3 text-sm">Cancel</button>

      </div>

    </div>

  )

}



export default function ModuleLauncher(props: Props) {

  const { moduleId, platformData, onClose, targetDomain = 'Software Engineering' } = props

  const moduleDef = ASSESSMENT_MODULES.find(m => m.id === moduleId)



  return (

    <AnimatePresence>

      {moduleId && moduleDef && (

        <>

          <motion.div

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            exit={{ opacity: 0 }}

            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"

            onClick={onClose}

          />

          <motion.div

            initial={{ opacity: 0, y: 24 }}

            animate={{ opacity: 1, y: 0 }}

            exit={{ opacity: 0, y: 16 }}

            className="fixed inset-0 z-[101] overflow-y-auto"

            style={{ background: 'var(--bg)' }}

          >

            <header

              className="sticky top-0 z-10 border-b px-4 sm:px-8 py-4 flex items-center justify-between gap-4"

              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}

            >

              <div className="min-w-0">

                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-0.5">Assessment module</p>

                <h2 className="text-lg sm:text-xl font-bold truncate" style={{ color: 'var(--text)' }}>{moduleDef.title}</h2>

                <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--text-2)' }}>{moduleDef.subtitle}</p>

              </div>

              <button

                type="button"

                onClick={onClose}

                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shrink-0 border"

                style={{ borderColor: 'var(--border)', color: 'var(--text-2)', background: 'var(--bg-muted)' }}

              >

                <X size={16} /> Close

              </button>

            </header>



            <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-10">

              {moduleId === 'resume' && (

                <ResumeIntelligenceModule targetDomain={targetDomain} onComplete={props.onResumeComplete} onClose={onClose} />

              )}

              {moduleId === 'github' && (

                <GitHubModule platformData={platformData} onComplete={props.onGitHubComplete ?? props.onCodingComplete} onClose={onClose} />

              )}

              {moduleId === 'coding' && (

                <CodingIntelligenceModule platformData={platformData} onComplete={props.onCodingComplete} onClose={onClose} />

              )}

              {moduleId === 'communication' && (

                <CommunicationSkillCheck

                  proctorRequired={false}

                  onComplete={props.onCommComplete}

                  onSkip={onClose}

                />

              )}

              {moduleId === 'aptitude' && (

                <AptitudeModule onComplete={ev => { props.onAptitudeComplete(ev); onClose() }} onClose={onClose} />

              )}

              {moduleId === 'interview' && (

                <MockInterviewModule onComplete={ev => { props.onInterviewComplete(ev); onClose() }} onClose={onClose} />

              )}

            </div>

          </motion.div>

        </>

      )}

    </AnimatePresence>

  )

}

