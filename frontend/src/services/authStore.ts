import type { UserProfile, Assessment, RecoveryState, Application, FailureEntry, DSATopic, Project, ActivityLog, WeekSnapshot, PlatformData, KnowledgeData } from '../types'
import type { WhatsAppPrefs } from '../services/whatsappService'

import { ACCOUNTS_KEY } from './storageKeys'

export { ACCOUNTS_KEY }

export type UserSessionData = {
  assessment?: Assessment | null
  studentId?: number | null
  platformData?: PlatformData | null
  applications?: Application[]
  failures?: FailureEntry[]
  projects?: Project[]
  activityLog?: ActivityLog[]
  weeklySnapshots?: WeekSnapshot[]
  dsaTopics?: DSATopic[]
  recovery?: RecoveryState
  notifications?: { id: string; title: string; message: string; type: string; createdAt: string; read: boolean }[]
  whatsappPrefs?: WhatsAppPrefs
  nudgeDismissed?: boolean
  theme?: 'light' | 'dark'
  knowledge?: KnowledgeData
}

export type Account = {
  name: string
  email: string
  phone: string
  passwordHash: string
  profile?: UserProfile
  session?: UserSessionData
}
export function loadAccounts(): Account[] {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]') } catch { return [] }
}

export function saveAccount(a: Account) {
  const accounts = loadAccounts().filter(x => x.email !== a.email)
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, a]))
}

export function findAccount(email: string): Account | undefined {
  return loadAccounts().find(a => a.email === email.trim().toLowerCase())
}

export function hashPw(pw: string) {
  let h = 0
  for (let i = 0; i < pw.length; i++) { h = ((h << 5) - h) + pw.charCodeAt(i); h |= 0 }
  return String(h)
}

export function accountExists(email: string): boolean {
  return !!findAccount(email)
}

export function verifySession(user: UserProfile | null): boolean {
  if (!user?.email) return false
  return accountExists(user.email)
}

export function saveUserSession(email: string, session: UserSessionData) {
  const account = findAccount(email)
  if (!account) return
  saveAccount({ ...account, session })
}

export function loadUserSession(email: string): UserSessionData | undefined {
  return findAccount(email)?.session
}
