import mongoose, { Schema, Document } from 'mongoose'

export interface IFailureEntry extends Document {
  userId: mongoose.Types.ObjectId
  company: string
  role: string
  round: string
  interviewDate: Date
  questionsAsked: string
  topicsAsked: string[] // Added for Phase 12
  whereDidYouStruggle: string // Added for Phase 12
  selfReflection: string // Added for Phase 12
  difficulty: 'Easy' | 'Medium' | 'Hard'
  confidence: 1 | 2 | 3 | 4 | 5
  rejectionReason: 'DSA' | 'Projects' | 'Communication' | 'System Design' | 'Behavioral' | 'Unknown' // Added Behavioral
  tags: string[] // Topics or keywords related to the failure
  insights: string[]
}

const failureEntrySchema = new Schema<IFailureEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    round: { type: String, required: true },
    interviewDate: { type: Date, required: true, index: true },
    questionsAsked: { type: String, default: '' }, // Detailed questions
    topicsAsked: [{ type: String }], // e.g., ['Graphs', 'Dynamic Programming']
    whereDidYouStruggle: { type: String, default: '' }, // User's self-assessment
    selfReflection: { type: String, default: '' }, // User's reflection
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    confidence: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
    rejectionReason: {
      type: String,
      enum: ['DSA', 'Projects', 'Communication', 'System Design', 'Behavioral', 'Unknown'],
      required: true,
    },
    tags: [String],
    insights: [String],
  },
  { timestamps: true }
)

export const FailureEntry = mongoose.model<IFailureEntry>('FailureEntry', failureEntrySchema)
