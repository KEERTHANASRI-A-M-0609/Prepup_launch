import mongoose, { Schema, Document } from 'mongoose'

export interface InterviewStage {
  stage: string
  type: 'Online Assessment' | 'Technical Interview' | 'HR Interview' | 'Group Discussion'
  focusAreas: string[]
  difficulty: 'Easy' | 'Medium' | 'Hard'
  duration?: number // in minutes
}

export interface ICompany extends Document {
  name: string
  logo?: string
  description?: string
  industry?: string
  
  // Interview Requirements
  hasAptitudeTest: boolean
  aptitudeTypes?: ('Quantitative' | 'Logical' | 'Verbal')[]
  
  hasCommunicationRound: boolean
  communicationFormat?: 'Mock Interview' | 'Group Discussion' | 'Presentation'
  
  // Focus Areas
  focusAreas: string[] // e.g., ["DSA", "System Design", "OOPS", "Database", "Behavioral"]
  
  // Interview Sequence
  interviewSequence: InterviewStage[]
  
  // Metadata
  avgTimeToHire?: number // in days
  selectedStudents?: number // annually
  avgPackage?: number
  
  // Target Roles
  targetRoles: string[]
  
  createdAt: Date
  updatedAt: Date
}

const interviewStageSchema = new Schema<InterviewStage>(
  {
    stage: { type: String, required: true },
    type: { type: String, enum: ['Online Assessment', 'Technical Interview', 'HR Interview', 'Group Discussion'], required: true },
    focusAreas: [{ type: String }],
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    duration: { type: Number },
  },
  { _id: false }
)

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, unique: true },
    logo: { type: String },
    description: { type: String },
    industry: { type: String },
    
    hasAptitudeTest: { type: Boolean, default: false },
    aptitudeTypes: [{ type: String, enum: ['Quantitative', 'Logical', 'Verbal'] }],
    
    hasCommunicationRound: { type: Boolean, default: true },
    communicationFormat: { type: String, enum: ['Mock Interview', 'Group Discussion', 'Presentation'] },
    
    focusAreas: [{ type: String }],
    interviewSequence: [interviewStageSchema],
    
    avgTimeToHire: { type: Number },
    selectedStudents: { type: Number },
    avgPackage: { type: Number },
    
    targetRoles: [{ type: String }],
  },
  { timestamps: true }
)

export default mongoose.model<ICompany>('Company', companySchema)
