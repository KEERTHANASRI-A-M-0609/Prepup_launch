import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../store/AppContext'
import type { UserProfile } from '../types'
import { ChevronRight, Check, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import PrepUpLogo from '../components/brand/PrepUpLogo'

import { findAccount, saveAccount } from '../services/authStore'
import { ensureMongoAuth, syncFullSessionToMongo } from '../services/mongoSync'
import { STORAGE_KEY } from '../services/storageKeys'
import { mongoAPI } from '../services/mongoAPI'
import {
  getRolesForDomain, getCompatibleCompanies, companyOffersDomain, filterCompaniesForDomain,
} from '../engine/roleCompanyEngine'

function updateAccountProfile(email: string, profile: UserProfile) {
  const account = findAccount(email)
  if (account) saveAccount({ ...account, profile, name: profile.name || account.name })
}

const domains = [
  'Software Engineering', 'Product Management', 'Data Science',
  'Cybersecurity', 'UI / UX Design', 'AI / ML', 'Cloud & DevOps', 'Other',
]

const hours = ['0 – 5 hrs', '5 – 10 hrs', '10 – 20 hrs', '20+ hrs']

const prepLevels: { value: UserProfile['level']; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'Just starting — need foundations in core skills' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Some prep done — targeting campus placement benchmarks' },
  { value: 'advanced', label: 'Advanced', desc: 'Strong base — aiming for top companies and hard rounds' },
]

const ALL_COMPANIES = [
  'Google', 'Amazon', 'Microsoft', 'Meta', 'PayPal', 'Flipkart', 'Zomato', 'Razorpay',
  'Infosys', 'TCS', 'Wipro', 'Accenture', 'Adobe', 'Goldman', 'Startup', 'Any',
]

const COMPANY_STEP = 4

type CompanyAnalysisResult = Awaited<ReturnType<typeof mongoAPI.analyzeCompanies>>

// Defined OUTSIDE component so it doesn't re-create on every render (fixes input focus loss)
function InputField({ label, placeholder, value, onChange, type = 'text' }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>{label}</label>
      <input type={type} placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-colors focus:border-[#C26D3B]"
        style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }}
        value={value}
        onChange={e => onChange(e.target.value)} />
    </div>
  )
}

type Step = 0 | 1 | 2 | 3 | 4

export default function Onboarding() {
  const { setUser, setView, user, resetAssessmentNudge, recordIntelligenceEvent } = useApp()
  const [step, setStep] = useState<Step>(0)
  const [form, setForm] = useState<Partial<UserProfile>>({
    goal: '', domain: '', level: undefined, weeklyHours: '', targetCompanies: [], targetRole: '',
  })
  const [customDomain, setCustomDomain] = useState('')
  const [companyAnalysis, setCompanyAnalysis] = useState<CompanyAnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    if (!user?.domain) return
    setForm({
      goal: user.goal ?? '',
      domain: domains.includes(user.domain) ? user.domain : 'Other',
      level: user.level,
      weeklyHours: user.weeklyHours ?? '',
      targetCompanies: user.targetCompanies ?? [],
      targetRole: user.targetRole ?? '',
      name: user.name,
      college: user.college,
      branch: user.branch,
      graduationYear: user.graduationYear,
      cgpa: user.cgpa,
      email: user.email,
    })
    if (!domains.includes(user.domain)) setCustomDomain(user.domain)
  }, [user])

  const set = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const resolvedDomain = () => form.domain === 'Other' ? (customDomain.trim() || 'Other') : (form.domain ?? 'Software Engineering')

  const runCompanyAnalysis = useCallback(async (selected: string[]) => {
    const domain = resolvedDomain()
    if (!domain || selected.length === 0) {
      setCompanyAnalysis(null)
      return
    }
    setAnalyzing(true)
    try {
      const result = await mongoAPI.analyzeCompanies({
        companies: selected,
        domain,
        targetRole: form.targetRole,
      })
      setCompanyAnalysis(result)
      const { valid } = filterCompaniesForDomain(selected, domain)
      if (valid.length !== selected.length) {
        setForm(f => ({ ...f, targetCompanies: valid }))
      }
    } catch {
      const { valid, invalid } = filterCompaniesForDomain(selected, domain)
      setCompanyAnalysis({
        analyzed: true,
        model: 'company-domain-v1',
        domain,
        targetRole: form.targetRole || getRolesForDomain(domain)[0] || domain,
        compatible: valid,
        incompatible: invalid,
        companies: selected.map(name => ({
          name,
          compatible: valid.includes(name),
          reason: valid.includes(name)
            ? `${name} hires for ${domain}`
            : `${name} does not list campus ${domain} roles`,
          campusRoles: [],
        })),
        needsAptitude: false,
        needsCommunication: true,
        focusAreas: [],
      })
    } finally {
      setAnalyzing(false)
    }
  }, [form.targetRole, form.domain, customDomain])

  const setDomain = (d: string) => {
    const domain = d === 'Other' ? 'Other' : d
    const roles = d !== 'Other' ? getRolesForDomain(d) : []
    setForm(f => ({
      ...f,
      domain,
      targetRole: roles[0] ?? f.targetRole,
      targetCompanies: (f.targetCompanies ?? []).filter(c => c === 'Any' || companyOffersDomain(c, d === 'Other' ? customDomain : d)),
    }))
  }

  const toggleCompany = (c: string) => {
    const domain = resolvedDomain()
    if (!companyOffersDomain(c, domain)) return
    const arr = form.targetCompanies ?? []
    const next = arr.includes(c) ? arr.filter(x => x !== c) : [...arr, c]
    set('targetCompanies', next)
    void runCompanyAnalysis(next)
  }

  useEffect(() => {
    if (step !== COMPANY_STEP) return
    const selected = form.targetCompanies ?? []
    if (selected.length > 0) void runCompanyAnalysis(selected)
    else setCompanyAnalysis(null)
  }, [step, form.domain, customDomain, runCompanyAnalysis])

  const next = () => {
    if (step === COMPANY_STEP) {
      const domain = resolvedDomain()
      const { valid } = filterCompaniesForDomain(form.targetCompanies ?? [], domain)
      setForm(f => ({ ...f, targetCompanies: valid }))
      if (valid.length > 0) void runCompanyAnalysis(valid)
    }
    setStep(s => (s + 1) as Step)
  }
  const back = () => setStep(s => (s - 1) as Step)

  const finish = () => {
    const domainVal = resolvedDomain()
    const { valid } = filterCompaniesForDomain(form.targetCompanies ?? [], domainVal)
    const profile: UserProfile = {
      name:            user?.name            ?? form.name ?? '',
      email:           user?.email           ?? form.email ?? '',
      phone:           user?.phone,
      college:         form.college         ?? '',
      branch:          form.branch          ?? '',
      graduationYear:  form.graduationYear  ?? '',
      cgpa:            form.cgpa            ?? '',
      goal:            form.goal            ?? 'placement',
      domain:          domainVal,
      targetRole:      form.targetRole || getRolesForDomain(domainVal)[0],
      level:           form.level!,
      weeklyHours:     form.weeklyHours!,
      targetCompanies: valid,
    }
    setUser(profile)
    updateAccountProfile(profile.email, profile)
    ensureMongoAuth(profile).then(async ok => {
      if (ok) {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        await syncFullSessionToMongo({
          user: profile,
          assessment: s.assessment ?? null,
          applications: s.applications ?? [],
          failures: s.failures ?? [],
          activityLog: s.activityLog ?? [],
          platformData: s.platformData ?? null,
        }).catch(() => {})
      }
    }).catch(() => {})
    resetAssessmentNudge()
    recordIntelligenceEvent({
      phase: 'identity',
      type: 'onboarding_complete',
      title: 'Career identity defined',
      impact: `${profile.targetRole} · ${domainVal} — benchmarks and company filters are now personalized.`,
      meta: { targetCompanies: valid, level: profile.level },
    })
    setView('app')
  }

  const steps = [
    {
      phase: 'Phase 01 · Identity',
      title: 'Define your placement outcome',
      sub: 'Your career blueprint starts with a clear target — role, domain, and ambition.',
      content: (
        <div className="space-y-3">
          <button onClick={() => set('goal', 'placement')}
            className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${form.goal === 'placement' ? 'border-[var(--primary)]' : 'border-[var(--border)] bg-[var(--bg-muted)] hover:border-[var(--border-2)]'}`}
            style={{ background: form.goal === 'placement' ? 'var(--primary-l)' : undefined }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Campus Placement</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>On-campus drives, PPOs, full-time roles</p>
            </div>
            {form.goal === 'placement' && <Check size={16} className="text-[#C26D3B] shrink-0" />}
          </button>

          <button onClick={() => set('goal', 'internship')}
            className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${form.goal === 'internship' ? 'border-[var(--primary)]' : 'border-[var(--border)] bg-[var(--bg-muted)] hover:border-[var(--border-2)]'}`}
            style={{ background: form.goal === 'internship' ? 'var(--primary-l)' : undefined }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Internship Preparation</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Summer internships and off-campus roles</p>
            </div>
            {form.goal === 'internship' && <Check size={16} className="text-[#C26D3B] shrink-0" />}
          </button>
        </div>
      ),
    },
    {
      phase: 'Phase 01 · Identity',
      title: 'Set your career domain & role',
      sub: 'Domain and role shape every intelligence output — benchmarks, gaps, and daily actions.',
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {domains.map(d => (
              <button key={d} onClick={() => setDomain(d)}
                className={`p-4 rounded-xl border text-sm font-medium text-left transition-all ${form.domain === d ? 'border-[var(--primary)]' : 'border-[var(--border)] bg-[var(--bg-muted)] hover:border-[var(--border-2)]'}`}
                style={{ color: form.domain === d ? 'var(--primary)' : 'var(--text)', background: form.domain === d ? 'var(--primary-l)' : undefined }}>
                {d}
              </button>
            ))}
          </div>
          {form.domain && form.domain !== 'Other' && (
            <div className="pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-2)' }}>
                Target role at these companies
              </label>
              <div className="flex flex-wrap gap-2">
                {getRolesForDomain(form.domain).map(role => (
                  <button key={role} type="button" onClick={() => set('targetRole', role)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${form.targetRole === role ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}
                    style={{ background: form.targetRole === role ? 'var(--primary-l)' : 'var(--bg-muted)', color: form.targetRole === role ? 'var(--primary)' : 'var(--text-2)' }}>
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}
          {form.domain === 'Other' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>Specify your domain</label>
              <input
                placeholder="e.g. Embedded Systems, Finance, Consulting..."
                value={customDomain}
                onChange={e => setCustomDomain(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none focus:border-[#C26D3B] transition-colors"
                style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      phase: 'Phase 01 · Identity',
      title: 'Calibrate your experience level',
      sub: 'Intelligence models adjust benchmarks, difficulty, and time estimates to your current position.',
      content: (
        <div className="space-y-3">
          {prepLevels.map(l => (
            <button key={l.value} onClick={() => set('level', l.value)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${form.level === l.value ? 'border-[var(--primary)]' : 'border-[var(--border)] bg-[var(--bg-muted)] hover:border-[var(--border-2)]'}`}
              style={{ background: form.level === l.value ? 'var(--primary-l)' : undefined }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{l.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{l.desc}</p>
              </div>
              {form.level === l.value && <Check size={16} className="text-[#C26D3B] shrink-0" />}
            </button>
          ))}
        </div>
      ),
    },
    {
      phase: 'Phase 01 · Identity',
      title: 'Define your execution capacity',
      sub: 'Weekly hours inform how the action engine sizes daily priorities and recovery plans.',
      content: (
        <div className="grid grid-cols-2 gap-3">
          {hours.map(h => (
            <button key={h} onClick={() => set('weeklyHours', h)}
              className={`py-5 rounded-xl border text-sm font-semibold transition-all ${form.weeklyHours === h ? 'border-[var(--primary)]' : 'border-[var(--border)] bg-[var(--bg-muted)] hover:border-[var(--border-2)]'}`}
              style={{ color: form.weeklyHours === h ? 'var(--primary)' : 'var(--text)', background: form.weeklyHours === h ? 'var(--primary-l)' : undefined }}>
              {h}
            </button>
          ))}
        </div>
      ),
    },
    {
      phase: 'Phase 01 · Identity',
      title: 'Select target companies',
      sub: 'Company targets personalize intelligence — only employers that hire for your domain are shown.',
      content: (() => {
        const domain = resolvedDomain()
        const selectable = getCompatibleCompanies(domain)
        const hiddenCount = ALL_COMPANIES.length - selectable.length
        const { invalid } = filterCompaniesForDomain(form.targetCompanies ?? [], domain)
        return (
          <div className="space-y-3">
            {invalid.length > 0 && (
              <p className="text-xs p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                Removed {invalid.join(', ')} — not compatible with {domain}.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {selectable.map(c => {
                const active = (form.targetCompanies ?? []).includes(c)
                return (
                  <button key={c} onClick={() => toggleCompany(c)}
                    className={`flex items-center justify-between p-4 rounded-xl border text-sm font-medium text-left transition-all ${active ? 'border-[var(--primary)]' : 'border-[var(--border)] bg-[var(--bg-muted)] hover:border-[var(--border-2)]'}`}
                    style={{ color: active ? 'var(--primary)' : 'var(--text)', background: active ? 'var(--primary-l)' : undefined }}>
                    {c}
                    {active && <Check size={14} />}
                  </button>
                )
              })}
            </div>
            {hiddenCount > 0 && (
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                {hiddenCount} companies hidden — they do not hire {form.targetRole || domain} on campus.
              </p>
            )}
            {(analyzing || companyAnalysis) && (
              <div className="p-3 rounded-xl border text-xs space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text)' }}>
                  {analyzing ? (
                    <><Loader2 size={14} className="animate-spin" /> Analyzing companies…</>
                  ) : (
                    <><CheckCircle2 size={14} className="text-emerald-600" /> Analyzed by PrepUp company model ({companyAnalysis?.model})</>
                  )}
                </div>
                {!analyzing && companyAnalysis && companyAnalysis.companies.map(c => (
                  <div key={c.name} className="flex items-start gap-2" style={{ color: 'var(--text-2)' }}>
                    {c.compatible
                      ? <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                      : <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />}
                    <span>{c.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })(),
    },
    {
      phase: 'Phase 01 · Identity',
      title: 'Complete your career profile',
      sub: 'Academic context enriches your placement identity card and outcome tracking.',
      content: (
        <div className="space-y-3">
          <InputField label="Full Name" placeholder="Arjun Sharma"
            value={(form.name ?? '')} onChange={v => set('name', v)} />
          <InputField label="College" placeholder="NIT Trichy"
            value={(form.college ?? '')} onChange={v => set('college', v)} />
          <InputField label="Branch" placeholder="Computer Science"
            value={(form.branch ?? '')} onChange={v => set('branch', v)} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Grad Year" placeholder="2025"
              value={(form.graduationYear ?? '')} onChange={v => set('graduationYear', v)} />
            <InputField label="CGPA" placeholder="8.4"
              value={(form.cgpa ?? '')} onChange={v => set('cgpa', v)} />
          </div>
        </div>
      ),
    },
  ]

  const total = steps.length
  const canProceed = step === 0
    ? Boolean(form.goal)
    : step === 1
      ? (!!form.domain && (form.domain === 'Other' ? !!customDomain.trim() : !!form.targetRole))
      : step === 2
        ? Boolean(form.level)
        : step === 3
          ? Boolean(form.weeklyHours)
          : true

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setView(user ? 'app' : 'landing')}
            className="flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-2)' }}>
            <ChevronRight size={14} className="rotate-180" /> Home
          </button>
          <div className="flex items-center gap-2">
            <PrepUpLogo size={32} />
            <span className="font-display font-bold text-xl" style={{ color: 'var(--text)' }}>PrepUp</span>
          </div>
          <div className="w-16" />
        </div>

        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500"
              style={{ background: i <= step ? 'var(--primary)' : 'var(--border)' }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}
            className="surface-elevated p-8 md:p-10">
            <p className="text-label mb-2">
              {steps[step].phase} · Step {step + 1} of {total}
            </p>
            <h2 className="text-display font-display mb-2" style={{ color: 'var(--text)' }}>
              {steps[step].title}
            </h2>
            <p className="text-base mb-8" style={{ color: 'var(--text-2)' }}>{steps[step].sub}</p>
            {steps[step].content}
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button onClick={back}
                  className="flex-1 py-3 rounded-xl border text-sm font-medium"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--bg-muted)' }}>
                  Back
                </button>
              )}
              <button onClick={step < total - 1 ? next : finish}
                disabled={!canProceed}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 btn-accent">
                {step < total - 1 ? 'Continue' : 'Activate Intelligence'}
                <ChevronRight size={15} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
