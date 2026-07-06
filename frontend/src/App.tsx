import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppProvider, useApp } from './store/AppContext'
import PageTransition from './components/motion/PageTransition'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import AssessmentFlow from './pages/Assessment'
import CommandShell from './components/shell/CommandShell'
import AssessmentNudge from './components/AssessmentNudge'
import Dashboard from './pages/Dashboard'
import Preparation from './pages/Preparation'
import Applications from './pages/Applications'
import Readiness from './pages/Readiness'
import FailureIntelligence from './pages/FailureIntelligence'
import CareerHealth from './pages/CareerHealth'
import WeeklyReports from './pages/WeeklyReports'
import Settings from './pages/Settings'
import DailyPlanner from './pages/DailyPlanner'
import MomentumCenter from './pages/MomentumCenter'
import ResourceRecommender from './pages/ResourceRecommender'
import CareerWorkspace from './pages/CareerWorkspace'
import NotificationsPanel from './pages/Notifications'
import KnowledgeHub from './pages/KnowledgeHub'
import CareerChatWidget from './components/chat/CareerChatWidget'

function AppShell() {
  const { view, user } = useApp()
  const location = useLocation()

  if (view === 'landing')    return <Landing />
  if (view === 'login')      return <><Auth /><CareerChatWidget guest={!user} /></>
  if (view === 'onboarding') return <><Onboarding /><CareerChatWidget guest={!user} /></>
  if (view === 'assessment') return <><AssessmentFlow /><CareerChatWidget /></>

  return (
    <CommandShell>
      <AnimatePresence mode="wait">
        <PageTransition routeKey={location.pathname}>
          <Routes location={location}>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/preparation"  element={<Preparation />} />
            <Route path="/resources"    element={<ResourceRecommender />} />
            <Route path="/planner"      element={<DailyPlanner />} />
            <Route path="/momentum"    element={<MomentumCenter />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/readiness"    element={<Readiness />} />
            <Route path="/failures"     element={<FailureIntelligence />} />
            <Route path="/health"       element={<CareerHealth />} />
            <Route path="/reports"      element={<WeeklyReports />} />
            <Route path="/knowledge"      element={<KnowledgeHub />} />
            <Route path="/settings"     element={<Settings />} />
            <Route path="/workspace"     element={<CareerWorkspace />} />
            <Route path="/notifications" element={<NotificationsPanel />} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </PageTransition>
      </AnimatePresence>
      <AssessmentNudge />
    </CommandShell>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AppProvider>
  )
}
