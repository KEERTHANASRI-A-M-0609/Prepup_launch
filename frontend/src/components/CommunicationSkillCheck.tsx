import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import type { CommEvidence } from '../types'
import { useCameraProctor } from '../hooks/useCameraProctor'

const PROMPTS = [
  'Tell me about yourself.',
  'Describe a challenging project you worked on.',
  'Why should we hire you?',
  'What motivates you in your career?',
  'Tell me about a time you solved a difficult problem.',
  'Explain a technical concept you know well to a non-technical person.',
  'Describe a situation where you had to work under pressure.',
  'What are your strengths and how do they apply to this role?',
]

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'right', 'so yeah']

function analyzeTranscript(transcript: string, durationSecs: number): CommEvidence {
  const words = transcript.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const lower = transcript.toLowerCase()

  let fillerCount = 0
  FILLER_WORDS.forEach(fw => {
    const regex = new RegExp(`\\b${fw}\\b`, 'gi')
    const matches = lower.match(regex)
    if (matches) fillerCount += matches.length
  })

  const wordsPerMinute = durationSecs > 0 ? Math.round((wordCount / durationSecs) * 60) : 0
  const fillerRate = wordCount > 0 ? Math.round((fillerCount / wordCount) * 100) : 0
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 5)

  const fluency = wordCount >= 80 ? 85 : wordCount >= 50 ? 65 : wordCount >= 25 ? 40 : 15
  const speakingPace = (wordsPerMinute >= 100 && wordsPerMinute <= 170) ? 90
    : (wordsPerMinute >= 80 && wordsPerMinute <= 200) ? 65 : 40
  const confidence = fillerRate <= 3 ? 90 : fillerRate <= 7 ? 70 : fillerRate <= 15 ? 50 : 30

  const techWords = ['implemented','built','developed','because','therefore','however','result','solution','problem','approach','achieved','led','designed']
  const vocabUsed = techWords.filter(w => lower.includes(w)).length
  const vocabulary = Math.min(vocabUsed * 12, 100)
  const grammar = sentences.length >= 4 ? 80 : sentences.length >= 2 ? 60 : 35
  const sentenceStructure = sentences.length >= 5 ? 85 : sentences.length >= 3 ? 65 : 40
  const professionalTone = (lower.includes('team') || lower.includes('project') || lower.includes('learned')) ? 75 : 50

  if (wordCount < 25) {
    return {
      method: 'voice', durationSecs, wordCount, fillerCount, wordsPerMinute, fillerRate, transcript,
      score: Math.min(Math.max(Math.round(wordCount * 0.8), 0), 15),
      fluency, confidence: 20, grammar: 20, vocabulary: 10, speakingPace, sentenceStructure: 20, professionalTone: 30,
      strengths: [], weaknesses: ['Response too short — speak for at least 60 seconds'],
      recommendations: ['Practice answering "Tell me about yourself" for 90 seconds without stopping'],
    }
  }

  let score = 0
  if (wordCount >= 80) score += 20
  else if (wordCount >= 50) score += 15
  else score += 8

  if (wordsPerMinute >= 100 && wordsPerMinute <= 170) score += 25
  else if (wordsPerMinute >= 80 && wordsPerMinute <= 200) score += 15
  else if (wordsPerMinute > 0) score += 5

  if (fillerRate === 0) score += 25
  else if (fillerRate <= 3) score += 18
  else if (fillerRate <= 7) score += 10
  else if (fillerRate <= 15) score += 5

  score += Math.min(vocabUsed * 3, 15)
  if (sentences.length >= 5) score += 15
  else if (sentences.length >= 3) score += 8

  const strengths: string[] = []
  const weaknesses: string[] = []
  const recommendations: string[] = []

  if (speakingPace >= 80) strengths.push('Good speaking pace')
  else weaknesses.push('Speaking pace needs adjustment')
  if (fillerRate <= 5) strengths.push('Low filler word usage')
  else { weaknesses.push(`High filler rate (${fillerRate}%)`); recommendations.push('Pause instead of using "um/like" — practice with Speeko app') }
  if (vocabulary >= 60) strengths.push('Professional vocabulary')
  else { weaknesses.push('Limited professional vocabulary'); recommendations.push('Use STAR format with action verbs: led, built, optimized') }
  if (wordCount >= 80) strengths.push('Detailed response')
  else { weaknesses.push('Answer too brief'); recommendations.push('Aim for 80+ words with specific examples') }
  if (sentenceStructure >= 65) strengths.push('Clear sentence structure')
  else recommendations.push('Break long thoughts into shorter, complete sentences')

  return {
    method: 'voice', durationSecs, wordCount, fillerCount, wordsPerMinute, fillerRate, transcript,
    score: Math.min(Math.max(score, 5), 100),
    fluency, confidence, grammar, vocabulary, speakingPace, sentenceStructure, professionalTone,
    strengths, weaknesses, recommendations,
  }
}

interface Props {
  onComplete: (evidence: CommEvidence) => void
  onSkip: () => void
  proctorRequired?: boolean
}

export default function CommunicationSkillCheck({ onComplete, onSkip, proctorRequired = true }: Props) {
  const [promptIdx] = useState(() => Math.floor(Math.random() * PROMPTS.length))
  const [phase, setPhase] = useState<'intro' | 'recording' | 'done' | 'cheat'>('intro')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<CommEvidence | null>(null)
  const [cheatReason, setCheatReason] = useState('')
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const transcriptRef = useRef('')
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const proctor = useCameraProctor()

  const startRecording = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setError('Speech recognition not supported. Please use Chrome or Edge.'); return }

    if (proctorRequired) {
      proctor.resetProctor()
      proctor.startTabWatch()
      const camOk = await proctor.startCamera()
      if (!camOk) {
        setError('Camera is required for the proctored communication check.')
        return
      }
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let final = ''
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim = e.results[i][0].transcript
      }
      const combined = (final + interim).trim()
      transcriptRef.current = combined
      setTranscript(combined)
    }
    recognition.onerror = () => setError('Microphone access denied or unavailable.')
    recognition.start()
    recognitionRef.current = recognition
    startTimeRef.current = Date.now()
    transcriptRef.current = ''
    setPhase('recording')
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000)
  }

  const stopRecording = async () => {
    recognitionRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)

    const cheat = proctorRequired && proctor.isCheatDetected(true)
    proctor.stopTabWatch()
    proctor.stopCamera()

    if (cheat) {
      const reasons: string[] = []
      if (proctor.tabSwitches > 0) reasons.push(`${proctor.tabSwitches} tab switch${proctor.tabSwitches > 1 ? 'es' : ''}`)
      if (proctor.faceWarnings >= 2) reasons.push('camera integrity warnings')
      if (!proctor.cameraActive) reasons.push('camera was off')
      setCheatReason(reasons.join(', ') || 'proctoring violation')
      setPhase('cheat')
      return
    }

    const dur = Math.floor((Date.now() - startTimeRef.current) / 1000)
    let evidence = analyzeTranscript(transcriptRef.current, dur)
    try {
      const { backendAPI } = await import('../services/api')
      const ml = await backendAPI.aiCommunicationScore(transcriptRef.current, dur)
      evidence = {
        ...evidence,
        score: ml.fluency,
        fluency: ml.fluency,
        confidence: ml.confidence,
        wordsPerMinute: ml.wpm,
        fillerCount: ml.fillerCount,
        wordCount: ml.wordCount,
        strengths: ml.feedback.slice(0, 2),
        recommendations: ml.feedback,
        weaknesses: ml.fillerCount > 6 ? ['High filler word usage detected by ML model'] : evidence.weaknesses,
      }
    } catch { /* keep heuristic */ }
    setResult(evidence)
    setPhase('done')
  }

  const retakeAfterCheat = () => {
    proctor.resetProctor()
    setPhase('intro')
    setTranscript('')
    transcriptRef.current = ''
    setElapsed(0)
    setCheatReason('')
    setError('')
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="space-y-5">
      {proctorRequired && (
        <div className="flex items-start gap-2 p-3 rounded-lg text-sm"
          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <div style={{ color: '#1E40AF' }}>
            <strong>Proctored skill check.</strong> Camera stays on while you speak. Tab switches invalidate the attempt — retake required.
          </div>
        </div>
      )}

      {phase === 'intro' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Your prompt</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>"{PROMPTS[promptIdx]}"</p>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>
            Speak for 1–2 minutes (aim for 60+ seconds). You need at least 25 words for a valid score.
            {proctorRequired ? ' Camera monitoring is active during recording.' : ' Practice mode — speak naturally in a quiet room.'}
          </p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={startRecording} className="btn-primary flex-1 justify-center py-3 text-sm flex items-center gap-2">
              <Mic size={15} /> Start Speaking
            </button>
            <button onClick={onSkip} className="btn-secondary px-4 py-3 text-sm">Skip</button>
          </div>
        </div>
      )}

      {phase === 'recording' && (
        <div className="space-y-6 py-4">
          {/* Voice interface — centered */}
          <div className="flex flex-col items-center text-center space-y-6 py-8">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: 'var(--danger-soft)', border: '2px solid var(--danger)' }}
            >
              <Mic size={36} style={{ color: 'var(--danger)' }} />
            </motion.div>

            {/* Waveform */}
            <div className="flex items-end justify-center gap-1 h-12">
              {Array.from({ length: 24 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full"
                  style={{ background: 'var(--accent)', originY: 1 }}
                  animate={{ height: [8, 12 + Math.random() * 28, 8] }}
                  transition={{ repeat: Infinity, duration: 0.8 + Math.random() * 0.4, delay: i * 0.03 }}
                />
              ))}
            </div>

            <div>
              <p className="font-mono text-3xl font-bold" style={{ color: 'var(--text)' }}>{fmt(elapsed)}</p>
              <p className="text-sm mt-1" style={{ color: wordCount >= 25 ? 'var(--success)' : 'var(--text-3)' }}>
                {wordCount} words {wordCount < 25 ? `(need ${25 - wordCount} more for a valid score)` : '— ready to analyze'}
              </p>
            </div>
          </div>

          {proctor.cameraActive && (
            <div className="flex justify-center">
              <video ref={proctor.videoRef} className="w-32 h-20 rounded-2xl object-cover" muted playsInline />
              <canvas ref={proctor.canvasRef} className="hidden" />
            </div>
          )}

          {transcript && (
            <div
              className="p-5 rounded-2xl text-sm max-h-40 overflow-y-auto leading-relaxed"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            >
              {transcript}
            </div>
          )}

          <button
            onClick={stopRecording}
            disabled={wordCount < 10}
            className="btn-primary w-full justify-center py-4 text-base disabled:opacity-50"
            style={{ background: wordCount >= 25 ? 'var(--danger)' : 'var(--warning)' }}
          >
            <MicOff size={18} /> {wordCount >= 25 ? 'Stop & Analyze' : 'Keep speaking…'}
          </button>
        </div>
      )}

      {phase === 'cheat' && (
        <div className="space-y-4 text-center p-6 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertTriangle size={32} className="text-red-500 mx-auto" />
          <p className="font-semibold text-red-700">Attempt voided — integrity violation</p>
          <p className="text-sm text-red-600">
            {cheatReason ? `Detected: ${cheatReason}.` : 'Proctoring rules were broken.'} No score was recorded. Retake the check to get a valid score.
          </p>
          <button onClick={retakeAfterCheat} className="btn-primary w-full justify-center py-3 text-sm">
            Retake Communication Check
          </button>
        </div>
      )}

      {phase === 'done' && result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="text-center p-6 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
            <p className="text-4xl font-bold mb-1" style={{
              color: result.score >= 70 ? '#059669' : result.score >= 50 ? '#D97706' : '#DC2626'
            }}>
              {result.score}%
            </p>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Communication Score</p>
            {result.wordCount < 25 && (
              <p className="text-xs mt-2 text-amber-600">Too few words — speak for at least 60 seconds and retry for an accurate score.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Fluency', value: result.fluency ?? '—' },
              { label: 'Confidence', value: result.confidence ?? '—' },
              { label: 'Pace (WPM)', value: result.wordsPerMinute, ideal: '110-160' },
            ].map(m => (
              <div key={m.label} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{m.value}{typeof m.value === 'number' && m.label !== 'Pace (WPM)' ? '%' : ''}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{m.label}</p>
              </div>
            ))}
          </div>

          {(result.strengths?.length || result.weaknesses?.length) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.strengths && result.strengths.length > 0 && (
                <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--accent-l)' }}>
                  <p className="font-semibold mb-1" style={{ color: '#059669' }}>Strengths</p>
                  {result.strengths.map((s, i) => <p key={i} style={{ color: 'var(--text-2)' }}>• {s}</p>)}
                </div>
              )}
              {result.weaknesses && result.weaknesses.length > 0 && (
                <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--warning-l)' }}>
                  <p className="font-semibold mb-1" style={{ color: 'var(--warning)' }}>Weaknesses</p>
                  {result.weaknesses.map((s, i) => <p key={i} style={{ color: 'var(--text-2)' }}>• {s}</p>)}
                </div>
              )}
            </div>
          ) : null}

          {result.recommendations && result.recommendations.length > 0 && (
            <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--bg-muted)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Recommendations</p>
              {result.recommendations.map((r, i) => <p key={i} style={{ color: 'var(--text-2)' }}>• {r}</p>)}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => onComplete(result)}
              disabled={result.wordCount < 25}
              className="btn-primary flex-1 justify-center py-3 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 size={14} /> {result.wordCount >= 25 ? 'Save Score & Continue' : 'Speak longer to save'}
            </button>
            <button onClick={retakeAfterCheat}
              className="btn-secondary px-4 py-3 text-sm">Retry</button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
