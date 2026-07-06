import { Schema, model, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  email: string
  password: string
  name: string
  targetRole: string
  college: string
  branch: string
  graduationYear: number
  cgpa: number
  weeklyHours: number
  lastActive: Date
  createdAt: Date
  targetCompanies: string[]
  currentStage: 'Just Started' | 'Preparing' | 'Interview Ready'
  resumeUrl?: string
  githubUrl?: string
  leetcodeUrl?: string
  hackerrankUrl?: string
  codechefUrl?: string
  linkedinUrl?: string
  otherRole?: string
  phone?: string
  onboardingCompleted: boolean
  onboardingStep: number
  activityLog?: {
    date: string
    tasksCompleted: number
    hoursSpent: number
    verifiedTasks?: number
    executions?: number
  }[]
  notificationPrefs?: {
    emailInactive?: boolean
    whatsappInactive?: boolean
    emailDigest?: boolean
    emailAlerts?: boolean
    whatsappEnabled?: boolean
    whatsappUrgent?: boolean
    whatsappDailyDigest?: boolean
    whatsappWeeklyReport?: boolean
    whatsappApplicationAlerts?: boolean
  }
  lastInactiveReminderDays?: number
  lastDailyDigestDate?: string
  lastWeeklyReportDate?: string
  lastDailyChallengeDate?: string
  knowledgeData?: Record<string, unknown>
  intelligenceEvents?: {
    phase: 'identity' | 'evidence' | 'intelligence' | 'execution'
    type: string
    title: string
    impact: string
    meta?: Record<string, unknown>
    at: Date
  }[]
  comparePassword(candidate: string): Promise<boolean>
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  name: { type: String, required: true },
  college: { type: String, default: '' },
  branch: { type: String, default: '' },
  graduationYear: { type: Number, default: 2025 },
  cgpa: { type: Number, default: 0 },
  targetRole: { type: String, default: 'Software Engineer' },
  targetCompanies: [{ type: String }],
  weeklyHours: { type: Number, default: 10 },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  currentStage: { type: String, enum: ['Just Started', 'Preparing', 'Interview Ready'], default: 'Just Started' },
  resumeUrl: String,
  githubUrl: String,
  leetcodeUrl: String,
  hackerrankUrl: String,
  codechefUrl: String,
  linkedinUrl: String,
  otherRole: String,
  phone: String,
  onboardingCompleted: { type: Boolean, default: false },
  onboardingStep: { type: Number, default: 1 },
  activityLog: [{
    date: String,
    tasksCompleted: { type: Number, default: 0 },
    hoursSpent: { type: Number, default: 0 },
    verifiedTasks: { type: Number, default: 0 },
    executions: { type: Number, default: 0 },
  }],
  notificationPrefs: {
    emailInactive: { type: Boolean, default: true },
    whatsappInactive: { type: Boolean, default: true },
    emailDigest: { type: Boolean, default: true },
    emailAlerts: { type: Boolean, default: true },
    whatsappEnabled: { type: Boolean, default: true },
    whatsappUrgent: { type: Boolean, default: true },
    whatsappDailyDigest: { type: Boolean, default: true },
    whatsappWeeklyReport: { type: Boolean, default: true },
    whatsappApplicationAlerts: { type: Boolean, default: true },
  },
  lastInactiveReminderDays: { type: Number, default: 0 },
  lastDailyDigestDate: String,
  lastWeeklyReportDate: String,
  lastDailyChallengeDate: String,
  knowledgeData: { type: Schema.Types.Mixed, default: null },
  intelligenceEvents: [{
    phase: { type: String, enum: ['identity', 'evidence', 'intelligence', 'execution'], required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    impact: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
    at: { type: Date, default: Date.now },
  }],
})

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password)
}

export const User = model<IUser>('User', userSchema)
