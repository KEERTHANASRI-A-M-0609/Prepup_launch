import { User } from '../models/User';
import { assessmentService } from './assessmentService';
import { gapService } from './gapService';
import { momentumService } from './momentumService';
import { failureAnalysisService } from './failureAnalysisService';
import { logger } from '../utils/logger';
// import puppeteer from 'puppeteer'; // For PDF generation

export class ReportService {
  async generateWeeklyCareerHealthReport(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const latestAssessment = await assessmentService.getLatestAssessment(userId);
      const readinessTrend = await assessmentService.getReadinessTrend(userId, 7); // Last 7 days
      const momentum = await momentumService.analyzeMomentum(userId);
      const gapAnalysis = await gapService.analyzeGaps(userId);
      const todaysTasks = await (await import('./dailyTaskService')).dailyTaskService.getTodaysTasks(userId); // Assuming dailyTaskService

      const reportData = {
        user: { name: user.name, email: user.email },
        date: new Date().toISOString().split('T')[0],
        readiness: latestAssessment ? latestAssessment.overall : 'N/A',
        readinessTrend: readinessTrend,
        momentum: momentum,
        gaps: gapAnalysis.gaps.slice(0, 3), // Top 3 gaps
        riskAreas: gapAnalysis.blockers.map(b => b.category),
        completedTasks: todaysTasks.filter(t => t.completed).length,
        recommendations: gapAnalysis.recommendation, // General recommendation from gap analysis
        // Add more data as needed
      };

      logger.info(`Generated weekly report data for user ${userId}`);
      // This data would then be passed to a PDF generation library (e.g., Puppeteer, html-pdf)
      // For now, we return the data.
      return reportData;
    } catch (error) {
      logger.error(`Error generating weekly report for user ${userId}:`, error);
      throw error;
    }
  }

  async generateMonthlyPlacementReport(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const latestAssessment = await assessmentService.getLatestAssessment(userId);
      const readinessTrend = await assessmentService.getReadinessTrend(userId, 30); // Last 30 days
      const momentum = await momentumService.analyzeMomentum(userId);
      const gapAnalysis = await gapService.analyzeGaps(userId);
      const failureAnalysis = await failureAnalysisService.analyzeFailurePatterns(userId);
      const placementProbability = latestAssessment?.placementProbability || 0; // Assuming it's calculated and stored

      const reportData = {
        user: { name: user.name, email: user.email, targetRole: user.targetRole },
        date: new Date().toISOString().split('T')[0],
        readinessScore: latestAssessment ? latestAssessment.overall : 'N/A',
        readinessTrend: readinessTrend,
        gapAnalysis: gapAnalysis,
        momentum: momentum,
        failureInsights: failureAnalysis,
        placementProbability: placementProbability,
        actionPlan: gapAnalysis.recommendation, // General action plan
        // Add more data like interview history, application summary etc.
      };

      logger.info(`Generated monthly report data for user ${userId}`);
      return reportData;
    } catch (error) {
      logger.error(`Error generating monthly report for user ${userId}:`, error);
      throw error;
    }
  }

  // Example of PDF generation (requires Puppeteer or similar library)
  // async generatePdfReport(htmlContent: string): Promise<Buffer> {
  //   const browser = await puppeteer.launch();
  //   const page = await browser.newPage();
  //   await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  //   const pdfBuffer = await page.pdf({ format: 'A4' });
  //   await browser.close();
  //   return pdfBuffer;
  // }
}

export const reportService = new ReportService();