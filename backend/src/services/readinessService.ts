import { ObjectId } from 'mongodb';

interface EvidenceSource {
  type: 'file' | 'link' | 'integration';
  url?: string;
  lastVerified: Date;
  metadata?: any;
}

interface EvidenceData {
  dsa: {
    score: number;
    source: EvidenceSource; // e.g., LeetCode Profile
  };
  projects: number; // Simplified to match IAssessment
  resume: number;   // Simplified to match IAssessment
  communication?: number; // Simplified to match IAssessment
  aptitude?: number;      // Simplified to match IAssessment
  interview?: number;     // New field for interview performance
}

export class ReadinessService {
  /**
   * Calculates evidence-based readiness.
   * Weights shift based on the target role (e.g., SDE vs PM).
   */
  public calculateOverallReadiness(evidence: EvidenceData, targetRole: string) {
    const weights = this.getWeightsForRole(targetRole);
    
    // 1. Calculate Core Readiness (The must-haves)
    let coreWeight = weights.dsa + weights.projects + weights.resume; // Core components
    let coreSum = (evidence.dsa.score * weights.dsa) +
                  (evidence.projects * weights.projects) +
                  (evidence.resume * weights.resume);
    
    const coreScore = Math.round(coreSum / coreWeight);

    // 2. Calculate Boosts (The edge-givers)
    let activeBoosts = 0;
    let totalBoostValue = 0;
    let potentialIncrease = 0;

    if (evidence.communication !== undefined) {
      totalBoostValue += (evidence.communication * weights.communication);
      activeBoosts += weights.communication;
      potentialIncrease += (100 - evidence.communication) * weights.communication;
    }

    if (evidence.aptitude !== undefined) {
      totalBoostValue += (evidence.aptitude * weights.aptitude);
      activeBoosts += weights.aptitude;
      potentialIncrease += (100 - evidence.aptitude) * weights.aptitude;
    }

    if (evidence.interview !== undefined) {
      totalBoostValue += (evidence.interview * weights.interview);
      activeBoosts += weights.interview;
      potentialIncrease += (100 - evidence.interview) * weights.interview;
    }

    // Final Score: Core + Normalized Boosts
    // This makes sure boosts only add if they are present, 
    // but don't penalize the core score if they aren't.
    const finalScore = Math.min(100, coreScore + (totalBoostValue * 10)); 
    
    return {
      overallScore: finalScore,
      coreScore: coreScore,
      boosts: {
        communication: evidence.communication ? 'Unlocked' : 'Available Boost',
        aptitude: evidence.aptitude ? 'Unlocked' : 'Available Boost',
        interview: evidence.interview ? 'Unlocked' : 'Available Boost',
        potentialIncrease: Math.round(potentialIncrease) // Sum of (100 - score) * weight for available boosts
      },
      breakdown: evidence,
      isPlacementReady: coreScore >= 75
    };
  }

  private getWeightsForRole(role: string): Record<string, number> {
    // SDE roles weight DSA and Projects higher
    if (role === 'Software Engineer') {
      return { dsa: 0.25, projects: 0.20, resume: 0.15, communication: 0.15, aptitude: 0.15, interview: 0.10 }; // New weights
    }
    // Default weights
    return { dsa: 0.25, projects: 0.20, resume: 0.15, communication: 0.15, aptitude: 0.15, interview: 0.10 }; // Default to SDE weights for now
  }

  public generateHighestImpactActions(userId: ObjectId, evidence: EvidenceData) {
    // This is the "Personalized Behavioral Layer"
    // Logic: Identify which category has the highest (Weight * (100 - CurrentScore))
    // Return top 3 actions
    return [];
  }

  public async calculatePlacementProbability(userId: ObjectId): Promise<number> {
    // Logic: (Readiness Score * Momentum Factor) / Market Difficulty
    return 0; // Placeholder for Phase 8
  }
}