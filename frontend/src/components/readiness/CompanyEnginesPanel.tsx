import type { Assessment, Application, PlatformData } from '../types'
import { motion } from 'framer-motion'
import { Target, TrendingUp, Building2 } from 'lucide-react'
import {
  computeAllCompanyReadiness,
  computeOfferProbabilityForCompany,
  buildWeeklyStrategy,
} from '../../engine/companyReadinessEngine'
import { computeReadinessConfidence } from '../../engine/assessmentEngine'

type Props = {
  assessment: Assessment | null
  platformData: PlatformData | null
  applications: Application[]
  targetCompanies: string[]
  domain: string
}

export default function CompanyEnginesPanel({ assessment, platformData, applications, targetCompanies, domain }: Props) {
  const conf = computeReadinessConfidence(assessment, platformData)
  const companies = targetCompanies.length > 0 ? targetCompanies.slice(0, 6) : ['Google', 'Amazon', 'TCS']
  const readiness = computeAllCompanyReadiness(assessment, platformData, companies, domain)
  const strategy = buildWeeklyStrategy(assessment, domain)

  if (conf.measuredSections === 0) {
    return (
      <div className="glass-card p-6 text-sm" style={{ color: 'var(--text-2)' }}>
        Complete Career Health assessments to unlock company readiness and offer probability engines.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} style={{ color: 'var(--accent)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Personalized Placement Strategy</h3>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>This week — focus areas from your gaps:</p>
        <ol className="space-y-1.5 mb-4">
          {strategy.thisWeek.map((item, i) => (
            <li key={item} className="text-sm flex gap-2" style={{ color: 'var(--text)' }}>
              <span className="font-bold text-indigo-600">{i + 1}.</span> {item}
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
          <TrendingUp size={16} className="text-emerald-600 shrink-0" />
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Expected readiness: <strong style={{ color: 'var(--text)' }}>{strategy.currentReadiness}%</strong>
            {' → '}
            <strong className="text-emerald-600">{strategy.projectedReadiness}%</strong> if you complete this week&apos;s focus
          </p>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} style={{ color: 'var(--accent)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Company Readiness & Offer Probability</h3>
        </div>
        <div className="space-y-4">
          {readiness.map(r => {
            const offer = computeOfferProbabilityForCompany(assessment, applications, r.company)
            return (
              <div key={r.company} className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="font-semibold" style={{ color: 'var(--text)' }}>{r.company}</p>
                  <div className="flex gap-3 text-sm">
                    <span>Readiness: <strong className="text-indigo-600">{r.readinessPct}%</strong></span>
                    <span>Offer odds: <strong className="text-emerald-600">{offer}%</strong></span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${r.readinessPct}%` }} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {r.strong.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>Strong: {s}</span>
                  ))}
                  {r.weak.map(w => (
                    <span key={w} className="px-2 py-0.5 rounded-full" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>Weak: {w}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </motion.section>
    </div>
  )
}
