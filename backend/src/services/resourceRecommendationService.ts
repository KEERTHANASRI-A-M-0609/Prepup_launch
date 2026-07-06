import mongoose from 'mongoose'

interface Recommendation {
  title: string;
  reason: string;
  impact: 'High' | 'Medium' | 'Low';
  effort: string; // e.g. "2 hours"
  url: string;
  category: string;
}

export class ResourceRecommendationService { // Moved to backend/src/services
  /**
   * Generates dynamic recommendations based on weak areas and company focus.
   */
  async generateDynamicRecommendations(
    userId: ObjectId, 
    targetCompanyId: ObjectId,
    weakAreas: string[]
  ): Promise<Recommendation[]> {
    // 1. Fetch Company focus areas (e.g. Amazon -> Focus: "Leadership Principles", "System Design")
    // 2. Cross-reference with user's weakAreas
    // 3. Select resources that bridge the gap

    const recommendations: Recommendation[] = [];

    // This logic will be replaced by a dynamic resource database (Phase 6)
    if (weakAreas.includes('DSA')) {
      recommendations.push({
        title: "Mastering Graphs for Top Tech OAs",
        reason: "40% of target company's online assessments focus on Graph traversals.",
        impact: 'High',
        effort: '5 hours',
        url: 'https://career-os.com/resources/graphs-mastery',
        category: 'DSA'
      });
    }

    if (weakAreas.includes('COMMUNICATION')) {
      recommendations.push({
        title: "The Amazon STAR Method Guide",
        reason: "Required for Behavioral rounds. Your current clarity score is 62%.",
        impact: 'Medium',
        effort: '1 hour',
        url: 'https://career-os.com/resources/star-method',
        category: 'Communication'
      });
    }

    return recommendations;
  }

  // Removed calculateMomentum as it's a duplicate of MomentumService
}

export default new ResourceRecommendationService()