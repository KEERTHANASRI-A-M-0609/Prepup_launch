import { Application } from '../models/Application'
import { FailureEntry } from '../models/FailureEntry'
import { Assessment } from '../models/Assessment'
import { User } from '../models/User' // Import User model
import { logger } from '../utils/logger'

export interface FailurePattern {
  reason: string
  count: number
  percentage: number
  relatedTopics: string[]
}

export interface FailureAnalysis {
  totalFailures: number
  patterns: FailurePattern[]
  mostCommonReason: string
  commonRejectionRate: number
  topicsToFocus: string[]
  recommendation: string
}

function getRelatedTopics(reason: string): string[] {
  const topicMap: Record<string, string[]> = {
    DSA: ['Array', 'String', 'Tree', 'Graph', 'DP', 'Sorting', 'Hashing'],
    Projects: ['GitHub Portfolio', 'Deployment', 'Complexity', 'Documentation', 'Real-world Scale'],
    Communication: ['English', 'Clarity', 'Confidence', 'Body Language', 'Listening'],
    'System Design': ['Scalability', 'Architecture', 'Database Design', 'Caching', 'Load Balancing'],
    Behavioral: ['STAR Method', 'Leadership Principles', 'Teamwork', 'Conflict Resolution'],
    Unknown: ['General Preparation'],
  }
  return topicMap[reason] || ['General Preparation']
}

function generateFailureRecommendation(topReason: string, rejectionRate: number): string {
  if (rejectionRate >= 60) {
    return `${topReason} is a critical blocker (${rejectionRate}% of rejections). Focus intensively on improving this area before next interviews.`
  } else if (rejectionRate >= 40) {
    return `${topReason} is a significant issue (${rejectionRate}% of rejections). Dedicate 60% of your prep time to this.`
  } else if (rejectionRate >= 20) {
    return `${topReason} is impacting some interviews (${rejectionRate}% of rejections). Balanced improvement needed.`
  }
  return `Multiple factors are contributing to rejections. Work on all weak areas systematically.`
}

export const failureAnalysisService = {
  async recordFailure(userId: string, failureData: any) {
    try {
      const failure = new FailureEntry({
        // Ensure all new fields are captured
        questionsAsked: failureData.questionsAsked || '',
        topicsAsked: failureData.topicsAsked || [],
        whereDidYouStruggle: failureData.whereDidYouStruggle || '',
        selfReflection: failureData.selfReflection || '',
        // Ensure rejectionReason is one of the enum values
        rejectionReason: failureData.rejectionReason || 'Unknown',
        tags: failureData.tags || [],
        userId,
        ...failureData,
      })

      await failure.save()
      logger.info(`Failure recorded for user ${userId}`)

      return failure
    } catch (error) {
      logger.error('Record failure error:', error)
      throw error
    }
  },

  async analyzeFailurePatterns(userId: string): Promise<FailureAnalysis> {
    try {
      const failures = await FailureEntry.find({ userId }).sort({ interviewDate: -1 })

      if (failures.length === 0) {
        return {
          totalFailures: 0,
          patterns: [],
          mostCommonReason: 'N/A',
          commonRejectionRate: 0,
          topicsToFocus: [],
          recommendation: 'Start applying and interviewing to collect failure data.',
        }
      }

      // Count rejection reasons
      const reasonCounts = failures.reduce(
        (acc, f) => {
          acc[f.rejectionReason] = (acc[f.rejectionReason] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      const patterns = Object.entries(reasonCounts)
        .map(([reason, count]) => ({
          reason,
          count,
          percentage: Math.round((count / failures.length) * 100),
          relatedTopics: getRelatedTopics(reason),
        }))
        .sort((a, b) => b.count - a.count)

      const topReason = patterns[0]?.reason || 'Unknown'
      const topReasonCount = patterns[0]?.count || 0
      const rejectionRate = Math.round((topReasonCount / failures.length) * 100)

      const recommendation = generateFailureRecommendation(topReason, rejectionRate)

      return {
        totalFailures: failures.length,
        patterns,
        mostCommonReason: topReason,
        commonRejectionRate: rejectionRate,
        topicsToFocus: getRelatedTopics(topReason),
        recommendation,
      }
    } catch (error) {
      logger.error('Analyze failure patterns error:', error)
      throw error
    }
  },

  async getInterviewTimeline(userId: string) {
    try {
      const interviews = await Application.find({ userId }).sort({ appliedDate: 1 })

      return interviews.map((app) => ({
        company: app.company,
        role: app.role,
        appliedDate: app.appliedDate,
        status: app.status,
        interviewRounds: app.interviewRounds,
      }))
    } catch (error) {
      logger.error('Get interview timeline error:', error)
      throw error
    }
  },

  async getFailureFrequencyByTopic(userId: string) {
    try {
      const failures = await FailureEntry.find({ userId })

      const topicFrequency = failures.reduce(
        (acc, f) => {
          const topics = f.tags || []
          topics.forEach((topic) => {
            acc[topic] = (acc[topic] || 0) + 1
          })
          return acc
        },
        {} as Record<string, number>
      )

      return Object.entries(topicFrequency)
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => b.count - a.count)
    } catch (error) {
      logger.error('Get failure frequency error:', error)
      throw error
    }
  },
}
