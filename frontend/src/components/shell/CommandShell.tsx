import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Activity, Briefcase, BookOpen, CalendarDays,
  BarChart3, Settings, Bell, Sun, Moon, LogOut, Brain, Flame, LayoutGrid, Library,
  ChevronDown, MoreHorizontal,
} from 'lucide-react'
import PrepUpLogo from '../brand/PrepUpLogo'
import { useApp } from '../../store/AppContext'
import { computeOverall } from '../../engine/intelligence'
import { computeReadinessConfidence } from '../../engine/assessmentEngine'
import CareerChatWidget from '../chat/CareerChatWidget'
import SyncStatusBar, { ConnectionPill } from '../SyncStatusBar'
import AnimatedNumber from '../motion/AnimatedNumber'

const NAV_MAIN = [
  { to: '/', icon: Home, label: 'Home', hint: 'Dashboard' },
  { to: '/health', icon: Activity, label: 'Assess', hint: 'Scores & gaps' },
  { to: '/planner', icon: CalendarDays, label: 'Plan', hint: 'Daily tasks' },
  { to: '/applications', icon: Briefcase, label: 'Jobs', hint: 'Applications' },
  { to: '/resources', icon: BookOpen, label: 'Learn', hint: 'Resources' },
]

const NAV_MORE = [
  { to: '/workspace', icon: LayoutGrid, label: 'Workspace' },
  { to: '/knowledge', icon: Library, label: 'Knowledge' },
  { to: '/momentum', icon: Flame, label: 'Momentum' },
  { to: '/failures', icon: Brain, label: 'Intel' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
]

export default function CommandShell({ children }: { children: React.ReactNode }) {
  const { user, assessment, theme, toggleTheme, signOut, setView, notifications, platformData } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const confidence = computeReadinessConfidence(assessment, platformData ?? null)
  const score = confidence.measuredSections > 0 && assessment ? computeOverall(assessment) : null
  const unread = (notifications ?? []).filter(n => !n.read).length

  const moreActive = NAV_MORE.some(n => location.pathname === n.to || location.pathname.startsWith(n.to + '/'))

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    setMoreOpen(false)
    setMobileMoreOpen(false)
  }, [location.pathname])

  const moreLinks = (onPick: () => void) => NAV_MORE.map(({ to, icon: Icon, label }) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => { setView('app'); onPick() }}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors rounded-lg ${isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800'}`
      }
    >
      <Icon size={15} />
      {label}
    </NavLink>
  ))

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <SyncStatusBar />

      <header className="sticky top-0 z-50 shrink-0 shadow-md vertex-header">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => { setView('app'); navigate('/') }}
            className="flex items-center gap-2 shrink-0 min-w-0 hover:opacity-90 transition-opacity"
          >
            <PrepUpLogo size={32} />
            <div className="hidden sm:block min-w-0 text-left">
              <p className="font-display font-bold text-sm leading-none text-white truncate">PrepUp</p>
              <p className="text-[10px] mt-0.5 font-medium text-indigo-100">Placement intelligence</p>
            </div>
          </button>

          <div className="shell-nav-wrap hidden md:flex">
            <nav className="shell-nav-scroll no-scrollbar" aria-label="Main">
              {NAV_MAIN.map(({ to, icon: Icon, label, hint }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setView('app')}
                  className={({ isActive }) => `shell-nav-link ${isActive ? 'active' : ''}`}
                  title={hint}
                >
                  <Icon size={15} strokeWidth={2} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="relative shrink-0" ref={moreRef}>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setMoreOpen(v => !v) }}
                className={`shell-nav-link ${moreActive ? 'active' : ''}`}
                aria-expanded={moreOpen}
                aria-haspopup="true"
              >
                <MoreHorizontal size={15} />
                <span>More</span>
                <ChevronDown size={12} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="shell-more-menu"
                  >
                    {moreLinks(() => setMoreOpen(false))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto md:ml-0">
            <ConnectionPill />

            {score !== null && (
              <div
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
                title="Readiness score"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80">Score</span>
                <AnimatedNumber value={score} suffix="%" className="text-sm font-bold text-white" />
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-xl transition-colors hover:bg-white/15"
              aria-label="Notifications"
            >
              <Bell size={18} className="text-white/90" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold bg-red-500">
                  {unread}
                </span>
              )}
            </button>

            <NavLink to="/settings" onClick={() => setView('app')} className="p-2 rounded-xl transition-colors hover:bg-white/15" aria-label="Settings">
              <Settings size={18} className="text-white/90" />
            </NavLink>

            <button type="button" onClick={toggleTheme} className="p-2 rounded-xl transition-colors hover:bg-white/15" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={18} className="text-white/90" /> : <Moon size={18} className="text-white/90" />}
            </button>

            {user && (
              <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 ml-0 sm:ml-1 border-l border-white/25">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-white text-indigo-700 shrink-0" title={user.name}>
                  {user.name[0]?.toUpperCase()}
                </div>
                <button type="button" onClick={signOut} className="hidden sm:block p-2 rounded-xl transition-colors hover:bg-white/15" title="Sign out">
                  <LogOut size={16} className="text-white/80" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 shell-main-pad min-w-0 overflow-x-hidden"
        style={{ background: 'var(--bg)' }}
      >
        {children}
      </motion.main>

      <nav className="shell-mobile-nav" aria-label="Main navigation">
        {NAV_MAIN.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setView('app')}
            className={({ isActive }) => `shell-mobile-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} strokeWidth={2} />
            <span className="truncate max-w-full">{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMobileMoreOpen(true)}
          className={`shell-mobile-link ${moreActive ? 'active' : ''}`}
        >
          <MoreHorizontal size={20} strokeWidth={2} />
          <span>More</span>
        </button>
      </nav>

      <AnimatePresence>
        {mobileMoreOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 md:hidden"
              aria-label="Close menu"
              onClick={() => setMobileMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[70] md:hidden rounded-t-2xl border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest dash-label mb-3">More tools</p>
              <div className="grid grid-cols-2 gap-2">
                {moreLinks(() => setMobileMoreOpen(false))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CareerChatWidget />
    </div>
  )
}
