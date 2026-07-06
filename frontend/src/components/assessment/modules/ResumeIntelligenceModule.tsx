import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, FileText, Upload, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { analyzeResume } from '../../../services/resumeAnalyzer'
import type { ResumeEvidence } from '../../../types'

interface Props {
  targetDomain: string
  onComplete: (evidence: ResumeEvidence, score: number) => void
  onClose: () => void
}

export default function ResumeIntelligenceModule({ targetDomain, onComplete, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [evidence, setEvidence] = useState<ResumeEvidence | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
      setError('Upload PDF, DOC, DOCX, or TXT')
      return
    }
    setLoading(true)
    setError('')
    try {
      const ev = await analyzeResume(file, targetDomain)
      setEvidence(ev)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  const hasConflict = (evidence?.roleConflicts?.length ?? 0) > 0
  const scoreColor = hasConflict ? '#DC2626' : evidence && evidence.rawScore >= 70 ? '#059669' : '#1E56C0'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={18} style={{ color: '#1E56C0' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Resume Intelligence</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)]"><X size={16} /></button>
      </div>

      {!evidence ? (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Upload your resume — scored for <strong>{targetDomain}</strong> role fit, not just formatting.
            ATS structure, quantified impact, and keyword alignment are all checked.
          </p>
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button onClick={() => inputRef.current?.click()} disabled={loading}
            className="w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-all hover:border-[#1E56C0]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            {loading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
            <span className="text-sm font-medium">{loading ? 'Analyzing role fit…' : 'Drop resume or click to upload'}</span>
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="text-center p-5 rounded-xl border" style={{ borderColor: hasConflict ? '#FECACA' : 'var(--border)', background: hasConflict ? '#FEF2F2' : 'var(--bg-muted)' }}>
            <p className="text-4xl font-bold" style={{ color: scoreColor }}>{evidence.rawScore}%</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Role-fit score for {targetDomain}</p>
            <p className="text-xs mt-1 text-slate-500">{evidence.fileName}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
              <p style={{ color: 'var(--text-3)' }}>Structure</p>
              <p className="font-bold text-sm">{evidence.structuralScore ?? '—'}%</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
              <p style={{ color: 'var(--text-3)' }}>Role match</p>
              <p className="font-bold text-sm">{evidence.roleAlignment ?? '—'}%</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
              <p style={{ color: 'var(--text-3)' }}>Detected</p>
              <p className="font-bold text-sm truncate" title={evidence.detectedFocus}>{evidence.detectedFocus?.split(' ')[0] ?? '—'}</p>
            </div>
          </div>

          {hasConflict && (
            <div className="p-3 rounded-lg text-xs space-y-1" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <p className="font-bold text-red-700 flex items-center gap-1"><AlertTriangle size={14} /> Role mismatch</p>
              {evidence.roleConflicts?.map(c => (
                <p key={c} className="text-red-600">{c}</p>
              ))}
              <p className="text-red-600 mt-1">Tailor your resume for {targetDomain} before relying on this score.</p>
            </div>
          )}

          {(evidence.roleWarnings?.length ?? 0) > 0 && !hasConflict && (
            <div className="p-3 rounded-lg text-xs space-y-1 bg-amber-50 border border-amber-200">
              {evidence.roleWarnings?.map(w => <p key={w} className="text-amber-800">{w}</p>)}
            </div>
          )}

          {evidence.aiSummary && (
            <div className="p-3 rounded-lg text-xs space-y-2" style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)' }}>
              <p className="font-bold text-xs uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                ML + NLP Resume Match {evidence.mlSimilarityPct != null ? `(${evidence.mlSimilarityPct}%)` : ''}
              </p>
              <p style={{ color: 'var(--text-2)' }}>{evidence.aiSummary.replace(/\*\*/g, '')}</p>
              {evidence.aiTips?.map(tip => (
                <p key={tip} style={{ color: 'var(--text-2)' }}>• {tip}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { l: 'Words', v: evidence.wordCount },
              { l: 'Quantified bullets', v: evidence.quantifiedCount },
              { l: 'Action verbs', v: evidence.actionVerbCount },
              { l: 'Pages', v: evidence.estimatedPages },
            ].map(s => (
              <div key={s.l} className="p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                <p style={{ color: 'var(--text-3)' }}>{s.l}</p>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{s.v}</p>
              </div>
            ))}
          </div>
          <button onClick={() => onComplete(evidence, evidence.rawScore)}
            className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
            <CheckCircle2 size={14} /> Save & Update Readiness
          </button>
        </motion.div>
      )}
    </div>
  )
}
