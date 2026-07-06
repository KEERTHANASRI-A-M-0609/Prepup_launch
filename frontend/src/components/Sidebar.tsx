import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Briefcase, Target, AlertTriangle,
  BarChart2, Settings, Sun, Moon, LogOut, Home, Activity,
  ChevronRight, CalendarDays, Bell, Sparkles,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { computeOverall } from '../engine/intelligence'
import { computeReadinessConfidence } from '../engine/assessmentEngine'
import PrepUpLogo from './brand/PrepUpLogo'
import AnimatedNumber from './motion/AnimatedNumber'

const nav = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',      section: 'main' },
  { to: '/preparation',  icon: BookOpen,         label: 'Preparation',    section: 'main' },
  { to: '/resources',    icon: Sparkles,         label: 'Resources',      section: 'main' },
  { to: '/planner',      icon: CalendarDays,     label: 'Daily Planner',  section: 'main' },
  { to: '/applications', icon: Briefcase,        label: 'Applications',   section: 'main' },
  { to: '/readiness',    icon: Target,           label: 'Readiness',      section: 'main' },
  { to: '/failures',     icon: AlertTriangle,    label: 'Failure Intel',  section: 'insights' },
  { to: '/health',       icon: Activity,         label: 'Career Health',  section: 'insights' },
  { to: '/reports',      icon: BarChart2,        label: 'Reports',        section: 'insights' },
  { to: '/settings',     icon: Settings,         label: 'Settings',       section: 'system' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, assessment, theme, toggleTheme, signOut, setView, notifications, platformData } = useApp()

  const confidence = computeReadinessConfidence(assessment, platformData ?? null)
  const score = confidence.measuredSections > 0 && assessment ? computeOverall(assessment) : null

  const scoreColor = score === null ? 'var(--text-3)' : score >= 70 ? '#059669' : score >= 50 ? '#D97706' : '#DC2626'

  const sections = {
    main:     nav.filter(n => n.section === 'main'),
    insights: nav.filter(n => n.section === 'insights'),
    system:   nav.filter(n => n.section === 'system'),
  }

  const unread = (notifications ?? []).filter(n => !n.read).length

  return (
    <aside className="w-60 h-screen flex flex-col shrink-0"
      style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>

      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PrepUpLogo size={32} />
            <div>
              <p className="font-display font-bold text-base leading-none" style={{ color: 'var(--text)' }}>
                PrepUp
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Placement intelligence</p>
            </div>
          </div>
          <button onClick={() => navigate('/notifications')} className="relative p-1 rounded-md hover:bg-[var(--bg-muted)]">
            <Bell size={16} style={{ color: 'var(--text-2)' }} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
                style={{ background: '#DC2626', fontSize: '9px' }}>{unread}</span>
            )}
          </button>
        </div>
      </div>

      {/* User chip */}
      {user && (
        <div className="mx-4 my-3 p-3 rounded-lg" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: 'var(--primary)' }}>
              {user.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text)' }}>{user.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                {user.domain || 'Career Health Center'}
                {score !== null && confidence.confidence !== 'High' && (
                  <span style={{ color: '#D97706' }}> · {confidence.confidence}</span>
                )}
              </p>
            </div>
            {score !== null && (
              <div className="text-right shrink-0">
                <AnimatedNumber value={score} suffix="%" className="text-sm font-bold" style={{ color: scoreColor }} />
              </div>
            )}
          </div>
            {score !== null && (
              <div className="mt-2.5">
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    initial={false}
                    animate={{ width: `${score}%`, background: scoreColor }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            )}
          {score === null && (
            <p className="text-xs mt-2 font-medium" style={{ color: '#6366f1' }}>
              Start a module in Career Health
            </p>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-4">
        <div>
          <p className="text-label px-3 mb-1.5">Main</p>
          <div className="space-y-0.5">
            {sections.main.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={15} />
                <span className="flex-1">{label}</span>
                {to === '/' && <ChevronRight size={12} style={{ color: 'var(--text-3)' }} />}
              </NavLink>
            ))}
          </div>
        </div>

        <div>
          <p className="text-label px-3 mb-1.5">Insights</p>
          <div className="space-y-0.5">
            {sections.insights.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={15} />
                <span className="flex-1">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div>
          <p className="text-label px-3 mb-1.5">System</p>
          <div className="space-y-0.5">
            {sections.system.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={15} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Backend status removed — sync is silent */}

      {/* Bottom actions */}
      <div className="px-3 pb-4 space-y-0.5" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <button onClick={() => setView('landing')} className="nav-item w-full">
          <Home size={15} /> Home
        </button>
        <button onClick={toggleTheme} className="nav-item w-full">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button onClick={signOut}
          className="nav-item w-full transition-colors"
          style={{ color: 'var(--text-2)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = '#FEF2F2' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'transparent' }}>
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </aside>
  )
}
