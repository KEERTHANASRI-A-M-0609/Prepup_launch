import mongoose, { Schema, Document } from 'mongoose'

export interface ICareerProfile extends Document {
  userId: mongoose.Types.ObjectId
  dsa: number
  resume: number
  projects: number
  communication: number
  aptitude: number
  interview: number
  overall: number
  resumeEvidence?: Record<string, unknown>
  commEvidence?: Record<string, unknown>
  aptitudeEvidence?: Record<string, unknown>
  platformData?: Record<string, unknown>
  codingProfile?: Record<string, unknown>
  skippedModules: Record<string, string>
  assessedAt?: Date
}

const careerProfileSchema = new Schema<ICareerProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    dsa: { type: Number, default: 0, min: 0, max: 100 },
    resume: { type: Number, default: 0, min: 0, max: 100 },
    projects: { type: Number, default: 0, min: 0, max: 100 },
    communication: { type: Number, default: 0, min: 0, max: 100 },
    aptitude: { type: Number, default: 0, min: 0, max: 100 },
    interview: { type: Number, default: 0, min: 0, max: 100 },
    overall: { type: Number, default: 0, min: 0, max: 100 },
    resumeEvidence: { type: Schema.Types.Mixed },
    commEvidence: { type: Schema.Types.Mixed },
    aptitudeEvidence: { type: Schema.Types.Mixed },
    platformData: { type: Schema.Types.Mixed },
    codingProfile: { type: Schema.Types.Mixed },
    skippedModules: { type: Schema.Types.Mixed, default: {} },
    assessedAt: { type: Date },
  },
  { timestamps: true }
)

export const CareerProfile = mongoose.model<ICareerProfile>('CareerProfile', careerProfileSchema)
