import { Assessment } from '../models/Assessment';
import { User } from '../models/User';

export class ReadinessGapService {
  static ROLE_REQUIREMENTS: Record<string, string[]> = {
    'Software Engineer': ['Arrays', 'Strings', 'Linked Lists', 'Trees', 'Graphs', 'Dynamic Programming', 'Interview Communication'],
    'Data Scientist': ['Python', 'SQL', 'Statistics', 'Machine Learning', 'Data Visualization'],
    // Add other roles...
  };

  static async analyzeGaps(userId: string) {
    const user = await User.findById(userId);
    const latestAssessment = await Assessment.findOne({ userId }).sort({ completedAt: -1 });

    if (!user || !latestAssessment) return { gaps: [], message: 'Evidence required' };

    const requiredTopics = this.ROLE_REQUIREMENTS[user.targetRole] || [];
    const masteredTopics = latestAssessment.details?.dsa?.platforms || []; // Mock logic: using platforms as placeholder for topics
    
    const missingTopics = requiredTopics.filter(topic => !masteredTopics.includes(topic));
    
    // Calculate point distance (Simple heuristic for Phase 5)
    const pointsAway = missingTopics.length * 4; 

    return {
      targetRole: user.targetRole,
      pointsAway,
      topGaps: missingTopics.slice(0, 3),
      analysis: `You are ${pointsAway} points away from ${user.targetRole} readiness.`
    };
  }
}