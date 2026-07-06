import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../store/AppContext'
import {
  ArrowRight, Target, BarChart2, RefreshCcw, CheckCircle, TrendingUp, Zap,
  Users, Award, Code2, Activity, ChevronLeft, ChevronRight,
  Shield, Clock, RotateCcw, Headphones, Mic, Brain, Briefcase, FileText, X,
  BookOpen, Flame, MessageSquare, Calendar,
} from 'lucide-react'
import { countByStatus } from '../data/careerModules'
import CareerChatWidget from '../components/chat/CareerChatWidget'
import PrepUpLogo from '../components/brand/PrepUpLogo'
import FlashOfferStack, { type FlashOffer } from '../components/landing/FlashOfferStack'

const MODULE_STATS = countByStatus()

const FLASH_OFFERS: FlashOffer[] = [
  {
    id: 'readiness',
    badge: 'LIVE',
    badgeClass: 'deal-badge-hot',
    headline: 'Free readiness report in 2 min',
    sub: 'Resume + coding evidence → instant placement score',
    cta: 'Claim now',
    accent: '#1E56C0',
  },
  {
    id: 'leetcode',
    badge: 'SYNC',
    badgeClass: 'deal-badge-new',
    headline: 'LeetCode profile sync',
    sub: 'Connect once — DSA score updates automatically',
    cta: 'Connect',
    accent: '#0D9488',
  },
  {
    id: 'mock',
    badge: 'NEW',
    badgeClass: 'deal-badge-sale',
    headline: 'AI mock interview — 10 min',
    sub: 'Technical + HR feedback before your real round',
    cta: 'Try free',
    accent: '#7C3AED',
  },
  {
    id: 'plan',
    badge: 'DAILY',
    badgeClass: 'deal-badge-hot',
    headline: 'Auto-prioritized daily plan',
    sub: 'One highest-impact task sized to your weekly hours',
    cta: 'Get plan',
    accent: '#EA580C',
  },
  {
    id: 'pipeline',
    badge: 'TRACK',
    badgeClass: 'deal-badge-new',
    headline: 'Application pipeline tracker',
    sub: 'Wishlist → OA → interviews → offer in one board',
    cta: 'Start tracking',
    accent: '#059669',
  },
]

const HERO_SLIDES = [
  {
    title: 'Placement Intelligence Platform',
    subtitle: 'From preparation data to placement decisions — one unified system for readiness, gaps, and execution.',
    cta: 'Define Your Goal',
    tag: 'Data → Intelligence → Action → Outcome',
    gradient: 'linear-gradient(105deg, rgba(15,23,42,0.94) 0%, rgba(30,86,192,0.88) 45%, rgba(13,148,136,0.85) 100%)',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80&auto=format&fit=crop',
    metric: { label: 'Career Blueprint', value: 'Identity → Evidence', delta: 'Personalized to role, domain & companies', color: '#6EE7B7' },
    priority: { title: 'Intelligence Layer', task: 'Readiness · Gaps · Momentum · Risk', impact: 'Know exactly where you stand today' },
  },
  {
    title: 'Connect Your Evidence',
    subtitle: 'Resume, GitHub, coding platforms, assessments, projects, and applications — unified into one evidence graph.',
    cta: 'Connect Evidence',
    tag: 'Unified Evidence Graph',
    gradient: 'linear-gradient(105deg, rgba(30,86,192,0.92) 0%, rgba(15,23,42,0.9) 50%, rgba(124,58,237,0.88) 100%)',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1400&q=80&auto=format&fit=crop',
    metric: { label: 'Evidence Sources', value: '12+ signals', delta: 'Scattered prep → structured intelligence', color: '#93C5FD' },
    priority: { title: 'Data Ingestion', task: 'LeetCode · GitHub · Resume · Voice', impact: 'Transforms fragments into placement truth' },
  },
  {
    title: 'Execute With Precision',
    subtitle: 'One platform. One readiness score. One highest-impact action — every single day.',
    cta: 'Start Execution',
    tag: 'Daily Action Engine',
    gradient: 'linear-gradient(105deg, rgba(13,148,136,0.92) 0%, rgba(30,86,192,0.88) 55%, rgba(15,23,42,0.92) 100%)',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&q=80&auto=format&fit=crop',
    metric: { label: 'Action Layer', value: 'Prioritized', delta: 'Recovery plans · growth paths · tracking', color: '#5EEAD4' },
    priority: { title: 'Outcome Focus', task: 'Daily priorities aligned to placement success', impact: 'Move continuously toward your target role' },
  },
]

const ENTERPRISE_PIPELINE = [
  {
    num: '01',
    title: 'Define Your Goal',
    line: 'Role · Domain · Target Companies',
    phase: 'Identity',
    outcome: 'Creates a personalized career blueprint.',
  },
  {
    num: '02',
    title: 'Connect Your Evidence',
    line: 'Resume · Coding · Projects · Assessments',
    phase: 'Data',
    outcome: 'Transforms scattered preparation into a unified evidence graph.',
  },
  {
    num: '03',
    title: 'Unlock Placement Intelligence',
    line: 'Readiness · Gaps · Momentum · Risks',
    phase: 'Intelligence',
    outcome: 'Know exactly where you stand today.',
  },
  {
    num: '04',
    title: 'Execute With Precision',
    line: 'Daily Actions · Recovery Plans · Progress Tracking',
    phase: 'Action',
    outcome: 'Move continuously toward placement success.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '1',
    phase: 'Build Your Career Identity',
    title: 'Define role, domain, skills, and dream companies',
    desc: 'Set your target role, domain, experience level, and companies. Creates a personalized career blueprint.',
    img: 'photo-1522202176988-66273c2fd55f',
  },
  {
    step: '2',
    phase: 'Connect Your Evidence',
    title: 'Resume, platforms, assessments, and applications',
    desc: 'Resume, GitHub, coding platforms, projects, certifications, communication, and applications — unified.',
    img: 'photo-1517694712202-14dd9538aa97',
  },
  {
    step: '3',
    phase: 'Generate Placement Intelligence',
    title: 'Strengths, gaps, readiness, momentum, and risk',
    desc: 'Analyze strengths, weaknesses, readiness, skill gaps, momentum, and risk areas. Know where you stand.',
    img: 'photo-1552664730-d307ca884978',
  },
  {
    step: '4',
    phase: 'Execute the Highest-Impact Actions',
    title: 'Daily priorities, recovery plans, and growth paths',
    desc: 'Personalized daily priorities, recovery plans, and growth recommendations. Continuous placement progress.',
    img: 'photo-1553877522-43269d4ea984',
  },
]

const MODULES = [
  { icon: Code2, label: 'DSA & Coding', desc: 'LeetCode-tracked problem solving', color: '#D97706', bg: '#FEF3C7' },
  { icon: FileText, label: 'Resume Intel', desc: 'ATS score and keyword gaps', color: '#1E56C0', bg: '#DBEAFE' },
  { icon: Mic, label: 'Communication', desc: 'Voice clarity and filler analysis', color: '#7C3AED', bg: '#EDE9FE' },
  { icon: Brain, label: 'Aptitude', desc: 'Quant, logic, and verbal drills', color: '#0D9488', bg: '#CCFBF1' },
  { icon: Briefcase, label: 'Applications', desc: 'Pipeline from wishlist to offer', color: '#059669', bg: '#D1FAE5' },
  { icon: Target, label: 'Readiness', desc: 'Composite placement score', color: '#1E56C0', bg: '#DBEAFE' },
  { icon: Calendar, label: 'Daily Plan', desc: 'AI-prioritized daily execution', color: '#DC2626', bg: '#FEE2E2' },
  { icon: Activity, label: 'Career Health', desc: 'Momentum and burnout signals', color: '#0891B2', bg: '#CFFAFE' },
  { icon: MessageSquare, label: 'Mock Interview', desc: 'Technical + HR with feedback', color: '#7C3AED', bg: '#EDE9FE' },
  { icon: RefreshCcw, label: 'Failure Intel', desc: 'Rejection patterns and fixes', color: '#B45309', bg: '#FFEDD5' },
  { icon: BookOpen, label: 'Resources', desc: 'Company-specific prep tracks', color: '#0D9488', bg: '#CCFBF1' },
  { icon: Flame, label: 'Momentum', desc: 'Streaks, heatmaps, recovery', color: '#EA580C', bg: '#FFEDD5' },
]

const CAPABILITIES = [
  { icon: Target, title: 'Smart Readiness Score', desc: 'Composite score built from LeetCode, GitHub, and assessment evidence', badge: 'Core', badgeClass: 'deal-badge-new', tag: 'Evidence-based', accent: '#1E56C0' },
  { icon: BarChart2, title: 'Gap Analysis Engine', desc: 'AI prioritizes your biggest placement blockers by domain and target companies', badge: 'AI', badgeClass: 'deal-badge-hot', tag: 'Personalized', accent: '#7C3AED' },
  { icon: RefreshCcw, title: 'Recovery Intelligence', desc: 'Structured restart plans when momentum drops or schedules slip', badge: 'Smart', badgeClass: 'deal-badge-sale', tag: 'Adaptive', accent: '#0D9488' },
  { icon: Zap, title: 'Failure Pattern AI', desc: 'Turn every rejection into patterns, root causes, and next-step actions', badge: 'Intel', badgeClass: 'deal-badge-hot', tag: 'Insights', accent: '#D97706' },
  { icon: TrendingUp, title: 'Application Pipeline', desc: 'Track every company from wishlist through OA, interviews, and offer', badge: 'Tracker', badgeClass: 'deal-badge-new', tag: 'End-to-end', accent: '#059669' },
  { icon: Award, title: 'Placement Probability', desc: 'Live placement odds based on skills, momentum, and application stage', badge: 'Live', badgeClass: 'deal-badge-sale', tag: 'Real-time', accent: '#1E56C0' },
]

const TRUST = [
  { icon: Shield, title: 'Enterprise-Grade Security', sub: 'Encrypted sessions & cloud persistence' },
  { icon: Clock, title: 'Intelligence in Minutes', sub: 'Blueprint to first insight fast' },
  { icon: RotateCcw, title: 'Evidence-Backed Decisions', sub: 'Scores from real platform data' },
  { icon: Headphones, title: 'Proactive Alerts', sub: 'In-app and WhatsApp intelligence' },
]

const TARGET_COMPANIES = ['Google', 'Amazon', 'Microsoft', 'Flipkart', 'Meta', 'Adobe', 'Goldman Sachs', 'Infosys', 'TCS', 'Accenture', 'PhonePe', 'Swiggy']

const PLATFORM_HIGHLIGHTS = [
  { icon: Target, title: 'Career identity engine', desc: 'Role, domain, and company targets shape every intelligence output and action recommendation.' },
  { icon: BarChart2, title: 'Placement intelligence', desc: 'Readiness, gaps, momentum, and risk — synthesized from your full evidence graph.' },
  { icon: Briefcase, title: 'Execution orchestration', desc: 'Daily priorities, recovery plans, and pipeline tracking toward placement outcomes.' },
  { icon: RefreshCcw, title: 'Continuous learning loop', desc: 'Every assessment and application refines your intelligence model and next best action.' },
]

const ANNOUNCEMENTS = [
  'Data → Intelligence → Action → Outcome — the PrepUp operating model',
  'Unified evidence graph from resume, coding platforms, and assessments',
  'Placement intelligence: readiness, gaps, momentum, and risk in one view',
  `${MODULE_STATS.live} intelligence modules · ${MODULE_STATS.partial} on the product roadmap`,
  'One readiness score. One highest-impact action. Every day.',
]

const SLIDE_DURATION = 6000

function useLiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Landing() {
  const { setView, user } = useApp()
  const [slide, setSlide] = useState(0)
  const [progress, setProgress] = useState(0)
  const liveTime = useLiveClock()

  const goLogin = () => setView('login')
  const nextSlide = useCallback(() => {
    setSlide(s => (s + 1) % HERO_SLIDES.length)
    setProgress(0)
  }, [])
  const prevSlide = () => {
    setSlide(s => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
    setProgress(0)
  }

  useEffect(() => {
    const t = setInterval(nextSlide, SLIDE_DURATION)
    return () => clearInterval(t)
  }, [nextSlide])

  useEffect(() => {
    const step = 50
    const inc = (step / SLIDE_DURATION) * 100
    const t = setInterval(() => {
      setProgress(p => (p >= 100 ? 0 : p + inc))
    }, step)
    return () => clearInterval(t)
  }, [slide])

  const current = HERO_SLIDES[slide]

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--landing-bg)' }}>
      {/* Live announcement strip */}
      <div className="live-strip py-2">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="live-dot" />
            <span className="font-semibold text-emerald-300 text-xs uppercase tracking-wider">Live</span>
            <span className="text-slate-300 hidden sm:inline">{liveTime} IST</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="marquee-track gap-12">
              {[...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((item, i) => (
                <span key={i} className="mx-6 whitespace-nowrap">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky nav — Sign In / Get Started top right */}
      <header className="landing-nav sticky top-0 z-50">
        <div className="landing-nav-inner">
          <button type="button" onClick={() => window.scrollTo({ top: 0 })} className="flex items-center gap-2.5 shrink-0">
            <PrepUpLogo size={40} />
            <div className="text-left hidden sm:block">
              <p className="font-bold text-slate-900 text-lg leading-none">PrepUp</p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Placement intelligence platform</p>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button type="button" onClick={() => document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-blue-600 transition-colors">Modules</button>
            <button type="button" onClick={() => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-blue-600 transition-colors">Capabilities</button>
            <button type="button" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-blue-600 transition-colors">How it works</button>
          </nav>

          <div className="landing-nav-cta">
            {user ? (
              <button type="button" onClick={() => setView('app')} className="btn-landing-primary">
                Open Dashboard <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button type="button" onClick={goLogin} className="btn-landing-signin">
                  Sign In
                </button>
                <button type="button" onClick={goLogin} className="btn-landing-primary">
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Full-width vibrant hero carousel */}
      <section className="hero-carousel hero-carousel-v2">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="hero-slide"
            style={{
              backgroundImage: `${current.gradient}, url(${current.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="hero-slide-overlay" style={{ background: 'radial-gradient(ellipse at 70% 50%, transparent 0%, rgba(0,0,0,0.25) 100%)' }} />

            <div className="hero-slide-inner-v2">
              <div className="hero-slide-content max-w-xl">
                <motion.span
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}
                >
                  {current.tag}
                </motion.span>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-[1.1]"
                >
                  {current.title}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                  className="text-base sm:text-lg text-white/90 mb-8 max-w-lg"
                >
                  {current.subtitle}
                </motion.p>
                <motion.button
                  type="button"
                  onClick={goLogin}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="btn-commerce text-base px-8 py-3.5 font-bold"
                  style={{ background: '#fff', color: '#1E56C0' }}
                >
                  {current.cta} <ArrowRight size={20} />
                </motion.button>
              </div>

              <div className="hidden lg:block relative min-w-[300px]">
                <FlashOfferStack offers={FLASH_OFFERS} onCta={goLogin} position="hero" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <button type="button" onClick={prevSlide} aria-label="Previous slide"
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 shadow-lg flex items-center justify-center z-20 hover:bg-white hover:scale-105 transition-all">
          <ChevronLeft size={22} />
        </button>
        <button type="button" onClick={nextSlide} aria-label="Next slide"
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 shadow-lg flex items-center justify-center z-20 hover:bg-white hover:scale-105 transition-all">
          <ChevronRight size={22} />
        </button>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
          {HERO_SLIDES.map((_, i) => (
            <button key={i} type="button" aria-label={`Slide ${i + 1}`} onClick={() => { setSlide(i); setProgress(0) }}
              className={`hero-slide-dot ${i === slide ? 'active' : ''}`} />
          ))}
        </div>

        <div className="hero-progress" style={{ width: `${progress}%` }} />
      </section>

      {/* Enterprise operating model — Data → Intelligence → Action → Outcome */}
      <section className="page-container py-10 sm:py-12">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: '#1E56C0' }}>
            Operating Model
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
            Data → Intelligence → Action → Outcome
          </h2>
          <p className="text-base sm:text-lg text-slate-600 italic">
            From preparation data to placement decisions.
          </p>
        </div>

        <div className="enterprise-pipeline">
          {ENTERPRISE_PIPELINE.map((item, i) => (
            <motion.div
              key={item.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="enterprise-pipeline-step"
            >
              <div className="enterprise-pipeline-num">{item.num}</div>
              <div className="enterprise-pipeline-body">
                <p className="enterprise-pipeline-phase">{item.phase}</p>
                <h3 className="enterprise-pipeline-title">{item.title}</h3>
                <p className="enterprise-pipeline-line">{item.line}</p>
                <p className="enterprise-pipeline-outcome">{item.outcome}</p>
              </div>
              {i < ENTERPRISE_PIPELINE.length - 1 && (
                <div className="enterprise-pipeline-arrow" aria-hidden>↓</div>
              )}
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm sm:text-base font-medium text-slate-500 mt-8 max-w-2xl mx-auto">
          One platform. One readiness score. One next action. Every day.
        </p>
      </section>

      {/* Placement modules — full grid */}
      <section id="modules" className="page-container py-8 sm:py-10">
        <div className="rounded-xl p-5 sm:p-8 shadow-sm border border-slate-200/80" style={{ background: '#fff' }}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#0D9488' }}>Placement Modules</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">End-to-End Placement Intelligence</h2>
              <p className="text-sm text-slate-500 mt-2 max-w-xl">
                Every module feeds the evidence graph — from identity and assessments to execution and outcome tracking.
              </p>
            </div>
            <button type="button" onClick={goLogin} className="btn-landing-primary shrink-0 self-start sm:self-auto">
              Explore all modules <ArrowRight size={16} />
            </button>
          </div>
          <div className="module-grid-full">
            {MODULES.map((mod, i) => {
              const Icon = mod.icon
              return (
                <motion.button
                  key={mod.label}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  onClick={goLogin}
                  className="module-card-full"
                >
                  <div className="module-icon-wrap" style={{ background: mod.bg }}>
                    <Icon size={24} style={{ color: mod.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{mod.label}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mod.desc}</p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="page-container pb-6 sm:pb-8">
        <div className="trust-grid">
          {TRUST.map((t, i) => {
            const Icon = t.icon
            return (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="trust-pill"
                style={{ background: '#fff' }}
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EFF6FF' }}>
                  <Icon size={24} style={{ color: '#1E56C0' }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{t.title}</p>
                  <p className="text-xs text-slate-500">{t.sub}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Platform capabilities */}
      <section id="capabilities" className="page-container py-6 sm:py-8">
        <div className="flex items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Intelligence Engines</h2>
            <p className="text-sm text-slate-500 mt-1">Core systems that power placement decisions</p>
          </div>
          <button type="button" onClick={goLogin} className="text-sm font-bold shrink-0" style={{ color: '#1E56C0' }}>
            View all →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CAPABILITIES.map((feat, i) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                className="deal-card cursor-pointer"
                onClick={goLogin}
              >
                <div className="h-40 flex items-center justify-center relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${feat.accent}12, ${feat.accent}06)` }}>
                  <img
                    src={`https://images.unsplash.com/photo-${i % 2 === 0 ? '1551434678-e076c223a692' : '1460925895917-afdab827c52f'}?w=400&q=60&auto=format&fit=crop`}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                  />
                  <span className={`deal-badge absolute top-3 left-3 ${feat.badgeClass}`}>{feat.badge}</span>
                  <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded bg-white/90 text-slate-600 uppercase tracking-wide">{feat.tag}</span>
                  <Icon size={52} style={{ color: feat.accent }} className="relative z-10" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{feat.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">{feat.desc}</p>
                  <button type="button" className="text-xs font-bold" style={{ color: '#1E56C0' }}>Learn more →</button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Target companies */}
      <section className="py-8 border-y border-slate-200 overflow-hidden" style={{ background: '#fff' }}>
        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Target companies you can track</p>
        <div className="marquee-track gap-16">
          {[...TARGET_COMPANIES, ...TARGET_COMPANIES].map((b, i) => (
            <span key={i} className="text-xl font-bold mx-6" style={{ color: '#CBD5E1' }}>{b}</span>
          ))}
        </div>
      </section>

      {/* Problem + solution with image */}
      <section className="page-container py-10 sm:py-12">
        <div className="rounded-2xl overflow-hidden shadow-lg flex flex-col lg:flex-row border border-slate-200">
          <div className="flex-1 p-8 sm:p-10 lg:p-12 bg-white">
            <p className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2">The Problem</p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Fragmented data. Zero intelligence.</h2>
            <p className="text-slate-600 mb-6">
              LeetCode, GitHub, Notion, Sheets — scattered signals with no unified model for readiness, risk, or next action.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['Where do I stand today?', 'What is my #1 placement risk?', 'What should I execute now?', 'How do I recover momentum?'].map(q => (
                <div key={q} className="flex items-center gap-2 text-sm text-slate-700 bg-red-50 px-3 py-2.5 rounded-lg border border-red-100">
                  <X size={14} className="text-red-500 shrink-0" /> {q}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 relative min-h-[280px] lg:min-h-0">
            <img
              src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80&auto=format&fit=crop"
              alt="Team collaboration"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 p-8 sm:p-10 flex flex-col justify-end text-white"
              style={{ background: 'linear-gradient(to top, rgba(30,86,192,0.95) 0%, rgba(13,148,136,0.75) 60%, transparent 100%)' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-100 mb-2">The Solution</p>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">One intelligence platform.</h2>
              <p className="text-white/90 mb-5 text-sm sm:text-base">PrepUp unifies evidence, generates placement intelligence, and orchestrates daily execution toward outcomes.</p>
              <button type="button" onClick={goLogin} className="btn-commerce self-start">Get Started Free</button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="page-container py-10 sm:py-12">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">How It Works</h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Four phases from career identity to placement execution — not a checklist, an intelligence operating system.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HOW_IT_WORKS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 flex flex-col"
            >
              <div className="h-32 relative overflow-hidden">
                <img src={`https://images.unsplash.com/${s.img}?w=400&q=70&auto=format&fit=crop`} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: 'linear-gradient(135deg, #1E56C0, #0D9488)' }}>
                  {s.step}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#1E56C0' }}>{s.phase}</p>
                <h3 className="font-bold text-slate-800 text-sm mb-2 leading-snug">{s.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed flex-1">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <blockquote className="mt-10 text-center text-base sm:text-lg font-medium text-slate-700 italic max-w-2xl mx-auto border-t border-slate-200 pt-8">
          From preparation data to placement decisions.
        </blockquote>
      </section>

      {/* Platform highlights — factual product capabilities */}
      <section className="page-container py-8 sm:py-10">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Core Platform Capabilities</h2>
        <p className="text-sm text-slate-500 mb-5">Identity, evidence, intelligence, and execution — unified</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLATFORM_HIGHLIGHTS.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="deal-card p-5"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: '#EFF6FF' }}>
                  <Icon size={20} style={{ color: '#1E56C0' }} />
                </div>
                <p className="text-sm font-bold text-slate-800 mb-2">{item.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Integrations */}
      <section className="page-container py-8 sm:py-10">
        <div className="rounded-xl p-6 sm:p-8 shadow-sm border border-slate-200 bg-white">
          <p className="text-center text-base font-bold text-slate-800 mb-1">Evidence Integrations</p>
          <p className="text-center text-xs text-slate-500 mb-6">Connect external signals into your unified evidence graph</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Code2, name: 'LeetCode', color: '#D97706' },
              { icon: Users, name: 'GitHub', color: '#24292F' },
              { icon: Target, name: 'Resume AI', color: '#1E56C0' },
              { icon: Zap, name: 'Voice Analysis', color: '#7C3AED' },
            ].map(tool => {
              const Icon = tool.icon
              return (
                <div key={tool.name} className="flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-slate-50/50" onClick={goLogin}>
                  <Icon size={20} style={{ color: tool.color }} />
                  <span className="text-sm font-bold text-slate-800">{tool.name}</span>
                  <span className="deal-badge deal-badge-new text-[9px]">Supported</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="page-container py-10 sm:py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-2xl p-8 sm:p-12 md:p-16 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1E56C0 0%, #0D9488 50%, #0F172A 100%)' }}
        >
          <img
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=60&auto=format&fit=crop"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-15"
          />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Stop guessing. Start executing with intelligence.</h2>
            <p className="text-white/90 text-base sm:text-lg mb-8 max-w-lg mx-auto">
              Replace fragmented prep with a placement intelligence platform that tells you where you stand and what to do next.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button type="button" onClick={goLogin} className="btn-commerce text-base px-10 py-3.5 font-bold">
                Get Started Free <ArrowRight size={18} />
              </button>
              <button type="button" onClick={goLogin} className="px-10 py-3.5 rounded-lg text-base font-bold bg-white/15 text-white border border-white/30 hover:bg-white/25 transition-colors">
                Sign In
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-6 mt-8">
              {['No credit card', 'Free tier available', 'LeetCode + GitHub sync'].map(item => (
                <span key={item} className="flex items-center gap-1.5 text-sm text-white/90">
                  <CheckCircle size={14} /> {item}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0F172A' }} className="text-slate-300">
        <div className="page-container py-10 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <PrepUpLogo size={36} />
                <span className="font-bold text-white text-xl">PrepUp</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Placement intelligence platform — from career identity and evidence to daily execution and outcomes.
              </p>
            </div>
            {[
              { title: 'Platform', links: ['Command Center', 'Assessments', 'Application Tracker', 'Daily Planner'] },
              { title: 'Intelligence', links: ['Readiness Engine', 'Gap Analysis', 'Momentum Tracking', 'Recovery Plans'] },
              { title: 'Integrations', links: ['LeetCode', 'GitHub', 'WhatsApp Alerts', 'Career Health API'] },
            ].map(col => (
              <div key={col.title}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{col.title}</p>
                <ul className="space-y-2.5 text-sm">
                  {col.links.map(l => (
                    <li key={l}><button type="button" onClick={goLogin} className="hover:text-white transition-colors">{l}</button></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} PrepUp · Placement intelligence platform</p>
            <div className="flex gap-6">
              <button type="button" className="hover:text-white">Privacy</button>
              <button type="button" className="hover:text-white">Terms</button>
              <button type="button" onClick={goLogin} className="hover:text-teal-300 font-bold">Get Started →</button>
            </div>
          </div>
        </div>
      </footer>

      <FlashOfferStack offers={FLASH_OFFERS} onCta={goLogin} position="fixed" />
      <CareerChatWidget guest={!user} />
    </div>
  )
}
