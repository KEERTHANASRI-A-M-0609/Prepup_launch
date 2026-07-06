import { motion } from 'framer-motion'

import { Target, ArrowRight, X } from 'lucide-react'

import type { PriorityRecommendation } from '../../engine/assessmentEngine'



interface Props {

  recommendation: PriorityRecommendation

  onTake: () => void

  onSkip: () => void

}



export default function PriorityAssessmentPanel({ recommendation, onTake, onSkip }: Props) {

  return (

    <motion.div

      layout

      initial={{ opacity: 0, y: -12, scale: 0.98 }}

      animate={{ opacity: 1, y: 0, scale: 1 }}

      exit={{ opacity: 0, y: -8, scale: 0.98 }}

      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}

      className="p-6 relative overflow-hidden rounded-xl"

      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}

    >

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">

        <div className="flex items-start gap-3 flex-1">

          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"

            style={{ background: 'var(--accent-soft)' }}>

            <Target size={20} style={{ color: 'var(--accent)' }} />

          </div>

          <div>

            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--accent)' }}>

              Recommended next assessment

            </p>

            <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--text)' }}>

              {recommendation.title}

            </h3>

            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-2)' }}>

              <strong style={{ color: 'var(--text)' }}>Reason: </strong>{recommendation.reason}

            </p>

            <p className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>

              <strong style={{ color: 'var(--success)' }}>Potential impact: </strong>

              +{recommendation.potentialImpact} readiness accuracy

            </p>

          </div>

        </div>



        <div className="flex gap-2 shrink-0">

          <button onClick={onTake}

            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"

            style={{ background: 'var(--accent)' }}>

            Take assessment <ArrowRight size={14} />

          </button>

          <button onClick={onSkip}

            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium"

            style={{ background: 'var(--bg-muted)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>

            <X size={14} /> Skip for now

          </button>

        </div>

      </div>

    </motion.div>

  )

}


