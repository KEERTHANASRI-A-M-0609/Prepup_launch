import mongoose, { Schema, Document } from 'mongoose'

export interface IMockInterview extends Document {
  userId: mongoose.Types.ObjectId
  sessionId: string
  type: 'technical' | 'behavioral' | 'mixed'
  score: number
  problemSolving: number
  communication: number
  technicalDepth: number
  confidence: number
  feedback: string[]
  questions: string[]
  transcript: string
  completedAt: Date
}

const mockInterviewSchema = new Schema<IMockInterview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: String, required: true },
    type: { type: String, enum: ['technical', 'behavioral', 'mixed'], default: 'mixed' },
    score: { type: Number, required: true, min: 0, max: 100 },
    problemSolving: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    technicalDepth: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    feedback: [{ type: String }],
    questions: [{ type: String }],
    transcript: { type: String, default: '' },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export const MockInterview = mongoose.model<IMockInterview>('MockInterview', mockInterviewSchema)
