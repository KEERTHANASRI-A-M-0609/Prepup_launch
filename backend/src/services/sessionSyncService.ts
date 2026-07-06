import mongoose from 'mongoose'
import { User } from '../models/User'
import { Application } from '../models/Application'
import { FailureEntry } from '../models/FailureEntry'
import { healthCenterService } from './healthCenterService'
import { logger } from '../utils/logger'

const HOURS_MAP: Record<string, number> = {
  '0 – 5 hrs': 5,
  '5 – 10 hrs': 8,
  '10 – 20 hrs': 15,
  '20+ hrs': 25,
}

export interface SyncSessionPayload {
  profile?: {
    name?: string
    email?: string
    phone?: string
    college?: string
    branch?: string
    graduationYear?: string | number
    cgpa?: string | number
    domain?: string
    targetRole?: string
    targetCompanies?: string[]
    weeklyHours?: string | number
    level?: string
    goal?: string
  }
  assessment?: Record<string, unknown> | null
  platformData?: Record<string, unknown> | null
  applications?: Array<{
    id?: string
    company: string
    role: string
    status: string
    deadline?: string
    notes?: string
  }>
  failures?: Array<{
    id?: string
    company: string
    role: string
    round: string
    date: string
    questionsAsked?: string
    confidence: number
    difficulty: string
    reason: string
    tags?: string[]
  }>
  activityLog?: {
    date: string
    tasksCompleted: number
    hoursSpent: number
    verifiedTasks?: number
    executions?: number
  }[]
  knowledgeData?: Record<string, unknown> | null
}

function parseWeeklyHours(v: string | number | undefined): number {
  if (typeof v === 'number') return v
  if (!v) return 10
  return HOURS_MAP[v] ?? (parseInt(String(v), 10) || 10)
}

function mapRejectionReason(reason: string): 'DSA' | 'Projects' | 'Communication' | 'System Design' | 'Behavioral' | 'Unknown' {
  const r = reason.toLowerCase()
  if (r.includes('dsa') || r.includes('coding') || r.includes('algorithm')) return 'DSA'
  if (r.includes('project')) return 'Projects'
  if (r.includes('comm')) return 'Communication'
  if (r.includes('system') || r.includes('design')) return 'System Design'
  if (r.includes('behavior') || r.includes('hr')) return 'Behavioral'
  return 'Unknown'
}

export const sessionSyncService = {
  async syncUserSession(userId: string, payload: SyncSessionPayload) {
    const uid = new mongoose.Types.ObjectId(userId)
    const results: Record<string, number | boolean> = {}

    if (payload.profile) {
      const p = payload.profile
      const domain = p.domain?.trim() || ''
      const role = p.targetRole?.trim() || domain || 'Software Engineer'
      await User.findByIdAndUpdate(uid, {
        ...(p.name ? { name: p.name } : {}),
        ...(p.phone !== undefined ? { phone: p.phone || undefined } : {}),
        ...(p.college !== undefined ? { college: p.college || '' } : {}),
        ...(p.branch !== undefined ? { branch: p.branch || '' } : {}),
        ...(p.graduationYear !== undefined
          ? { graduationYear: parseInt(String(p.graduationYear), 10) || 2025 }
          : {}),
        ...(p.cgpa !== undefined ? { cgpa: parseFloat(String(p.cgpa)) || 0 } : {}),
        targetRole: role,
        otherRole: domain || undefined,
        ...(p.targetCompanies ? { targetCompanies: p.targetCompanies } : {}),
        weeklyHours: parseWeeklyHours(p.weeklyHours),
        onboardingCompleted: Boolean(domain),
        lastActive: new Date(),
        ...(payload.activityLog ? { activityLog: payload.activityLog } : {}),
      })
      results.profileUpdated = true
    } else if (payload.activityLog) {
      await User.findByIdAndUpdate(uid, { activityLog: payload.activityLog, lastActive: new Date() })
    }

    if (payload.knowledgeData !== undefined) {
      await User.findByIdAndUpdate(uid, { knowledgeData: payload.knowledgeData, lastActive: new Date() })
      results.knowledgeSynced = true
    }

    if (payload.assessment || payload.platformData) {
      await healthCenterService.syncProfile(userId, {
        ...(payload.assessment ?? {}),
        ...(payload.platformData ? { platformData: payload.platformData } : {}),
      })
      results.assessmentSynced = true
    }

    if (payload.applications) {
      await Application.deleteMany({ userId: uid })
      if (payload.applications.length > 0) {
        const docs = payload.applications.map((a) => ({
          userId: uid,
          company: a.company,
          role: a.role,
          status: a.status,
          appliedDate: new Date(),
          deadline: a.deadline ? new Date(a.deadline) : undefined,
          notes: a.notes ?? '',
          interviewRounds: [],
        }))
        await Application.insertMany(docs)
      }
      results.applications = payload.applications.length
    }

    if (payload.failures) {
      await FailureEntry.deleteMany({ userId: uid })
      if (payload.failures.length > 0) {
        const docs = payload.failures.map((f) => ({
          userId: uid,
          company: f.company,
          role: f.role,
          round: f.round,
          interviewDate: f.date ? new Date(f.date) : new Date(),
          questionsAsked: f.questionsAsked ?? '',
          topicsAsked: f.tags ?? [],
          whereDidYouStruggle: '',
          selfReflection: '',
          difficulty: f.difficulty as 'Easy' | 'Medium' | 'Hard',
          confidence: Math.min(5, Math.max(1, f.confidence)) as 1 | 2 | 3 | 4 | 5,
          rejectionReason: mapRejectionReason(f.reason),
          tags: f.tags ?? [],
          insights: [],
        }))
        await FailureEntry.insertMany(docs)
      }
      results.failures = payload.failures.length
    }

    logger.info(`Session synced for user ${userId}: ${JSON.stringify(results)}`)
    return { success: true, synced: results }
  },
}
