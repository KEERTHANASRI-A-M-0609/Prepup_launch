import { assessmentService, CompetencyGap, ReadinessScores } from './assessmentService'
import { User } from '../models/User'
import { logger } from '../utils/logger'

function generateGapRecommendation(blockers: CompetencyGap[]): string {
  if (blockers.length === 0) {
    return 'Great progress! Focus on polishing the medium-priority areas to reach excellence.'
  }
  if (blockers.length === 1) {
    return `Critical blocker identified: ${blockers[0].category}. Focus 70% of your time here. ${blockers[0].impact}`
  }
  const topBlockers = blockers.slice(0, 2).map((b) => b.category).join(' and ')
  return `Two critical areas need attention: ${topBlockers}. Allocate equal time between them. Then focus on other areas.`
}

export interface GapAnalysisResult {
  gaps: CompetencyGap[]
  blockers: CompetencyGap[]
  improvementAreas: CompetencyGap[]
  recommendation: string
}

export const gapService = {
  async analyzeGaps(userId: string): Promise<GapAnalysisResult> {
    try {
      const user = await User.findById(userId)
      if (!user) throw new Error('User not found')

      const assessment = await assessmentService.getLatestAssessment(userId)

      if (!assessment) {
        return {
          gaps: [],
          blockers: [],
          improvementAreas: [],
          recommendation: 'Complete an assessment first to identify gaps.',
        }
      }

      const scores: ReadinessScores = {
        dsa: assessment.dsa,
        projects: assessment.projects,
        resume: assessment.resume,
        communication: assessment.communication ?? 0,
        aptitude: assessment.aptitude ?? 0,
        interview: assessment.interview ?? 0,
        overall: assessment.overall,
      }

      const allGaps = assessmentService.calculateGaps(scores, user.targetRole)

      const blockers = allGaps.filter((g) => g.priority === 'Critical' || g.priority === 'High')
      const improvementAreas = allGaps.filter((g) => g.priority === 'Medium' || g.priority === 'Low')

      const recommendation = generateGapRecommendation(blockers)

      logger.info(`Gap analysis completed for user ${userId}`)

      return {
        gaps: allGaps,
        blockers,
        improvementAreas,
        recommendation,
      }
    } catch (error) {
      logger.error('Gap analysis error:', error)
      throw error
    }
  },

  async getGapTrend(userId: string, days = 30) {
    try {
      const user = await User.findById(userId)
      const assessmentHistory = await assessmentService.getAssessmentHistory(userId, 10)

      return assessmentHistory
        .reverse() // Show oldest first for trend
        .filter((a) => {
          const assessmentDate = new Date(a.completedAt)
          const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          return assessmentDate >= cutoffDate
        })
        .map((a) => {
          // Need to fetch user's target role for accurate gap calculation
          const gaps = assessmentService.calculateGaps({
            dsa: a.dsa,
            projects: a.projects,
            resume: a.resume,
            communication: a.communication,
            aptitude: a.aptitude,
            overall: a.overall,
          }, user?.targetRole || 'Software Engineer') // Default to SE if user not found

          return {
            date: a.completedAt,
            totalGapSize: gaps.reduce((sum, g) => sum + g.gap, 0),
            criticalGaps: gaps.filter((g) => g.priority === 'Critical').length,
            highGaps: gaps.filter((g) => g.priority === 'High').length,
          }
        })
    } catch (error) {
      logger.error('Get gap trend error:', error)
      throw error
    }
  },

  async getPrioritizedActions(userId: string) {
    try {
      const user = await User.findById(userId)
      if (!user) throw new Error('User not found')

      const gapAnalysis = await this.analyzeGaps(userId)

      // Convert gaps to actionable tasks
      // This will be replaced by the Daily Execution Engine (Phase 7)
      const actions = gapAnalysis.blockers.slice(0, 3).map((gap, index) => { // Limit to top 3 blockers
        const categoryTaskMap: Record<string, string> = {
          dsa: `Solve 3 medium DSA problems focusing on ${gap.category} topics`,
          projects: `Build or improve 1 project with clear documentation for ${gap.category}`,
          resume: `Get resume reviewed and increase ATS score by 10% for ${gap.category}`,
          communication: `Schedule 2 mock interviews this week focusing on ${gap.category}`,
          aptitude: `Solve 20 aptitude practice problems for ${gap.category}`,
          interview: `Analyze past interview feedback and prepare for ${gap.category} questions`,
        }

        return {
          priority: index + 1,
          category: gap.category, // e.g., 'dsa'
          task: categoryTaskMap[gap.category] || 'Improve this area',
          estimatedTime: 60 + index * 15, // 60, 75, 90 mins
          impact: gap.impact,
        }
      })

      return actions
    } catch (error) {
      logger.error('Get prioritized actions error:', error)
      throw error
    }
  },
}
