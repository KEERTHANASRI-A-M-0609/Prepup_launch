import mongoose from 'mongoose'
import { User } from '../models/User'
import { Application } from '../models/Application'
import { FailureEntry } from '../models/FailureEntry'
import { CareerProfile } from '../models/CareerProfile'
import { healthCenterService } from './healthCenterService'

const HOURS_REVERSE: Record<number, string> = {
  5: '0 – 5 hrs',
  8: '5 – 10 hrs',
  15: '10 – 20 hrs',
  25: '20+ hrs',
}

function weeklyHoursLabel(n: number): string {
  return HOURS_REVERSE[n] ?? '10 – 20 hrs'
}

export const sessionLoadService = {
  async loadUserSession(userId: string) {
    const uid = new mongoose.Types.ObjectId(userId)
    const [user, applications, failures, dashboard] = await Promise.all([
      User.findById(uid).select('-password').lean(),
      Application.find({ userId: uid }).sort({ updatedAt: -1 }).lean(),
      FailureEntry.find({ userId: uid }).sort({ interviewDate: -1 }).lean(),
      healthCenterService.getDashboard(userId).catch(() => null),
    ])

    if (!user) return null

    const profile = {
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      college: user.college ?? '',
      branch: user.branch ?? '',
      graduationYear: String(user.graduationYear ?? 2025),
      cgpa: String(user.cgpa ?? ''),
      domain: user.otherRole || user.targetRole || '',
      targetRole: user.targetRole || '',
      targetCompanies: user.targetCompanies ?? [],
      weeklyHours: weeklyHoursLabel(user.weeklyHours ?? 10),
      level: 'intermediate' as const,
      goal: 'placement' as const,
    }

    const assessment = dashboard?.profile
      ? {
          dsa: dashboard.profile.dsa ?? 0,
          resume: dashboard.profile.resume ?? 0,
          projects: dashboard.profile.projects ?? 0,
          communication: dashboard.profile.communication ?? 0,
          aptitude: dashboard.profile.aptitude ?? 0,
          interview: dashboard.profile.interview ?? 0,
          resumeEvidence: dashboard.profile.resumeEvidence,
          commEvidence: dashboard.profile.commEvidence,
          aptitudeEvidence: dashboard.profile.aptitudeEvidence,
          assessedAt: dashboard.profile.assessedAt,
        }
      : null

    const platformData = dashboard?.profile?.platformData ?? null

    return {
      profile,
      assessment,
      platformData,
      applications: applications.map((a) => ({
        id: String(a._id),
        company: a.company,
        role: a.role,
        status: a.status,
        deadline: a.deadline ? new Date(a.deadline).toISOString().slice(0, 10) : '',
        notes: a.notes ?? '',
      })),
      failures: failures.map((f) => ({
        id: String(f._id),
        company: f.company,
        role: f.role,
        round: f.round,
        date: f.interviewDate ? new Date(f.interviewDate).toISOString().slice(0, 10) : '',
        questionsAsked: f.questionsAsked ?? '',
        confidence: f.confidence,
        difficulty: f.difficulty,
        reason: f.rejectionReason,
        tags: f.tags ?? [],
      })),
      activityLog: user.activityLog ?? [],
      knowledgeData: (user as { knowledgeData?: Record<string, unknown> }).knowledgeData ?? null,
      intelligenceEvents: (user as { intelligenceEvents?: unknown[] }).intelligenceEvents?.map(e => {
        const ev = e as { phase: string; type: string; title: string; impact: string; meta?: Record<string, unknown>; at: Date }
        return {
          phase: ev.phase,
          type: ev.type,
          title: ev.title,
          impact: ev.impact,
          meta: ev.meta ?? {},
          at: ev.at instanceof Date ? ev.at.toISOString() : String(ev.at),
        }
      }).reverse().slice(0, 40) ?? [],
      syncedAt: new Date().toISOString(),
    }
  },
}
