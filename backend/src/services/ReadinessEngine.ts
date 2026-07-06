import { Assessment } from '../models/Assessment'
import { Application } from '../models/Application'

export class ReadinessEngine {
  static WEIGHTS = {
    DSA: 0.25,
    PROJECTS: 0.20,
    RESUME: 0.15,
    COMMUNICATION: 0.15,
    APTITUDE: 0.15,
    INTERVIEW: 0.10,
  }

  static async calculateScore(userId: string) {
    const evidence = await this.gatherEvidence(userId)

    if (!evidence.latestAssessment && evidence.interviews.length === 0) {
      return { score: 0, confidence: 'Low', message: 'No sufficient evidence available yet.' }
    }

    const latestAssessment = evidence.latestAssessment

    const scores = {
      DSA: latestAssessment ? latestAssessment.dsa : 0,
      PROJECTS: latestAssessment ? latestAssessment.projects : 0,
      RESUME: latestAssessment ? latestAssessment.resume : 0,
      COMMUNICATION: latestAssessment?.communication ?? 0,
      APTITUDE: latestAssessment?.aptitude ?? 0,
      INTERVIEW: await this.calculateInterviewScore(evidence.interviews),
    }

    let totalScore = 0
    let totalWeight = 0

    for (const [category, score] of Object.entries(scores)) {
      const weight = (this.WEIGHTS as Record<string, number>)[category]
      totalScore += score * weight
      totalWeight += weight
    }

    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : null

    const evidenceCount = [
      scores.DSA > 0,
      scores.PROJECTS > 0,
      scores.RESUME > 0,
      (latestAssessment?.communication ?? 0) > 0,
      (latestAssessment?.aptitude ?? 0) > 0,
      evidence.interviews.length > 0,
    ].filter(Boolean).length

    const confidence = evidenceCount >= 5 ? 'High' : evidenceCount >= 3 ? 'Medium' : 'Low'

    return {
      score: finalScore,
      confidence,
      breakdown: scores,
      evidenceCount,
      missingCategories: this.getMissingCategories(scores, latestAssessment),
    }
  }

  private static async gatherEvidence(userId: string) {
    const [latestAssessment, interviews] = await Promise.all([
      Assessment.findOne({ userId }).sort({ completedAt: -1 }),
      Application.find({ userId, status: { $in: ['Selected', 'Rejected'] } }),
    ])
    return { latestAssessment, interviews }
  }

  private static async calculateInterviewScore(interviews: Array<{ status: string }>) {
    if (!interviews || interviews.length === 0) return 0
    const selected = interviews.filter((i) => i.status === 'Selected').length
    return Math.round((selected / interviews.length) * 100)
  }

  private static getMissingCategories(
    scores: Record<string, number>,
    assessment: { communication?: number | null; aptitude?: number | null } | null
  ) {
    const missing: string[] = []
    if (scores.DSA === 0) missing.push('DSA')
    if (scores.PROJECTS === 0) missing.push('Projects')
    if (scores.RESUME === 0) missing.push('Resume')
    if (!assessment || assessment.communication === null) missing.push('Communication')
    if (!assessment || assessment.aptitude === null) missing.push('Aptitude')
    if (scores.INTERVIEW === 0) missing.push('Interview')
    return missing
  }
}
