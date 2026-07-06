import { Assessment, IAssessment } from '../models/Assessment'
import { User } from '../models/User'
import { logger } from '../utils/logger'

export interface ReadinessScores {
  dsa: number
  projects: number
  resume: number
  communication: number
  aptitude: number
  interview: number // Added for Phase 4
  overall: number
}

export interface CompetencyGap {
  category: string
  expected: number
  current: number
  gap: number
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  impact: string
}

// Role-specific expectations
const roleExpectations: Record<string, ReadinessScores> = {
  'Software Engineer': {
    dsa: 75,
    projects: 70,
    resume: 70,
    communication: 65,
    aptitude: 60,
    overall: 68,
  },
  'Product Manager': {
    dsa: 50,
    projects: 60,
    resume: 75,
    communication: 80,
    aptitude: 70,
    overall: 67,
  },
  'Data Scientist': {
    dsa: 70,
    projects: 75,
    resume: 70,
    communication: 60,
    aptitude: 75,
    overall: 70,
  },
  'Data Analyst': {
    dsa: 60,
    projects: 65,
    resume: 70,
    communication: 65,
    aptitude: 70,
    overall: 66,
  },
  'Cybersecurity': {
    dsa: 70,
    projects: 70,
    resume: 70,
    communication: 60,
    aptitude: 70,
    overall: 68,
  },
  'UI UX Designer': {
    dsa: 30,
    projects: 80,
    resume: 75,
    communication: 75,
    aptitude: 50,
    overall: 62,
  },
}

function getGapImpact(category: string, gap: number): string {
  const impacts: Record<string, string> = {
    dsa: `DSA gap of ${gap} is blocking ${Math.min(60, gap * 1.5)}% of technical interviews`,
    projects: `Project gap of ${gap} reduces visibility by ${Math.min(40, gap * 1.2)}%`,
    resume: `Resume gap of ${gap} directly impacts ${Math.min(30, gap)}% of selections`,
    communication: `Communication gap of ${gap} affects all interview rounds equally`,
    aptitude: `Aptitude gap of ${gap} affects ${Math.min(35, gap * 1.3)}% of pre-placement tests`,
    interview: `Interview performance gap of ${gap} is a critical factor in final selection.`,
  }
  return impacts[category] || `Gap in ${category} of ${gap} needs attention`
}

export const assessmentService = {
  async calculateReadiness(assessmentData: Partial<IAssessment>, userId: string, targetRole: string): Promise<ReadinessScores> {
    try {
      const dsa = assessmentData.dsa ?? 0
      const projects = assessmentData.projects ?? 0
      const resume = assessmentData.resume ?? 0
      const interview = assessmentData.interview ?? 0
      const communication = assessmentData.communication ?? null
      const aptitude = assessmentData.aptitude ?? null

      // Evidence-based weighted average
      // Core scores (always required): DSA, Projects, Resume
      // Optional scores: Communication, Aptitude
      
      // If optional assessments exist, include them; otherwise adjust weights
      let overall: number
      
      if (communication !== null && aptitude !== null) {
        // All optional assessments completed
        overall = Math.round(
          dsa * 0.25 + projects * 0.20 + resume * 0.15 + communication * 0.15 + aptitude * 0.15 + (interview ?? 0) * 0.10
        )
      } else if (communication !== null) {
        // Communication completed, but no aptitude
        // Redistribute weights for DSA, Projects, Resume, Communication, Interview
        overall = Math.round(
          dsa * 0.28 + projects * 0.22 + resume * 0.17 + communication * 0.18 + (interview ?? 0) * 0.15
        )
      } else if (aptitude !== null) {
        // Aptitude completed, but no communication
        // Redistribute weights for DSA, Projects, Resume, Aptitude, Interview
        overall = Math.round(
          dsa * 0.28 + projects * 0.22 + resume * 0.17 + aptitude * 0.18 + (interview ?? 0) * 0.15
        )
      } else {
        // Only core assessments (DSA, Projects, Resume, Interview)
        overall = Math.round(
          dsa * 0.35 + projects * 0.25 + resume * 0.20 + (interview ?? 0) * 0.20
        )
      }

      const scores: ReadinessScores = { 
        dsa, 
        projects, 
        resume, 
        communication: communication ?? 0,
        aptitude: aptitude ?? 0,
        interview: interview ?? 0,
        overall 
      }

      logger.info(`Readiness calculated for user ${userId}:`, scores)

      return scores
    } catch (error) {
      logger.error('Readiness calculation error:', error)
      throw error
    }
  },

  async saveAssessment(userId: string, assessmentData: Partial<IAssessment>): Promise<IAssessment> {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const scores = await this.calculateReadiness(assessmentData, userId, user.targetRole);

      const assessment = new Assessment({
        userId,
        ...assessmentData,
        ...scores,
        completedAt: new Date(),
      })

      await assessment.save()

      logger.info(`Assessment saved for user ${userId}`)

      return assessment
    } catch (error) {
      logger.error('Save assessment error:', error)
      throw error
    }
  },

  async getLatestAssessment(userId: string): Promise<IAssessment | null> {
    return Assessment.findOne({ userId }).sort({ completedAt: -1 })
  },

  async getAssessmentHistory(userId: string, limit = 10): Promise<IAssessment[]> {
    return Assessment.find({ userId }).sort({ completedAt: -1 }).limit(limit)
  },

  calculateGaps(assessment: ReadinessScores, targetRole: string): CompetencyGap[] {
    const expectations = roleExpectations[targetRole || 'Software Engineer']

    const gaps = Object.entries(assessment)
      .filter(([key]) => key !== 'overall')
      .map(([category, current]) => {
        const expected = expectations[category as keyof ReadinessScores]
        const gap = Math.max(0, expected - current)
        const gapPercent = (gap / expected) * 100

        let priority: 'Critical' | 'High' | 'Medium' | 'Low'
        if (gapPercent >= 40) priority = 'Critical'
        else if (gapPercent >= 25) priority = 'High'
        else if (gapPercent >= 15) priority = 'Medium'
        else priority = 'Low'

        return {
          category,
          expected,
          current,
          gap,
          priority,
          impact: getGapImpact(category, gap),
        }
      })
      .sort((a, b) => b.gap - a.gap)

    return gaps
  },

  async getReadinessTrend(userId: string, days = 30): Promise<{ date: string; score: number }[]> {
    const assessments = await Assessment.find({
      userId,
      completedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    }).sort({ completedAt: 1 })

    return assessments.map((a) => ({
      date: a.completedAt.toISOString().split('T')[0],
      score: a.overall,
    }))
  },
}
