import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Mic, MicOff, CheckCircle2, MessageSquare } from 'lucide-react'
import type { MockInterviewSession } from '../../../types'

const TECH_QUESTIONS = [
  'Explain how you would design a URL shortener.',
  'What is the time complexity of binary search? When would you use it?',
  'Describe a challenging bug you fixed recently.',
]
const BEHAVIORAL = [
  'Tell me about a time you disagreed with a teammate.',
  'Describe a project where you took ownership end-to-end.',
  'Why do you want to join our company?',
]
const FOLLOW_UPS = [
  'Can you walk me through your approach step by step?',
  'What trade-offs did you consider?',
  'How would you scale this solution?',
]

interface Props {
  onComplete: (session: MockInterviewSession) => void
  onClose: () => void
}

export default function MockInterviewModule({ onComplete, onClose }: Props) {
  const [phase, setPhase] = useState<'setup' | 'interview' | 'done'>('setup')
  const [type, setType] = useState<'technical' | 'behavioral' | 'mixed'>('mixed')
  const [qIdx, setQIdx] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [allTranscripts, setAllTranscripts] = useState<string[]>([])
  const [questions, setQuestions] = useState<string[]>([])
  const [recording, setRecording] = useState(false)
  const [result, setResult] = useState<MockInterviewSession | null>(null)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const transcriptRef = useRef('')

  const buildQuestions = (t: typeof type) => {
    if (t === 'technical') return [...TECH_QUESTIONS, FOLLOW_UPS[0]]
    if (t === 'behavioral') return [...BEHAVIORAL, FOLLOW_UPS[1]]
    return [TECH_QUESTIONS[0], BEHAVIORAL[0], FOLLOW_UPS[0], FOLLOW_UPS[2]]
  }

  const start = () => {
    const qs = buildQuestions(type)
    setQuestions(qs)
    setPhase('interview')
    setQIdx(0)
    setAllTranscripts([])
  }

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    let final = ''
    rec.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
      }
      transcriptRef.current = final.trim()
      setTranscript(final.trim())
    }
    rec.start()
    recognitionRef.current = rec
    setRecording(true)
    transcriptRef.current = ''
    setTranscript('')
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setRecording(false)
  }

  const nextQuestion = () => {
    const answer = transcriptRef.current
    const updated = [...allTranscripts, answer]
    setAllTranscripts(updated)
    if (qIdx >= questions.length - 1) {
      finishInterview(updated, questions)
    } else {
      setQIdx(i => i + 1)
      setTranscript('')
      transcriptRef.current = ''
    }
  }

  const finishInterview = async (answers: string[], qs: string[]) => {
    const fullTranscript = answers.join('\n\n')
    const wordCount = fullTranscript.split(/\s+/).filter(Boolean).length
    const techWords = ['algorithm', 'complexity', 'design', 'implement', 'optimize', 'database', 'api']
    const techUsed = techWords.filter(w => fullTranscript.toLowerCase().includes(w)).length

    let problemSolving = Math.min(Math.round((wordCount / 3) + techUsed * 8), 100)
    let communication = Math.min(Math.round(wordCount / 2), 100)
    let technicalDepth = Math.min(techUsed * 15 + (type !== 'behavioral' ? 30 : 10), 100)
    let confidence = Math.min(Math.round(answers.filter(a => a.split(/\s+/).length > 30).length * 25), 100)
    let score = Math.round((problemSolving + communication + technicalDepth + confidence) / 4)
    let feedback: string[] = []

    try {
      const { backendAPI } = await import('../../../services/api')
      const ml = await backendAPI.aiInterviewScore(fullTranscript, type, qs)
      score = ml.score
      problemSolving = ml.problemSolving
      communication = ml.communication
      technicalDepth = ml.technicalDepth
      confidence = ml.confidence
      feedback = [
        ...(ml.feedback || []),
        ...(ml.improvements?.map(i => `[AI] ${i}`) || []),
      ]
    } catch {
      if (communication < 60) feedback.push('Expand answers with STAR format — Situation, Task, Action, Result')
      if (technicalDepth < 50) feedback.push('Use more technical vocabulary and mention trade-offs')
      if (confidence < 50) feedback.push('Aim for 60+ words per answer — practice speaking without fillers')
      if (feedback.length === 0) feedback.push('Strong interview performance — schedule a harder mock next')
    }

    const session: MockInterviewSession = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      type,
      score,
      problemSolving,
      communication,
      technicalDepth,
      confidence,
      feedback,
      questions: qs,
      transcript: fullTranscript,
    }
    setResult(session)
    setPhase('done')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} style={{ color: '#10b981' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Mock Interview</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)]"><X size={16} /></button>
      </div>

      {phase === 'setup' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            AI interviewer asks technical, behavioral, and follow-up questions. Speak your answers — evaluated on problem solving, communication, depth & confidence.
          </p>
          <div className="flex gap-2">
            {(['technical', 'behavioral', 'mixed'] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all"
                style={{
                  background: type === t ? '#10b981' : 'var(--bg-muted)',
                  color: type === t ? 'white' : 'var(--text-2)',
                  border: '1px solid var(--border)',
                }}>{t}</button>
            ))}
          </div>
          <button onClick={start} className="btn-primary w-full py-3 text-sm">Start Mock Interview</button>
        </div>
      )}

      {phase === 'interview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[420px] rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {/* Interviewer side */}
          <div className="p-8 flex flex-col justify-between" style={{ background: 'var(--bg-invert)', color: 'var(--bg-elevated)' }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-4">AI Interviewer</p>
              <p className="text-xs mb-6 opacity-50">Question {qIdx + 1} / {questions.length}</p>
              <p className="text-xl font-display font-bold leading-relaxed">{questions[qIdx]}</p>
            </div>
            <div className="flex items-center gap-3 opacity-70">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <MessageSquare size={18} />
              </div>
              <span className="text-sm">Listening for your response...</span>
            </div>
          </div>

          {/* Candidate side */}
          <div className="p-8 flex flex-col" style={{ background: 'var(--bg-elevated)' }}>
            <p className="text-label mb-4">Your Response</p>
            <div className="flex-1 flex flex-col items-center justify-center py-6">
              <motion.div
                animate={recording ? { scale: [1, 1.08, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{
                  background: recording ? 'var(--danger-soft)' : 'var(--accent-soft)',
                  border: `2px solid ${recording ? 'var(--danger)' : 'var(--accent)'}`,
                }}
              >
                {recording ? <Mic size={28} style={{ color: 'var(--danger)' }} /> : <MicOff size={28} style={{ color: 'var(--accent)' }} />}
              </motion.div>
              {transcript ? (
                <div className="w-full p-4 rounded-xl text-sm max-h-32 overflow-y-auto text-center" style={{ background: 'var(--bg-muted)', color: 'var(--text-2)' }}>
                  {transcript}
                </div>
              ) : (
                <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>Tap record and speak your answer</p>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              {!recording ? (
                <button onClick={startRecording} className="btn-accent flex-1 justify-center py-3">
                  <Mic size={16} /> Record Answer
                </button>
              ) : (
                <button onClick={stopRecording} className="flex-1 justify-center py-3 btn-secondary">
                  <MicOff size={16} /> Stop
                </button>
              )}
              <button onClick={nextQuestion} disabled={recording} className="btn-primary disabled:opacity-40">
                {qIdx >= questions.length - 1 ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="text-center p-5 glass-card">
            <p className="text-4xl font-bold" style={{ color: '#10b981' }}>{result.score}%</p>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Interview Readiness Score</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { l: 'Problem Solving', v: result.problemSolving },
              { l: 'Communication', v: result.communication },
              { l: 'Technical Depth', v: result.technicalDepth },
              { l: 'Confidence', v: result.confidence },
            ].map(s => (
              <div key={s.l} className="p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{s.l}</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{s.v}%</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-3)' }}>Feedback</p>
            {result.feedback.map((f, i) => (
              <p key={i} className="text-xs mb-1" style={{ color: 'var(--text-2)' }}>• {f}</p>
            ))}
          </div>
          <button onClick={() => onComplete(result)} className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
            <CheckCircle2 size={14} /> Save Interview Report
          </button>
        </motion.div>
      )}
    </div>
  )
}
