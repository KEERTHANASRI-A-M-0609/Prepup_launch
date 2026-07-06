import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../store/AppContext'
import type { PlatformData, ResumeEvidence, AptitudeEvidence, CommEvidence } from '../types'
import { fetchLeetCode, fetchGitHub } from '../services/platformAPI'
import type { LeetCodeData, GitHubData } from '../services/platformAPI'
import { analyzeResume, ResumeAnalysisError, isResumeFile } from '../services/resumeAnalyzer'
import { APTITUDE_QUESTIONS, scoreAptitude } from '../services/aptitudeQuestions'
import { computeFromEvidence, getRoleMandatorySections, getRecommendedAddons } from '../engine/intelligence'
import { backendAPI } from '../services/api'
import { useCameraProctor } from '../hooks/useCameraProctor'
import CommunicationSkillCheck from '../components/CommunicationSkillCheck'
import PrepUpLogo from '../components/brand/PrepUpLogo'
import {
  ChevronRight, ChevronLeft, GitBranch, Code2,
  CheckCircle2, Loader2, RefreshCcw, Home,
  Upload, FileText, AlertTriangle, CameraOff, Mic, Brain, Circle, Lightbulb,
} from 'lucide-react'

type Section = 'platforms' | 'resume' | 'addons'
const SECTIONS: Section[] = ['platforms', 'resume', 'addons']
type FetchState = 'idle' | 'loading' | 'success' | 'error'
type AddonTab = 'aptitude' | 'communication'

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
      <span className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{value}</span>
      <span className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{label}</span>
    </div>
  )
}

export default function AssessmentFlow() {
  const { setAssessment, setPlatformData, setView, studentId, user } = useApp()
  const domain = user?.domain ?? 'Software Engineering'
  const mandatory = getRoleMandatorySections(domain)
  const [section, setSection] = useState<Section>('platforms')
  const [addonTab, setAddonTab] = useState<AddonTab>(
    mandatory.aptitude ? 'aptitude' : mandatory.communication ? 'communication' : 'aptitude',
  )

  // Platform state
  const [lcUsername, setLcUsername] = useState('')
  const [ghUsername, setGhUsername] = useState('')
  const [lcState, setLcState] = useState<FetchState>('idle')
  const [ghState, setGhState] = useState<FetchState>('idle')
  const [lcData, setLcData] = useState<LeetCodeData | null>(null)
  const [ghData, setGhData] = useState<GitHubData | null>(null)
  const [lcError, setLcError] = useState('')
  const [ghError, setGhError] = useState('')

  // Resume state
  const [resumeEvidence, setResumeEvidence] = useState<ResumeEvidence | null>(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Aptitude state + anti-cheat
  const [aptAnswers, setAptAnswers] = useState<Record<number, number>>({})
  const [aptSubmitted, setAptSubmitted] = useState(false)
  const [aptEvidence, setAptEvidence] = useState<AptitudeEvidence | null>(null)
  const [aptCheat, setAptCheat] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [aptStarted, setAptStarted] = useState(false)
  const proctor = useCameraProctor()

  // Communication add-on
  const [commEvidence, setCommEvidence] = useState<CommEvidence | null>(null)
  const [commDone, setCommDone] = useState(false)

  const sIdx = SECTIONS.indexOf(section)
  const recommended = getRecommendedAddons(domain, {
    dsa: 0, resume: 0, projects: 0, communication: 0, aptitude: 0, interview: 0, completed: false,
    sections: {
      leetcode: !!lcData,
      github: !!ghData,
      resume: !!resumeEvidence,
      aptitude: aptSubmitted,
      communication: commDone,
    },
    resumeEvidence: resumeEvidence ?? undefined,
    commEvidence: commEvidence ?? undefined,
    aptitudeEvidence: aptEvidence ?? undefined,
  })

  const fetchLC = async () => {
    if (!lcUsername.trim()) return
    setLcState('loading'); setLcError('')
    try { const d = await fetchLeetCode(lcUsername.trim()); setLcData(d); setLcState('success') }
    catch (e) { setLcError((e as Error).message); setLcState('error') }
  }
  const fetchGH = async () => {
    if (!ghUsername.trim()) return
    setGhState('loading'); setGhError('')
    try { const d = await fetchGitHub(ghUsername.trim()); setGhData(d); setGhState('success') }
    catch (e) { setGhError((e as Error).message); setGhState('error') }
  }

  const handleFile = async (file: File) => {
    if (!isResumeFile(file)) {
      setResumeError('Please upload a PDF or DOCX file (.pdf, .docx).'); return
    }
    if (file.size > 5 * 1024 * 1024) { setResumeError('File too large. Max 5MB.'); return }
    setResumeLoading(true); setResumeError('')
    try {
      const evidence = await analyzeResume(file)
      setResumeEvidence(evidence)
    } catch (e) {
      setResumeError(e instanceof ResumeAnalysisError ? e.message : 'Could not analyze file. Try a different PDF or DOCX.')
    }
    finally { setResumeLoading(false) }
  }

  const startAptitude = async () => {
    proctor.resetProctor()
    proctor.startTabWatch()
    const camOk = await proctor.startCamera()
    if (!camOk) return
    setAptCheat(false)
    setAptStarted(true)
  }

  const resetAptitude = () => {
    proctor.resetProctor()
    setAptAnswers({})
    setAptSubmitted(false)
    setAptEvidence(null)
    setAptCheat(false)
    setAptStarted(false)
    setCurrentQ(0)
  }

  const handleAptAnswer = (qId: number, optIdx: number) => {
    setAptAnswers(prev => ({ ...prev, [qId]: optIdx }))
  }

  const submitAptitude = () => {
    const cheat = proctor.isCheatDetected(true)
    proctor.stopTabWatch()
    proctor.stopCamera()

    if (cheat) {
      setAptCheat(true)
      setAptSubmitted(false)
      setAptEvidence(null)
      return
    }

    const result = scoreAptitude(aptAnswers)
    setAptEvidence(result)
    setAptSubmitted(true)
    setAptCheat(false)
  }

  const handleCommComplete = (ev: CommEvidence) => {
    setCommEvidence(ev)
    setCommDone(true)
  }

  const finish = () => {
    const platform: PlatformData = { leetcode: lcData, github: ghData, fetchedAt: new Date().toISOString() }
    const assessment = computeFromEvidence(platform, resumeEvidence, commEvidence, aptEvidence, domain)
    setPlatformData(platform)
    setAssessment(assessment)
    backendAPI.saveAssessment(studentId ?? 1, assessment.dsa, assessment.aptitude, assessment.communication, assessment.resume).catch(() => {})
    setView('app')
  }

  const canContinue: Record<Section, boolean> = {
    platforms: (!mandatory.leetcode || lcData !== null) && (!mandatory.github || ghData !== null),
    resume: resumeEvidence !== null,
    addons: (!mandatory.aptitude || aptSubmitted) && (!mandatory.communication || commDone),
  }

  const q = APTITUDE_QUESTIONS[currentQ]

  const addonsBody = (
    <div className="space-y-4">
      <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          Skill add-ons for {domain}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-2)' }}>
          Aptitude & communication are recommended add-ons — not mandatory unless your role requires them.
          Both use camera anti-cheat: violations void the attempt (retake required, no score penalty).
        </p>
        {recommended.length > 0 && (
          <ul className="space-y-1.5 mt-2">
            {recommended.map(r => (
              <li key={r.key} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-2)' }}>
                {r.mandatory
                  ? <Circle size={10} className="text-red-500 fill-red-500 shrink-0 mt-0.5" />
                  : <Lightbulb size={12} className="text-amber-500 shrink-0 mt-0.5" />}
                <span>
                  <strong style={{ color: 'var(--text)' }}>{r.label}</strong>
                  {r.mandatory ? ' (required for your role)' : ' (recommended)'} — {r.reason}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
        {([
          { id: 'aptitude' as AddonTab, label: 'Aptitude', icon: Brain, done: aptSubmitted, req: mandatory.aptitude },
          { id: 'communication' as AddonTab, label: 'Communication', icon: Mic, done: commDone, req: mandatory.communication },
        ]).map(t => (
          <button key={t.id} onClick={() => setAddonTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: addonTab === t.id ? 'var(--bg-card)' : 'transparent',
              color: addonTab === t.id ? 'var(--text)' : 'var(--text-2)',
              boxShadow: addonTab === t.id ? '0 1px 4px rgba(0,0,0,0.06)' : undefined,
            }}>
            <t.icon size={13} />
            {t.label}
            {t.req && <span className="text-red-500">*</span>}
            {t.done && <CheckCircle2 size={12} className="text-emerald-500" />}
          </button>
        ))}
      </div>

      {addonTab === 'aptitude' && (
        <div className="space-y-4">
          {!aptStarted ? (
            <>
              <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Integrity rules</p>
                <ul className="space-y-1.5">
                  {[
                    'Camera must stay on throughout the test.',
                    'Any tab switch voids your attempt — retake required, no partial score.',
                    '15 questions — navigate freely, submit when done.',
                  ].map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-2)' }}>
                      <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" /> {rule}
                    </li>
                  ))}
                </ul>
              </div>
              {proctor.cameraError && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-xs text-amber-700 bg-amber-50 border border-amber-200">
                  <CameraOff size={13} /> {proctor.cameraError}
                </div>
              )}
              <button onClick={startAptitude} className="btn-primary w-full justify-center py-3 text-sm">
                Start Aptitude Check
              </button>
              {!mandatory.aptitude && aptSubmitted && (
                <p className="text-xs text-center text-emerald-600">✓ Aptitude completed ({aptEvidence?.score}%)</p>
              )}
            </>
          ) : aptCheat ? (
            <div className="text-center p-6 rounded-xl space-y-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <AlertTriangle size={32} className="text-red-500 mx-auto" />
              <p className="font-semibold text-red-700">Attempt voided — retake required</p>
              <p className="text-sm text-red-600">
                {proctor.tabSwitches > 0 && `${proctor.tabSwitches} tab switch${proctor.tabSwitches > 1 ? 'es' : ''} detected. `}
                {proctor.faceWarnings >= 2 && `${proctor.faceWarnings} camera warnings. `}
                No score penalty — attend the test again for a valid result.
              </p>
              <button onClick={resetAptitude} className="btn-primary w-full justify-center py-3 text-sm">
                Retake Aptitude Test
              </button>
            </div>
          ) : aptSubmitted && aptEvidence ? (
            <div className="space-y-4">
              <div className="text-center p-6 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                <p className="text-4xl font-bold mb-1" style={{ color: 'var(--primary)' }}>
                  {aptEvidence.correct}/{aptEvidence.totalQuestions}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>Score: {aptEvidence.score}%</p>
              </div>
              <button onClick={resetAptitude} className="text-xs font-medium hover:underline mx-auto block" style={{ color: 'var(--primary)' }}>
                Retake aptitude check
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {proctor.cameraActive ? (
                  <div className="relative">
                    <video ref={proctor.videoRef} className="w-24 h-16 rounded-lg object-cover" muted playsInline />
                    <canvas ref={proctor.canvasRef} className="hidden" />
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-24 h-16 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-muted)' }}>
                    <CameraOff size={16} style={{ color: 'var(--text-3)' }} />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs font-semibold" style={{ color: proctor.cameraActive ? '#059669' : 'var(--text-3)' }}>
                    {proctor.cameraActive ? (
                      <span className="flex items-center gap-1"><Circle size={8} className="fill-red-500 text-red-500" /> Camera monitoring active</span>
                    ) : 'Camera not available'}
                  </p>
                  {proctor.tabSwitches > 0 && (
                    <p className="text-xs text-red-500">{proctor.tabSwitches} tab switch — attempt will be voided on submit</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {APTITUDE_QUESTIONS.map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full transition-all"
                    style={{ background: aptAnswers[APTITUDE_QUESTIONS[i].id] !== undefined ? 'var(--primary)' : 'var(--border)' }} />
                ))}
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>{q.category}</span>
                <p className="text-sm font-medium mt-2 leading-relaxed" style={{ color: 'var(--text)' }}>{q.question}</p>
              </div>
              <div className="space-y-2">
                {q.options.map((opt, i) => (
                  <button key={i} onClick={() => handleAptAnswer(q.id, i)}
                    className="w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all"
                    style={{
                      border: aptAnswers[q.id] === i ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: aptAnswers[q.id] === i ? 'var(--primary-l)' : 'var(--bg-muted)',
                      color: aptAnswers[q.id] === i ? 'var(--primary)' : 'var(--text)',
                    }}>
                    {String.fromCharCode(65 + i)}. {opt}
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center pt-1">
                <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}
                  className="text-sm font-medium disabled:opacity-30 hover:underline" style={{ color: 'var(--text-2)' }}>
                  ← Prev
                </button>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {currentQ + 1} / {APTITUDE_QUESTIONS.length}
                </span>
                {currentQ < APTITUDE_QUESTIONS.length - 1 ? (
                  <button onClick={() => setCurrentQ(q => q + 1)} disabled={aptAnswers[q.id] === undefined}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-40">
                    Next →
                  </button>
                ) : (
                  <button onClick={submitAptitude}
                    disabled={Object.keys(aptAnswers).length < APTITUDE_QUESTIONS.length}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-40">
                    Submit ({Object.keys(aptAnswers).length}/{APTITUDE_QUESTIONS.length})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {addonTab === 'communication' && (
        <div>
          {commDone && commEvidence ? (
            <div className="text-center p-6 rounded-xl space-y-3" style={{ background: 'var(--bg-muted)' }}>
              <p className="text-3xl font-bold" style={{ color: '#059669' }}>{commEvidence.score}%</p>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>Communication score saved</p>
              <button onClick={() => { setCommDone(false); setCommEvidence(null) }}
                className="text-xs font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                Retake communication check
              </button>
            </div>
          ) : (
            <CommunicationSkillCheck
              proctorRequired
              onComplete={handleCommComplete}
              onSkip={() => { if (!mandatory.communication) setCommDone(false) }}
            />
          )}
        </div>
      )}

      {!mandatory.aptitude && !mandatory.communication && !aptSubmitted && !commDone && (
        <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
          Both add-ons are optional for {domain}. Skip them and finish — you can take them later from Readiness.
        </p>
      )}
    </div>
  )

  const content: Record<Section, { title: string; desc: string; body: React.ReactNode }> = {
    platforms: {
      title: 'Connect Your Platforms',
      desc: mandatory.leetcode || mandatory.github
        ? `Your role requires platform evidence. Connect what's mandatory, skip the rest.`
        : 'Connect LeetCode for DSA score, GitHub for projects score. Both optional — skip and continue.',
      body: (
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Code2 size={16} style={{ color: 'var(--primary)' }} />
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>LeetCode</p>
              {mandatory.leetcode && <span className="text-xs text-red-500 font-semibold">Required</span>}
              {lcState === 'success' && <CheckCircle2 size={15} className="text-emerald-500 ml-auto" />}
            </div>
            <div className="flex gap-2">
              <input placeholder="your-leetcode-username" value={lcUsername}
                onChange={e => { setLcUsername(e.target.value); setLcState('idle'); setLcData(null) }}
                onKeyDown={e => e.key === 'Enter' && fetchLC()}
                className="flex-1 input" />
              <button onClick={lcState === 'success' ? () => { setLcState('idle'); setLcData(null) } : fetchLC}
                disabled={!lcUsername.trim() || lcState === 'loading'}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-40">
                {lcState === 'loading' ? <Loader2 size={14} className="animate-spin" /> :
                 lcState === 'success' ? <><RefreshCcw size={13} /> Refetch</> : 'Fetch'}
              </button>
            </div>
            {lcState === 'error' && <p className="text-xs text-red-500">{lcError}</p>}
            {lcData && (
              <div className="grid grid-cols-4 gap-2">
                <StatPill label="Total"  value={lcData.totalSolved} />
                <StatPill label="Easy"   value={lcData.easySolved} />
                <StatPill label="Medium" value={lcData.mediumSolved} />
                <StatPill label="Hard"   value={lcData.hardSolved} />
              </div>
            )}
          </div>
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch size={16} style={{ color: 'var(--text)' }} />
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>GitHub</p>
              {mandatory.github && <span className="text-xs text-red-500 font-semibold">Required</span>}
              {ghState === 'success' && <CheckCircle2 size={15} className="text-emerald-500 ml-auto" />}
            </div>
            <div className="flex gap-2">
              <input placeholder="your-github-username" value={ghUsername}
                onChange={e => { setGhUsername(e.target.value); setGhState('idle'); setGhData(null) }}
                onKeyDown={e => e.key === 'Enter' && fetchGH()}
                className="flex-1 input" />
              <button onClick={ghState === 'success' ? () => { setGhState('idle'); setGhData(null) } : fetchGH}
                disabled={!ghUsername.trim() || ghState === 'loading'}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-40">
                {ghState === 'loading' ? <Loader2 size={14} className="animate-spin" /> :
                 ghState === 'success' ? <><RefreshCcw size={13} /> Refetch</> : 'Fetch'}
              </button>
            </div>
            {ghState === 'error' && <p className="text-xs text-red-500">{ghError}</p>}
            {ghData && (
              <div className="grid grid-cols-4 gap-2">
                <StatPill label="Repos"  value={ghData.publicRepos} />
                <StatPill label="Stars"  value={ghData.totalStars} />
                <StatPill label="Active" value={`${ghData.recentCommitDays}/30`} />
                <StatPill label="Langs"  value={ghData.topLanguages.length} />
              </div>
            )}
          </div>
        </div>
      ),
    },
    resume: {
      title: 'Upload Your Resume',
      desc: 'Required for all roles. Analyzed against 12 ATS metrics.',
      body: (
        <div className="space-y-4">
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
          {!resumeEvidence ? (
            <button onClick={() => fileInputRef.current?.click()} disabled={resumeLoading}
              className="w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 transition-all hover:border-[var(--primary)]"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
              {resumeLoading
                ? <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
                : <Upload size={32} style={{ color: 'var(--text-3)' }} />}
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  {resumeLoading ? 'Analyzing against ATS metrics...' : 'Click to upload PDF or DOCX'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Max 5 MB · Takes ~3 seconds</p>
              </div>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                <FileText size={20} style={{ color: 'var(--primary)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{resumeEvidence.fileName}</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {resumeEvidence.wordCount} words · ~{resumeEvidence.estimatedPages} page{resumeEvidence.estimatedPages > 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-2xl font-bold" style={{ color: resumeEvidence.rawScore >= 70 ? '#059669' : resumeEvidence.rawScore >= 45 ? '#D97706' : '#DC2626' }}>
                  {resumeEvidence.rawScore}%
                </span>
              </div>
              <button onClick={() => { setResumeEvidence(null); fileInputRef.current?.click() }}
                className="text-xs font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                Upload different resume
              </button>
            </div>
          )}
          {resumeError && <p className="text-xs text-red-500">{resumeError}</p>}
        </div>
      ),
    },
    addons: {
      title: 'Skill Add-ons',
      desc: `Recommended for ${domain}. Only mandatory items marked with * must be completed.`,
      body: addonsBody,
    },
  }

  const { title, desc, body } = content[section]
  const isLast = sIdx === SECTIONS.length - 1

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setView('app')}
            className="flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-2)' }}>
            <Home size={14} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <PrepUpLogo size={28} />
            <span className="font-display font-bold text-base" style={{ color: 'var(--text)' }}>PrepUp</span>
          </div>
          <div className="w-28" />
        </div>

        <div className="text-center mb-5">
          <p className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
            Placement Readiness Assessment
          </p>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            {domain} · Resume required · Add-ons based on your role
          </p>
        </div>

        <div className="flex gap-1.5 mb-6">
          {SECTIONS.map((s, i) => (
            <div key={s} className="flex-1 h-1.5 rounded-full transition-all duration-500"
              style={{ background: i <= sIdx ? 'var(--primary)' : 'var(--border)' }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={section}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}
            className="card p-8">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>
              Step {sIdx + 1} of {SECTIONS.length}
            </p>
            <h2 className="font-display text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>{title}</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>{desc}</p>
            {body}
            <div className="flex gap-3 mt-7">
              {sIdx > 0 && (
                <button onClick={() => setSection(SECTIONS[sIdx - 1] as Section)}
                  className="btn-secondary flex items-center gap-1 px-4 py-3 text-sm">
                  <ChevronLeft size={15} /> Back
                </button>
              )}
              <button
                onClick={isLast ? finish : () => setSection(SECTIONS[sIdx + 1] as Section)}
                disabled={!canContinue[section]}
                className="btn-primary flex-1 justify-center py-3 text-sm disabled:opacity-40">
                {isLast ? 'Calculate My Readiness' : 'Continue'} <ChevronRight size={15} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
