/** Proof requirements for verified planner completions (no forced wait while typing). */



export interface ProofRequirement {

  proofLabel: string

  proofPlaceholder: string

  proofRequired: boolean

  reflectionMinChars: number

}



const CATEGORY_RULES: Record<string, Partial<ProofRequirement>> = {

  DSA: {

    proofLabel: 'Proof link',

    proofPlaceholder: 'LeetCode submission or problem URL',

    proofRequired: true,

  },

  'Cloud & DevOps': {

    proofLabel: 'Proof link',

    proofPlaceholder: 'GitHub commit, pipeline run, or lab URL',

    proofRequired: true,

  },

  Projects: {

    proofLabel: 'Proof link',

    proofPlaceholder: 'GitHub repo, deploy URL, or PR link',

    proofRequired: true,

  },

  Resume: {

    proofLabel: 'Proof link (optional)',

    proofPlaceholder: 'Jobscan result or updated resume link',

    proofRequired: false,

  },

  Communication: {

    proofLabel: 'Proof note',

    proofPlaceholder: 'Career Health voice module or recording note',

    proofRequired: false,

  },

  Aptitude: {

    proofLabel: 'Proof link (optional)',

    proofPlaceholder: 'IndiaBix score screenshot link or mock result',

    proofRequired: false,

  },

  Applications: {

    proofLabel: 'Proof link',

    proofPlaceholder: 'Application portal or email confirmation',

    proofRequired: true,

  },

  Interview: {

    proofLabel: 'Proof link (optional)',

    proofPlaceholder: 'Mock interview session or notes link',

    proofRequired: false,

  },

}



export function getProofRequirement(category: string): ProofRequirement {

  const base = CATEGORY_RULES[category] ?? {}

  return {

    proofLabel: base.proofLabel ?? 'Proof link (optional)',

    proofPlaceholder: base.proofPlaceholder ?? 'URL, screenshot link, or reference',

    proofRequired: base.proofRequired ?? false,

    reflectionMinChars: 12,

  }

}



export function isValidProofUrl(value: string): boolean {

  const v = value.trim()

  if (!v) return false

  try {

    const u = new URL(v.startsWith('http') ? v : `https://${v}`)

    return u.hostname.length > 2

  } catch {

    return v.length >= 8

  }

}



export function canVerifyTask(opts: {

  requirement: ProofRequirement

  reflection: string

  proofUrl: string

}): { ok: boolean; error?: string } {

  const { requirement, reflection, proofUrl } = opts

  if (reflection.trim().length < requirement.reflectionMinChars) {

    return { ok: false, error: `Add a short reflection (${requirement.reflectionMinChars}+ characters) describing what you completed.` }

  }

  const hasProof = proofUrl.trim().length > 0

  const proofValid = !hasProof || isValidProofUrl(proofUrl)

  if (requirement.proofRequired && !hasProof) {

    return { ok: false, error: `Proof is required for ${requirement.proofLabel.replace(' (optional)', '')} tasks.` }

  }

  if (hasProof && !proofValid) {

    return { ok: false, error: 'Enter a valid URL or reference link.' }

  }

  return { ok: true }

}


