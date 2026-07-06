import { ObjectId } from 'mongodb';
import { User } from '../models/User';
import { RecoveryLog } from '../models/RecoveryLog';
import { DailyTask } from '../models/DailyTask'; // Assuming a DailyTask model exists
import { Assessment } from '../models/Assessment';
import { Application } from '../models/Application';
import { logger } from '../utils/logger';

export class MomentumService {
  /**
   * Detects preparing "Velocity" and "Drop-offs"
   */
  public async analyzeMomentum(userId: ObjectId): Promise<{
    consistencyScore: number;
    isDroppingOff: boolean;
    velocity: number;
    status: string;
    tasksCompletedLastWeek: number;
    assessmentsCompletedLastWeek: number;
    applicationsSubmittedLastWeek: number;
  }> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch relevant activities
    const completedTasks = await DailyTask.countDocuments({ userId, completed: true, date: { $gte: sevenDaysAgo } });
    const recentAssessments = await Assessment.countDocuments({ userId, completedAt: { $gte: sevenDaysAgo } });
    const recentApplications = await Application.countDocuments({ userId, appliedDate: { $gte: sevenDaysAgo } });

    // For consistency, we need a log of daily activity or tasks
    // For now, let's use tasks completed as a proxy for active days
    const activeDaysCount = await DailyTask.aggregate([
      { $match: { userId, completed: true, date: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } } },
      { $count: "activeDays" }
    ]);
    const activeDays = activeDaysCount.length > 0 ? activeDaysCount[0].activeDays : 0;
    
    // Phase 8 Momentum Score (0-100)
    const momentumScore = Math.min(
      (completedTasks * 10) + (recentAssessments * 20) + (recentApplications * 5), 
      100
    );

    let range = 'Drop-Off Risk';
    if (momentumScore >= 80) range = 'Strong Momentum';
    else if (momentumScore >= 60) range = 'Stable';
    else if (momentumScore >= 40) range = 'Risk Zone';

    const velocity = await this.calculateVelocity(userId);

    return {
      momentumScore,
      range,
      velocity,
      preparationActivityChange: velocity > 0 ? `increased by ${velocity}%` : `dropped by ${Math.abs(velocity)}%`,
      tasksCompletedLastWeek: completedTasks,
      assessmentsCompletedLastWeek: recentAssessments,
      applicationsSubmittedLastWeek: recentApplications,
    };
  }

  /**
   * Generates a 3-Day Recovery Sprint if inactivity is detected
   */
  public async generateRecoveryPlan(userId: ObjectId, reason: string, inactiveDays: number, originalWeeklyHours: number) {
    // Personalization: Adjust tasks based on the reason provided
    // Burnout needs low-friction tasks
    // Exams need high-efficiency, short tasks

    const plans: Record<string, any> = {
      'Burnout': [
        { day: 1, task: "Review your 'Wins' folder", time: 15 },
        { day: 2, task: "Solve 1 'Easy' LeetCode problem", time: 30 },
        { day: 3, task: "Watch 1 system design video", time: 45 }
      ],
      'Exams': [
        { day: 1, task: "Update 1 line in Resume", time: 10 },
        { day: 2, task: "Quick Aptitude Quiz", time: 20 },
        { day: 3, task: "Solve 1 Medium DSA problem", time: 45 }
      ]
    };

    return plans[reason] || plans['Burnout'];
  }

  private async calculateVelocity(userId: ObjectId): Promise<number> {
    // Fetch last two assessments to calculate readiness change over time
    const assessments = await Assessment.find({ userId }).sort({ completedAt: -1 }).limit(2);
    
    if (assessments.length < 2) {
      return 0; // Not enough data to calculate velocity
    }

    const latestAssessment = assessments[0];
    const previousAssessment = assessments[1];

    const timeDiffDays = (latestAssessment.completedAt.getTime() - previousAssessment.completedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (timeDiffDays === 0) return 0; // Avoid division by zero

    const readinessChange = latestAssessment.overall - previousAssessment.overall;

    // Velocity = change in readiness per day (scaled)
    // A positive velocity means improvement, negative means decline
    return parseFloat((readinessChange / timeDiffDays).toFixed(2));
  }
}