import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Brain, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { AptitudeEvidence } from '../../../types'
import { useCameraProctor } from '../../../hooks/useCameraProctor'
import {
  buildAdaptiveSession, scoreAdaptiveAptitude,
  getAptitudeRecommendations, getAptitudeWeakAreas,
} from '../../../services/adaptiveAptitude'
import type { AptQuestion } from '../../../services/aptitudeQuestions'

interface Props {
  onComplete: (evidence: AptitudeEvidence) => void
  onClose: () => void
  /** Strict proctoring only for onboarding; Career Health uses practice mode. */
  proctorRequired?: boolean
}

export default function AptitudeModule({ onComplete, onClose, proctorRequired = false }: Props) {
  const [session] = useState(() => buildAdaptiveSession())
  const [started, setStarted] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [evidence, setEvidence] = useState<AptitudeEvidence | null>(null)
  const [cheat, setCheat] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [saving, setSaving] = useState(false)
  const proctor = useCameraProctor()

  const q: AptQuestion = session[currentQ]

  const start = async () => {
    setCameraError('')
    if (proctorRequired) {
      proctor.resetProctor()
      proctor.startTabWatch()
      const ok = await proctor.startCamera()
      if (!ok) {
        setCameraError('Camera access is required for the proctored aptitude test. Allow camera in browser settings and try again.')
        return
      }
    }
    setStarted(true)
  }

  const submit = () => {
    if (proctorRequired && proctor.isCheatDetected(true)) {
      proctor.stopTabWatch()
      proctor.stopCamera()
      setCheat(true)
      setStarted(false)
      return
    }
    if (proctorRequired) {
      proctor.stopTabWatch()
      proctor.stopCamera()
    }
    const ev = scoreAdaptiveAptitude(session, answers)
    setEvidence(ev)
    setSubmitted(true)
    setSaving(true)
    setTimeout(() => onComplete(ev), 1800)
  }

  const reset = () => {
    proctor.resetProctor()
    setCheat(false)
    setStarted(false)
    setSubmitted(false)
    setAnswers({})
    setCurrentQ(0)
    setEvidence(null)
    setSaving(false)
    setCameraError('')
  }

  const weakAreas = evidence ? getAptitudeWeakAreas(evidence) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={18} style={{ color: '#6366f1' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Adaptive Aptitude Assessment</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)]"><X size={16} /></button>
      </div>

      {!started && !submitted && !cheat && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            15 adaptive questions across Quant, Logical Reasoning & Verbal. Your score updates readiness immediately after submit.
            {proctorRequired ? ' Camera proctoring is active.' : ' Practice mode — no proctoring.'}
          </p>
          {cameraError && (
            <p className="text-sm text-red-600 p-3 rounded-lg" style={{ background: '#FEF2F2' }}>{cameraError}</p>
          )}
          <button onClick={start} className="btn-primary w-full py-3 text-sm">Start Adaptive Test</button>
        </div>
      )}

      {cheat && (
        <div className="text-center p-6 rounded-xl space-y-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertTriangle size={28} className="text-red-500 mx-auto" />
          <p className="font-semibold text-red-700">Attempt voided — retake required</p>
          <p className="text-sm text-red-600">
            {proctor.tabSwitches > 0 && `${proctor.tabSwitches} tab switch(es). `}
            {proctor.faceWarnings >= 2 && 'Camera integrity warnings. '}
            Stay on this tab and keep your face visible.
          </p>
          <button onClick={reset} className="btn-primary w-full py-3 text-sm">Retake</button>
        </div>
      )}

      {started && !submitted && q && (
        <div className="space-y-8 py-4">
          {proctorRequired && (
            <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-3)' }}>
              <span>Tab switches: {proctor.tabSwitches}</span>
              <span>Camera: {proctor.cameraActive ? 'on' : 'off'}</span>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
              <span>Question {currentQ + 1} of {session.length}</span>
              <span>{Math.round(((currentQ + 1) / session.length) * 100)}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${((currentQ + 1) / session.length) * 100}%` }}
                style={{ background: 'var(--accent)' }}
              />
            </div>
          </div>

          <div className="text-center space-y-6 py-6">
            <span className="badge badge-blue">{q.category}</span>
            <p className="text-xl font-display font-bold leading-snug max-w-lg mx-auto" style={{ color: 'var(--text)' }}>
              {q.question}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-3">
            {q.options.map((opt, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setAnswers(a => ({ ...a, [q.id]: i }))}
                className="w-full text-left px-5 py-4 text-sm font-medium transition-all"
                style={{
                  borderRadius: 'var(--radius)',
                  border: answers[q.id] === i ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: answers[q.id] === i ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  color: 'var(--text)',
                }}
              >
                {opt}
              </motion.button>
            ))}
          </div>

          <div className="flex justify-between max-w-md mx-auto pt-4">
            <button onClick={() => setCurrentQ(c => Math.max(0, c - 1))} disabled={currentQ === 0}
              className="btn-ghost disabled:opacity-30">← Previous</button>
            {currentQ < session.length - 1 ? (
              <button onClick={() => setCurrentQ(c => c + 1)} disabled={answers[q.id] === undefined}
                className="btn-accent disabled:opacity-40">Continue →</button>
            ) : (
              <button onClick={submit} disabled={Object.keys(answers).length < session.length}
                className="btn-accent disabled:opacity-40">Submit & Get Score</button>
            )}
          </div>
        </div>
      )}

      {submitted && evidence && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="text-center p-6 glass-card">
            <p className="text-4xl font-bold" style={{ color: evidence.score >= 60 ? '#059669' : evidence.score >= 40 ? '#D97706' : '#6366f1' }}>
              {evidence.score}%
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
              {evidence.correct}/{evidence.totalQuestions} correct · Aptitude score saved
            </p>
            {saving && (
              <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--accent)' }}>Updating your readiness profile…</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['quant', 'logical', 'verbal'] as const).map(cat => (
              <div key={cat} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{evidence.categoryScores[cat]}%</p>
                <p className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>{cat}</p>
              </div>
            ))}
          </div>
          {weakAreas.length > 0 && evidence.score < 70 && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-muted)', color: 'var(--text-2)' }}>
              <strong>Focus areas:</strong> {weakAreas.join(', ')} — see Resources for targeted practice.
            </div>
          )}
          <div className="space-y-1">
            {getAptitudeRecommendations(evidence).slice(0, 3).map((r, i) => (
              <p key={i} className="text-xs" style={{ color: 'var(--text-2)' }}>• {r}</p>
            ))}
          </div>
          {!saving && (
            <button onClick={() => onComplete(evidence)} className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
              <CheckCircle2 size={14} /> Continue
            </button>
          )}
        </motion.div>
      )}
    </div>
  )
}
