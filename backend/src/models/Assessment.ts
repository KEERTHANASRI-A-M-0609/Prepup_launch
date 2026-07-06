import mongoose, { Schema, Document } from 'mongoose'

export interface IAssessment extends Document {
  userId: mongoose.Types.ObjectId
  
  // Core Evidence (Required)
  dsa: number // From LeetCode/CodeChef/HackerRank
  projects: number // From GitHub analysis
  resume: number // From resume upload
  
  // Optional Evidence
  communication?: number // From voice recordings
  aptitude?: number // From mini-assessments
  interview?: number // From mock interviews
  
  // Overall Scores
  overall: number
  placementProbability?: number
  
  // Recommended Assessments
  recommendedAssessments?: {
    type: 'Communication' | 'Aptitude'
    reason: string
    forCompanies: string[] // Company names
    priority: 'High' | 'Medium' | 'Low'
  }[]
  
  // Details
  details: {
    dsa: {
      easyCount: number
      mediumCount: number
      hardCount: number
      platforms: string[]
      lastUpdated: Date
    }
    projects: {
      count: number
      complexity: string[]
      hasGithub: boolean
      lastUpdated: Date
    }
    resume: {
      atsScore: number
      completeness: number
      uploadedAt: Date
    }
    communication?: {
      mockInterviewScore: number
      confidenceRating: number
      attempts: number
      completedAt?: Date
    }
    aptitude?: {
      score: number
      quantitative?: number
      logical?: number
      verbal?: number
      completedAt?: Date
    }
  }
  
  completedAt: Date
}

const assessmentSchema = new Schema<IAssessment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    // Core Evidence
    dsa: { type: Number, required: true, min: 0, max: 100 },
    projects: { type: Number, required: true, min: 0, max: 100 },
    resume: { type: Number, required: true, min: 0, max: 100 },
    
    // Optional Evidence
    communication: { type: Number, min: 0, max: 100, default: null },
    aptitude: { type: Number, min: 0, max: 100, default: null },
    interview: { type: Number, min: 0, max: 100, default: 0 },
    
    overall: { type: Number, min: 0, max: 100 },
    placementProbability: { type: Number, min: 0, max: 100 },
    
    // Recommendations
    recommendedAssessments: [
      {
        type: { type: String, enum: ['Communication', 'Aptitude'] },
        reason: { type: String },
        forCompanies: [String],
        priority: { type: String, enum: ['High', 'Medium', 'Low'] },
      },
    ],
    
    details: {
      dsa: {
        easyCount: { type: Number, default: 0 },
        mediumCount: { type: Number, default: 0 },
        hardCount: { type: Number, default: 0 },
        platforms: [String],
        lastUpdated: { type: Date, default: Date.now },
      },
      projects: {
        count: { type: Number, default: 0 },
        complexity: [String],
        hasGithub: { type: Boolean, default: false },
        lastUpdated: { type: Date, default: Date.now },
      },
      resume: {
        atsScore: { type: Number, default: 0 },
        completeness: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: Date.now },
      },
      communication: {
        mockInterviewScore: { type: Number, default: 0 },
      confidenceRating: { type: Number, min: 0, max: 100, default: 0 },
        attempts: { type: Number, default: 0 },
        completedAt: { type: Date },
      clarity: { type: Number, min: 0, max: 100, default: 0 }, 
      pace: { type: Number, min: 0, max: 100, default: 0 },
      confidence: { type: Number, min: 0, max: 100, default: 0 },
      fillerWordFrequency: { type: Number, default: 0 },
      transcript: { type: String }, // New for Comm Assessment
      audioUrl: { type: String },
      },
      aptitude: {
        score: { type: Number, default: 0 },
      quantitative: { type: Number, min: 0, max: 100 },
      logical: { type: Number, min: 0, max: 100 },
      verbal: { type: Number, min: 0, max: 100 },
        completedAt: { type: Date },
      },
    },
    
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export const Assessment = mongoose.model<IAssessment>('Assessment', assessmentSchema)
