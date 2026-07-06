import express, { Response } from 'express'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import companyAnalysis from '../services/companyAnalysisService'
import { getCompatibleCompanies } from '../services/companyDomainValidator'

const router = express.Router()

/** Public — used during onboarding before login. */
router.post(
  '/analyze',
  asyncHandler(async (req, res: Response) => {
    const { companies = [], domain = '', targetRole = '' } = req.body as {
      companies?: string[]
      domain?: string
      targetRole?: string
    }

    const list = Array.isArray(companies) ? companies.filter((c) => typeof c === 'string' && c.trim()) : []
    const result = await companyAnalysis.analyzeTargetCompanies(list, domain, targetRole)
    res.json(result)
  }),
)

/** Compatible company names for a domain. */
router.get(
  '/compatible',
  asyncHandler(async (req, res: Response) => {
    const domain = String(req.query.domain ?? 'Software Engineering')
    res.json({
      domain,
      companies: getCompatibleCompanies(domain),
    })
  }),
)

router.post(
  '/validate',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { companies = [], domain = '', targetRole = '' } = req.body as {
      companies?: string[]
      domain?: string
      targetRole?: string
    }
    const list = Array.isArray(companies) ? companies.filter((c) => typeof c === 'string' && c.trim()) : []
    const result = companyAnalysis.validateCompaniesForDomain(list, domain, targetRole)
    res.json(result)
  }),
)

export default router
