import { ReadinessEngine } from './ReadinessEngine';
import { User } from '../models/User';

export class LearningEngine {
  static async generateRecommendations(userId: string) {
    const user = await User.findById(userId);
    const readiness = await ReadinessEngine.calculateScore(userId);
    
    if (!readiness.score || readiness.score === 0) {
      return this.getOnboardingRecommendations();
    }

    const recommendations = [];
    const breakdown = readiness.breakdown;

    if (breakdown.DSA < 70) {
      recommendations.push({
        title: "Master Trees & Graphs",
        reason: "Critical for Software Engineer roles at Product Companies",
        impact: "+15 Readiness",
        time: "10 hours",
        link: "https://takeuforward.org/strivers-a2z-dsa-course/",
        type: "Course"
      });
    }

    return recommendations;
  }

  private static getOnboardingRecommendations() {
    return [{
      title: "Connect Your LeetCode Profile",
      reason: "Start tracking your DSA readiness automatically",
      impact: "+25 Readiness",
      time: "2 minutes",
      link: "/settings/connect",
      type: "Action"
    }];
  }
}