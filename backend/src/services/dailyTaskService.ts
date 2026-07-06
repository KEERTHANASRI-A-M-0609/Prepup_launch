import { DailyTask, IDailyTask } from '../models/DailyTask';
import { User } from '../models/User';
import { ReadinessGapService } from './ReadinessGapService'; // Corrected import
import { ResourceRecommendationService } from './resourceRecommendationService';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export class DailyTaskService {
  private resourceRecommendationService: ResourceRecommendationService;

  constructor() {
    this.resourceRecommendationService = new ResourceRecommendationService();
  }

  async generateDailyTasks(userId: string): Promise<IDailyTask[]> {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const gapAnalysis = await ReadinessGapService.analyzeGaps(userId); // Corrected service call
      const missingTopics = gapAnalysis.topGaps; // Use topGaps from the analysis

      const tasks: IDailyTask[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize date to start of day

      // Clear existing tasks for today to prevent duplicates on regeneration
      await DailyTask.deleteMany({ userId: user._id, date: today, completed: false });

      // Prioritize blockers
      for (const topic of missingTopics.slice(0, 2)) { // Take top 2 missing topics
        const recommendations = await this.resourceRecommendationService.generateDynamicRecommendations(
          user._id,
          // Assuming you have a way to get a targetCompanyId, for now, use a placeholder
          new mongoose.Types.ObjectId(), // Placeholder for targetCompanyId
          [topic] // Pass the missing topic as a weak area
        );

        const topRecommendation = recommendations[0];

        tasks.push(new DailyTask({
          userId: new mongoose.Types.ObjectId(userId),
          date: today,
          task: topRecommendation?.title || `Work on ${topic} to improve your skills`,
          estimatedTime: topRecommendation?.estimatedEffort || 45,
          category: 'DSA', // Assuming missing topics are DSA-related for now, needs refinement
          impact: `+${topRecommendation?.expectedImpact || 2} Readiness`,
          resourceLink: topRecommendation?.url,
        }));
      }

      // Add tasks from improvement areas if blockers are few
      if (tasks.length < 3 && missingTopics.length > 2) { // If there are more missing topics
        const topic = missingTopics[2]; // Take the next missing topic
        const recommendations = await this.resourceRecommendationService.generateDynamicRecommendations(
          user._id,
          new mongoose.Types.ObjectId(), // Placeholder
          [topic]
        );
        const topRecommendation = recommendations[0];

        tasks.push(new DailyTask({
          userId: new mongoose.Types.ObjectId(userId),
          date: today,
          task: topRecommendation?.title || `Review ${topic} concepts`,
          estimatedTime: topRecommendation?.estimatedEffort || 30,
          category: 'DSA', // Assuming DSA for now
          impact: `+${topRecommendation?.expectedImpact || 1} Readiness`,
          resourceLink: topRecommendation?.url,
        }));
      }

      // Ensure at least one task if no gaps, e.g., a consistency task
      if (tasks.length === 0) {
        tasks.push(new DailyTask({
          userId: new mongoose.Types.ObjectId(userId),
          date: today,
          task: 'Review your progress dashboard',
          estimatedTime: 15,
          category: 'General', // A general category for non-gap tasks
          impact: 'Maintain Momentum',
        }));
      }

      await DailyTask.insertMany(tasks);
      logger.info(`Generated ${tasks.length} daily tasks for user ${userId}`);
      return tasks;
    } catch (error) {
      logger.error(`Error generating daily tasks for user ${userId}:`, error);
      throw error;
    }
  }

  async getTodaysTasks(userId: string): Promise<IDailyTask[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return DailyTask.find({ userId: new mongoose.Types.ObjectId(userId), date: today }).sort({ createdAt: 1 });
  }

  async completeTask(taskId: string): Promise<IDailyTask | null> {
    const task = await DailyTask.findByIdAndUpdate(taskId, { completed: true, completedAt: new Date() }, { new: true });
    if (task) {
      logger.info(`Task ${taskId} completed by user ${task.userId}`);
    }
    return task;
  }
}

export const dailyTaskService = new DailyTaskService();