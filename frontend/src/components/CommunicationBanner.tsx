import { motion } from 'framer-motion'
import { Mic, ArrowRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { isAssessmentComplete } from '../engine/intelligence'
import CommunicationSkillCheck from './CommunicationSkillCheck'
import { useState } from 'react'
import type { CommEvidence } from '../types'
import { computeFromEvidence } from '../engine/intelligence'
import { COMM_DISMISSED_KEY } from '../services/storageKeys'

export default function CommunicationBanner() {
  const { assessment, setAssessment, platformData, pushNotification, user } = useApp()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(COMM_DISMISSED_KEY) === '1')
  const domain = user?.domain ?? 'Software Engineering'

  if (!isAssessmentComplete(assessment, domain) || dismissed) return null
  if (assessment?.sections?.communication || assessment?.commEvidence) return null

  const handleComplete = (ev: CommEvidence) => {
    const platform = {
      leetcode: platformData?.leetcode ?? null,
      github: platformData?.github ?? null,
      fetchedAt: platformData?.fetchedAt ?? new Date().toISOString(),
    }
    const updated = computeFromEvidence(
      platform,
      assessment!.resumeEvidence ?? null,
      ev,
      assessment!.aptitudeEvidence ?? null,
      domain,
    )
    setAssessment(updated)
    setExpanded(false)
    pushNotification({
      title: 'Communication score saved',
      message: `Your communication score is ${ev.score}%. Check Preparation for targeted resources.`,
      type: 'success',
    })
  }

  const dismiss = () => {
    localStorage.setItem(COMM_DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', border: '1px solid #CBD5E1' }}>
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <Mic size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Optional: Communication Skill Check</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Facing HR round rejections or low confidence speaking? Take a 2-minute voice assessment.
            We'll analyze your speech and recommend a personalized improvement plan + resources.
          </p>
          {!expanded && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <button onClick={() => setExpanded(true)} className="btn-primary text-xs py-2 px-3">
                Start Skill Check <ArrowRight size={12} />
              </button>
              <button onClick={() => navigate('/preparation')} className="btn-secondary text-xs py-2 px-3">
                View Communication Resources
              </button>
              <button onClick={dismiss} className="text-xs font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                Remind me later
              </button>
            </div>
          )}
        </div>
        <button onClick={dismiss} className="shrink-0 p-1 rounded hover:bg-white/50" style={{ color: 'var(--text-2)' }}>
          <X size={14} />
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <CommunicationSkillCheck
            onComplete={handleComplete}
            onSkip={() => setExpanded(false)}
          />
        </div>
      )}
    </motion.div>
  )
}
