import Company from '../models/Company'
import { Assessment } from '../models/Assessment'
import mongoose from 'mongoose'
import {
  analyzeCompaniesForDomain,
  normalizeDomain,
} from './companyDomainValidator'

export class CompanyAnalysisService {
  /**
   * Validate target companies against user's domain using the company analysis model.
   */
  validateCompaniesForDomain(
    companies: string[],
    domain: string,
    targetRole?: string,
  ) {
    return analyzeCompaniesForDomain(companies, domain, targetRole)
  }

  /**
   * Analyze target companies: domain compatibility + Mongo interview requirements.
   */
  async analyzeTargetCompanies(
    userTargetCompanies: string[],
    domain?: string,
    targetRole?: string,
  ) {
    const domainAnalysis = domain
      ? analyzeCompaniesForDomain(userTargetCompanies, domain, targetRole)
      : null

    const companiesToQuery =
      domainAnalysis && domainAnalysis.compatible.length > 0
        ? domainAnalysis.compatible
        : userTargetCompanies

    let companies: Awaited<ReturnType<typeof Company.find>> = []
    try {
      companies = await Company.find({
        name: { $in: companiesToQuery },
      })
    } catch (error) {
      console.warn('Company DB lookup skipped:', error)
    }

    const mongoByName = new Map(companies.map((c) => [c.name, c]))

      const enrichedCompanies = (domainAnalysis?.companies ?? userTargetCompanies.map((name) => ({
        name,
        compatible: true,
        reason: 'Domain not specified',
        campusRoles: [] as string[],
      }))).map((entry) => {
        const db = mongoByName.get(entry.name)
        return {
          name: entry.name,
          compatible: entry.compatible,
          reason: entry.reason,
          campusRoles: entry.campusRoles,
          hasAptitude: db?.hasAptitudeTest ?? false,
          hasCommunication: db?.hasCommunicationRound ?? true,
          focusAreas: db?.focusAreas ?? [],
          interviewSequence: db?.interviewSequence ?? [],
          inDatabase: Boolean(db),
        }
      })

      const compatibleEntries = enrichedCompanies.filter((c) => c.compatible)
      const needsAptitude = compatibleEntries.some((c) => c.hasAptitude)
      const needsCommunication = compatibleEntries.some((c) => c.hasCommunication) || compatibleEntries.length > 0

      const focusAreasSet = new Set<string>()
      compatibleEntries.forEach((c) => {
        c.focusAreas.forEach((area) => focusAreasSet.add(area))
      })

      return {
        analyzed: true,
        model: 'company-domain-v1',
        domain: domainAnalysis?.domain ?? (domain ? normalizeDomain(domain) : undefined),
        targetRole: domainAnalysis?.targetRole ?? targetRole,
        compatible: domainAnalysis?.compatible ?? userTargetCompanies,
        incompatible: domainAnalysis?.incompatible ?? [],
        needsAptitude,
        needsCommunication,
        focusAreas: Array.from(focusAreasSet),
        companies: enrichedCompanies,
      }
  }

  /**
   * Get assessment recommendations based on target companies
   */
  async getRecommendedAssessments(userId: string) {
    try {
      const assessment = await Assessment.findOne({ userId })
      if (!assessment) {
        return []
      }

      // Get user's target companies
      const User = (await import('../models/User')).default
      const user = await User.findById(userId)

      if (!user || !user.targetCompanies || user.targetCompanies.length === 0) {
        return []
      }

      const companyAnalysis = await this.analyzeTargetCompanies(user.targetCompanies)
      const recommendations: Array<{
        type: 'Communication' | 'Aptitude'
        reason: string
        forCompanies: string[]
        priority: 'High' | 'Medium' | 'Low'
      }> = []

      // Recommend Aptitude if any target company requires it
      if (companyAnalysis.needsAptitude && !assessment.aptitude) {
        const aptitudeCompanies = companyAnalysis.companies
          .filter((c) => c.hasAptitude)
          .map((c) => c.name)

        recommendations.push({
          type: 'Aptitude',
          reason: `${aptitudeCompanies.join(', ')} require aptitude test to screen candidates`,
          forCompanies: aptitudeCompanies,
          priority: 'High',
        })
      }

      // Recommend Communication if score is low
      if (assessment.communication === null || assessment.communication < 60) {
        recommendations.push({
          type: 'Communication',
          reason: 'Practice mock interviews to improve verbal communication and confidence for final rounds',
          forCompanies: user.targetCompanies,
          priority: 'Medium',
        })
      }

      return recommendations
    } catch (error) {
      console.error('Error getting recommended assessments:', error)
      throw error
    }
  }

  /**
   * Calculate readiness for specific company
   */
  async calculateCompanyReadiness(userId: string, companyName: string) {
    try {
      const company = await Company.findOne({ name: companyName })
      if (!company) {
        throw new Error(`Company ${companyName} not found`)
      }

      const assessment = await Assessment.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      })
      if (!assessment) {
        throw new Error('Assessment not found for user')
      }

      // Weight scores based on company focus areas
      let score = 0
      let count = 0

      if (company.focusAreas.includes('DSA')) {
        score += assessment.dsa * 0.4
        count += 0.4
      }

      if (company.focusAreas.includes('System Design')) {
        score += assessment.projects * 0.3
        count += 0.3
      }

      if (company.focusAreas.includes('Communication') && assessment.communication) {
        score += assessment.communication * 0.2
        count += 0.2
      }

      if (company.focusAreas.includes('Behavioral')) {
        if (assessment.communication) {
          score += assessment.communication * 0.15
          count += 0.15
        }
      }

      // Base score
      score += assessment.resume * 0.15
      count += 0.15

      const readiness = count > 0 ? Math.round(score / count) : 0

      // Get gaps
      const gaps: string[] = []
      if (assessment.dsa < 70 && company.focusAreas.includes('DSA')) {
        gaps.push(`DSA (${assessment.dsa}%)`)
      }
      if (assessment.projects < 70 && company.focusAreas.includes('System Design')) {
        gaps.push(`Project Quality (${assessment.projects}%)`)
      }
      if (
        (!assessment.communication || assessment.communication < 60) &&
        company.focusAreas.includes('Communication')
      ) {
        gaps.push(`Communication (${assessment.communication || 0}%)`)
      }

      return {
        companyName,
        overallReadiness: readiness,
        assessment: {
          dsa: assessment.dsa,
          projects: assessment.projects,
          resume: assessment.resume,
          communication: assessment.communication,
          aptitude: assessment.aptitude,
        },
        gaps,
        requiresAptitude: company.hasAptitudeTest,
        interviewSequence: company.interviewSequence,
      }
    } catch (error) {
      console.error('Error calculating company readiness:', error)
      throw error
    }
  }

  /**
   * Get company-specific focus areas
   */
  async getFocusAreasForCompany(companyName: string) {
    try {
      const company = await Company.findOne({ name: companyName })
      if (!company) {
        throw new Error(`Company ${companyName} not found`)
      }

      return {
        companyName,
        focusAreas: company.focusAreas,
        interviewSequence: company.interviewSequence,
        hasAptitude: company.hasAptitudeTest,
        hasCommunication: company.hasCommunicationRound,
      }
    } catch (error) {
      console.error('Error getting company focus areas:', error)
      throw error
    }
  }

  /**
   * Get all target companies for a user with their requirements
   */
  async getTargetCompaniesProfile(userId: string) {
    try {
      const User = (await import('../models/User')).default
      const user = await User.findById(userId)

      if (!user || !user.targetCompanies) {
        return []
      }

      const readinessProfiles = await Promise.all(
        user.targetCompanies.map((company: string) => this.calculateCompanyReadiness(userId, company))
      )

      return readinessProfiles
    } catch (error) {
      console.error('Error getting target companies profile:', error)
      throw error
    }
  }
}

export default new CompanyAnalysisService()
