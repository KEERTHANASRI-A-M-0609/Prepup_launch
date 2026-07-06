/**
 * Campus company × domain compatibility (mirrors frontend roleCompanyEngine).
 */

export const DOMAIN_JOB_ROLES: Record<string, string[]> = {
  'Software Engineering': [
    'Software Engineer', 'SDE', 'Backend Engineer', 'Full Stack Engineer', 'Frontend Engineer',
  ],
  'Product Management': [
    'Product Manager', 'Associate Product Manager', 'APM', 'Product Analyst',
  ],
  'Data Science': [
    'Data Scientist', 'ML Engineer', 'Data Analyst', 'AI Engineer',
  ],
  'Cloud & DevOps': [
    'DevOps Engineer', 'Cloud Engineer', 'SRE', 'Platform Engineer', 'Cloud Support Engineer',
  ],
  Cybersecurity: [
    'Security Engineer', 'SOC Analyst', 'Cybersecurity Analyst',
  ],
  'UI / UX Design': [
    'UX Designer', 'UI Designer', 'Product Designer',
  ],
  'AI / ML': [
    'ML Engineer', 'AI Engineer', 'Data Scientist', 'Research Engineer',
  ],
}

export const COMPANY_CAMPUS_ROLES: Record<string, string[]> = {
  Google: ['Software Engineer', 'SWE', 'Data Scientist', 'Product Manager', 'APM', 'UX Designer', 'SRE', 'Cloud Engineer'],
  Amazon: ['Software Engineer', 'SDE', 'DevOps Engineer', 'Cloud Support Engineer', 'Data Engineer', 'Product Manager', 'APM'],
  Microsoft: ['Software Engineer', 'SDE', 'Cloud Engineer', 'DevOps Engineer', 'Data Scientist', 'Product Manager', 'APM'],
  Meta: ['Software Engineer', 'SWE', 'Data Scientist', 'Product Manager'],
  PayPal: ['Software Engineer', 'SDE', 'DevOps Engineer', 'Data Analyst'],
  Flipkart: ['Software Engineer', 'SDE', 'DevOps Engineer', 'Data Scientist', 'Product Manager'],
  Zomato: ['Software Engineer', 'SDE', 'Data Analyst', 'Product Manager'],
  Razorpay: ['Software Engineer', 'SDE', 'DevOps Engineer', 'Product Manager'],
  Infosys: ['Software Engineer', 'Systems Engineer', 'DevOps Engineer', 'Cloud Engineer', 'Security Engineer', 'Cybersecurity Analyst'],
  TCS: ['Software Engineer', 'Systems Engineer', 'DevOps Engineer', 'Cloud Support', 'Security Engineer', 'Cybersecurity Analyst'],
  Wipro: ['Software Engineer', 'DevOps Engineer', 'Cloud Engineer', 'Security Engineer'],
  Accenture: ['Software Engineer', 'Cloud Engineer', 'DevOps Engineer', 'Data Analyst', 'Security Engineer', 'Cybersecurity Analyst'],
  Adobe: ['Software Engineer', 'SDE', 'Product Manager', 'UX Designer'],
  Goldman: ['Software Engineer', 'SDE', 'Data Engineer'],
  Startup: ['Software Engineer', 'Full Stack Engineer', 'DevOps Engineer', 'Product Manager', 'Data Scientist', 'Security Engineer'],
  Any: ['Software Engineer', 'SDE', 'DevOps Engineer', 'Cloud Engineer', 'Product Manager', 'Data Scientist', 'ML Engineer', 'Security Engineer'],
}

/** Explicit campus hiring domains per company (source of truth for compatibility). */
export const COMPANY_SUPPORTED_DOMAINS: Record<string, string[]> = {
  Google: ['Software Engineering', 'Data Science', 'Product Management', 'UI / UX Design', 'AI / ML', 'Cloud & DevOps'],
  Amazon: ['Software Engineering', 'Cloud & DevOps', 'Product Management', 'Data Science', 'AI / ML'],
  Microsoft: ['Software Engineering', 'Cloud & DevOps', 'Data Science', 'Product Management', 'AI / ML', 'UI / UX Design'],
  Meta: ['Software Engineering', 'Data Science', 'Product Management', 'AI / ML'],
  PayPal: ['Software Engineering', 'Cloud & DevOps', 'Data Science'],
  Flipkart: ['Software Engineering', 'Cloud & DevOps', 'Data Science', 'Product Management'],
  Zomato: ['Software Engineering', 'Data Science', 'Product Management'],
  Razorpay: ['Software Engineering', 'Cloud & DevOps', 'Product Management'],
  Infosys: ['Software Engineering', 'Cloud & DevOps', 'Cybersecurity', 'Data Science'],
  TCS: ['Software Engineering', 'Cloud & DevOps', 'Cybersecurity', 'Data Science'],
  Wipro: ['Software Engineering', 'Cloud & DevOps', 'Cybersecurity'],
  Accenture: ['Software Engineering', 'Cloud & DevOps', 'Cybersecurity', 'Data Science'],
  Adobe: ['Software Engineering', 'UI / UX Design', 'Product Management'],
  Goldman: ['Software Engineering', 'Data Science'],
  Startup: ['Software Engineering', 'Cloud & DevOps', 'Product Management', 'Data Science', 'AI / ML', 'Cybersecurity', 'UI / UX Design'],
  Any: Object.keys(DOMAIN_JOB_ROLES),
}

export function normalizeDomain(domain: string): string {
  const d = domain.trim()
  for (const key of Object.keys(DOMAIN_JOB_ROLES)) {
    if (key.toLowerCase() === d.toLowerCase()) return key
  }
  if (/devops|cloud/i.test(d)) return 'Cloud & DevOps'
  if (/product/i.test(d)) return 'Product Management'
  if (/software|sde|engineering/i.test(d)) return 'Software Engineering'
  if (/cyber|security/i.test(d)) return 'Cybersecurity'
  if (/ux|ui|design/i.test(d)) return 'UI / UX Design'
  if (/ai|ml|machine learning/i.test(d)) return 'AI / ML'
  if (/data/i.test(d)) return 'Data Science'
  return d
}

function matchCompanyKey(company: string): string | null {
  const n = company.trim().toLowerCase()
  for (const key of Object.keys(COMPANY_CAMPUS_ROLES)) {
    if (key.toLowerCase() === n) return key
  }
  return null
}

export function getRolesForDomain(domain: string): string[] {
  return DOMAIN_JOB_ROLES[normalizeDomain(domain)] ?? []
}

export function companyOffersDomain(company: string, domain: string): boolean {
  const key = matchCompanyKey(company)
  if (!key) return false
  if (key === 'Any') return true

  const norm = normalizeDomain(domain)
  const supported = COMPANY_SUPPORTED_DOMAINS[key]
  if (supported) {
    if (!DOMAIN_JOB_ROLES[norm]) return key === 'Startup'
    return supported.includes(norm)
  }

  const domainRoles = getRolesForDomain(domain)
  if (domainRoles.length === 0) return key === 'Startup'

  const companyRoles = COMPANY_CAMPUS_ROLES[key] ?? []
  return domainRoles.some((dr) =>
    companyRoles.some(
      (cr) =>
        cr.toLowerCase().includes(dr.split(' ')[0].toLowerCase()) ||
        dr.toLowerCase().includes(cr.split(' ')[0].toLowerCase()),
    ),
  )
}

export function filterCompaniesForDomain(companies: string[], domain: string): {
  valid: string[]
  invalid: string[]
} {
  const valid: string[] = []
  const invalid: string[] = []
  for (const c of companies) {
    if (companyOffersDomain(c, domain)) valid.push(c)
    else invalid.push(c)
  }
  return { valid, invalid }
}

export function getCompatibleCompanies(domain: string): string[] {
  return Object.keys(COMPANY_CAMPUS_ROLES).filter((c) => companyOffersDomain(c, domain))
}

export interface CompanyDomainAnalysis {
  analyzed: true
  model: string
  domain: string
  targetRole: string
  compatible: string[]
  incompatible: string[]
  companies: Array<{
    name: string
    compatible: boolean
    reason: string
    campusRoles: string[]
  }>
}

export function analyzeCompaniesForDomain(
  companies: string[],
  domain: string,
  targetRole?: string,
): CompanyDomainAnalysis {
  const norm = normalizeDomain(domain)
  const role = targetRole?.trim() || getRolesForDomain(norm)[0] || norm
  const compatible: string[] = []
  const incompatible: string[] = []
  const details: CompanyDomainAnalysis['companies'] = []

  for (const raw of companies) {
    const name = raw.trim()
    if (!name) continue
    const key = matchCompanyKey(name)
    const ok = companyOffersDomain(name, norm)
    if (ok) compatible.push(name)
    else incompatible.push(name)

    const campusRoles = key ? (COMPANY_CAMPUS_ROLES[key] ?? []) : []
    details.push({
      name,
      compatible: ok,
      reason: ok
        ? `${name} lists campus ${role} / ${norm} hiring`
        : `${name} does not list campus ${norm} roles (typical: ${campusRoles.slice(0, 4).join(', ') || 'none'})`,
      campusRoles,
    })
  }

  return {
    analyzed: true,
    model: 'company-domain-v1',
    domain: norm,
    targetRole: role,
    compatible,
    incompatible,
    companies: details,
  }
}
