/**
 * Campus placement roles per company + resume role-alignment checks.
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
  'Cybersecurity': [
    'Security Engineer', 'SOC Analyst', 'Cybersecurity Analyst',
  ],
  'UI / UX Design': [
    'UX Designer', 'UI Designer', 'Product Designer',
  ],
  'AI / ML': [
    'ML Engineer', 'AI Engineer', 'Data Scientist', 'Research Engineer',
  ],
}

/** Campus roles each company typically hires for (India campus / early career). */
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

const ROLE_KEYWORD_PROFILES: Record<string, { keywords: string[]; antiKeywords?: string[]; titleHints: string[] }> = {
  'Software Engineering': {
    keywords: [
      'software engineer', 'sde', 'developer', 'programming', 'java', 'python', 'c++', 'react',
      'node', 'api', 'microservices', 'data structures', 'algorithms', 'leetcode', 'full stack',
      'backend', 'frontend', 'spring', 'django', 'git', 'sql',
    ],
    antiKeywords: ['product manager', 'product owner', 'roadmap', 'stakeholder management'],
    titleHints: ['software', 'developer', 'engineer', 'sde', 'intern'],
  },
  'Product Management': {
    keywords: [
      'product manager', 'product management', 'roadmap', 'prd', 'user research', 'stakeholder',
      'go-to-market', 'gtm', 'prioritization', 'okrs', 'kpi', 'a/b test', 'product strategy',
      'wireframe', 'figma', 'customer discovery', 'product owner',
    ],
    antiKeywords: ['devops', 'kubernetes', 'terraform', 'jenkins pipeline'],
    titleHints: ['product', 'pm', 'apm', 'product manager'],
  },
  'Cloud & DevOps': {
    keywords: [
      'devops', 'sre', 'site reliability', 'cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
      'k8s', 'terraform', 'ansible', 'ci/cd', 'jenkins', 'gitlab', 'linux', 'bash', 'infrastructure',
      'iac', 'prometheus', 'grafana', 'nginx', 'helm', 'argo', 'cloudformation', 'ec2', 'eks',
      'monitoring', 'deployment', 'automation',
    ],
    antiKeywords: ['product manager', 'product roadmap', 'user research', 'associate product manager'],
    titleHints: ['devops', 'cloud', 'sre', 'platform', 'infrastructure'],
  },
  'Data Science': {
    keywords: [
      'machine learning', 'deep learning', 'data science', 'pandas', 'numpy', 'tensorflow', 'pytorch',
      'scikit', 'statistics', 'regression', 'classification', 'nlp', 'computer vision', 'jupyter',
    ],
    titleHints: ['data scientist', 'ml engineer', 'data analyst', 'ai engineer'],
  },
  'AI / ML': {
    keywords: [
      'machine learning', 'deep learning', 'neural', 'transformer', 'llm', 'pytorch', 'tensorflow',
      'model training', 'nlp', 'computer vision', 'reinforcement learning',
    ],
    titleHints: ['ml', 'ai', 'machine learning', 'research engineer'],
  },
  'Cybersecurity': {
    keywords: ['security', 'cybersecurity', 'penetration', 'vulnerability', 'siem', 'soc', 'firewall', 'owasp'],
    titleHints: ['security', 'cyber', 'soc'],
  },
  'UI / UX Design': {
    keywords: ['ux', 'ui', 'figma', 'sketch', 'wireframe', 'prototype', 'user experience', 'design system'],
    titleHints: ['designer', 'ux', 'ui'],
  },
}

function normalizeDomain(domain: string): string {
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
  return domainRoles.some(dr =>
    companyRoles.some(cr =>
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
  return Object.keys(COMPANY_CAMPUS_ROLES).filter(c => companyOffersDomain(c, domain))
}

export interface RoleAlignmentResult {
  alignmentScore: number
  structuralScore: number
  finalScore: number
  detectedFocus: string
  targetDomain: string
  matchedKeywords: string[]
  missingKeywords: string[]
  conflicts: string[]
  warnings: string[]
}

function countKeywordHits(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase()
  return keywords.filter(k => lower.includes(k.toLowerCase()))
}

export function checkResumeRoleAlignment(text: string, targetDomain: string): RoleAlignmentResult {
  const domain = normalizeDomain(targetDomain)
  const profile = ROLE_KEYWORD_PROFILES[domain] ?? ROLE_KEYWORD_PROFILES['Software Engineering']
  const lower = text.toLowerCase()
  const firstLines = text.split(/\n/).slice(0, 8).join(' ').toLowerCase()

  const matched = countKeywordHits(text, profile.keywords)
  const antiHits = countKeywordHits(text, profile.antiKeywords ?? [])

  const allProfiles = Object.entries(ROLE_KEYWORD_PROFILES).filter(([k]) => k !== domain)
  let detectedFocus = domain
  let maxOtherScore = 0
  for (const [otherDomain, otherProfile] of allProfiles) {
    const hits = countKeywordHits(text, otherProfile.keywords).length
    const titleHit = otherProfile.titleHints.some(h => firstLines.includes(h))
    const score = hits * 2 + (titleHit ? 8 : 0)
    if (score > maxOtherScore) {
      maxOtherScore = score
      detectedFocus = otherDomain
    }
  }

  const targetHits = matched.length
  const titleAligned = profile.titleHints.some(h => firstLines.includes(h))
  const alignmentBase = Math.min(100, targetHits * 8 + (titleAligned ? 25 : 0))
  const antiPenalty = antiHits.length * 12
  const wrongRolePenalty = detectedFocus !== domain && maxOtherScore > targetHits * 2 ? 35 : 0

  let alignmentScore = Math.max(0, alignmentBase - antiPenalty - wrongRolePenalty)

  const missingKeywords = profile.keywords
    .filter(k => !lower.includes(k.toLowerCase()))
    .slice(0, 6)

  const conflicts: string[] = []
  const warnings: string[] = []

  if (detectedFocus !== domain && maxOtherScore > 5) {
    conflicts.push(`Resume reads like ${detectedFocus}, but your target is ${domain}`)
  }
  if (antiHits.length > 0) {
    conflicts.push(`Resume emphasizes ${antiHits.slice(0, 2).join(', ')} — not typical for ${domain}`)
  }
  if (!titleAligned && targetHits < 3) {
    warnings.push(`Add a clear ${domain} title and role-specific keywords in your summary`)
  }
  if (targetHits < 4) {
    warnings.push(`Only ${targetHits} role-relevant keywords found — tailor resume for ${domain}`)
  }

  const structuralPlaceholder = 0 // filled by caller

  return {
    alignmentScore,
    structuralScore: structuralPlaceholder,
    finalScore: alignmentScore,
    detectedFocus,
    targetDomain: domain,
    matchedKeywords: matched.slice(0, 10),
    missingKeywords,
    conflicts,
    warnings,
  }
}

export function computeResumeScore(
  structuralScore: number,
  text: string,
  targetDomain: string,
): RoleAlignmentResult {
  const alignment = checkResumeRoleAlignment(text, targetDomain)
  alignment.structuralScore = structuralScore

  if (alignment.conflicts.length > 0) {
    alignment.finalScore = Math.min(
      structuralScore,
      Math.round(structuralScore * 0.35 + alignment.alignmentScore * 0.65),
    )
  } else {
    alignment.finalScore = Math.round(structuralScore * 0.55 + alignment.alignmentScore * 0.45)
  }

  if (alignment.detectedFocus !== alignment.targetDomain && alignment.alignmentScore < 40) {
    alignment.finalScore = Math.min(alignment.finalScore, 45)
  }

  alignment.finalScore = Math.min(Math.max(alignment.finalScore, 0), 100)
  return alignment
}
