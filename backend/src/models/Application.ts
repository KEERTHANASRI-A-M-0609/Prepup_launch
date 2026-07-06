import mongoose, { Schema, Document } from 'mongoose'

export interface IApplication extends Document {
  userId: mongoose.Types.ObjectId
  company: string
  role: string
  status: 'Wishlist' | 'Applied' | 'Online Assessment' | 'Technical Interview' | 'HR Interview' | 'Selected' | 'Rejected'
  appliedDate: Date
  deadline?: Date
  notes: string
  interviewRounds: {
    roundNumber: number
    type: 'Online Assessment' | 'Technical' | 'HR'
    questionsAsked: string
    difficulty: 'Easy' | 'Medium' | 'Hard'
    performanceRating: number
  }[]
}

const applicationSchema = new Schema<IApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    status: {
      type: String,
      enum: ['Wishlist', 'Applied', 'Online Assessment', 'Technical Interview', 'HR Interview', 'Selected', 'Rejected'],
      default: 'Wishlist',
    },
    appliedDate: { type: Date, default: Date.now },
    deadline: { type: Date },
    notes: { type: String, default: '' },
    interviewRounds: [
      {
        roundNumber: Number,
        type: String,
        questionsAsked: String,
        difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
        performanceRating: { type: Number, min: 1, max: 5 },
      },
    ],
  },
  { timestamps: true }
)

export const Application = mongoose.model<IApplication>('Application', applicationSchema)
