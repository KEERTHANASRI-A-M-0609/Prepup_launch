import { useEffect, useState } from 'react'
import { Brain, Sparkles } from 'lucide-react'
import { backendAPI } from '../../services/api'

export default function AIEngineStrip() {
  const [status, setStatus] = useState<{
    ml_models: string[]
    llm_available: boolean
    llm_provider: string | null
  } | null>(null)

  useEffect(() => {
    backendAPI.aiStatus().then(s => setStatus(s)).catch(() => setStatus(null))
  }, [])

  if (!status) return null

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl text-xs"
      style={{ background: 'linear-gradient(135deg, rgba(30,86,192,0.08), rgba(13,148,136,0.08))', border: '1px solid var(--border)' }}
    >
      <Sparkles size={14} style={{ color: 'var(--accent)' }} />
      <span className="font-semibold" style={{ color: 'var(--text)' }}>AI/ML Engine</span>
      <span className="dash-label">·</span>
      <span className="dash-subtext">scikit-learn · TF-IDF · Random Forest</span>
      {status.llm_available ? (
        <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
          {status.llm_provider} active
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--text-3)' }}>
          ML-only (add GEMINI_API_KEY for LLM)
        </span>
      )}
      <Brain size={13} className="ml-auto dash-label" />
    </div>
  )
}
