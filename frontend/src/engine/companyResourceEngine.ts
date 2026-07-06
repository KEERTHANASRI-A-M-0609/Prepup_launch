import type { ResourceItem } from '../types'

export type ResourceProvider =
  | 'GeeksforGeeks'
  | 'Udemy'
  | 'Coursera'
  | 'YouTube'
  | 'LeetCode'
  | 'InterviewBit'
  | 'IndiaBix'
  | 'Official'
  | 'NeetCode'

export interface CompanyPrepProfile {
  name: string
  aliases: string[]
  focusAreas: string[]
  rounds: string[]
  skillPriority: string[]
  resources: ResourceItem[]
}

const yt = (id: string, title: string, why: string, tag: string, effort: string): ResourceItem => ({
  title,
  type: 'Video',
  tag,
  provider: 'YouTube',
  url: `https://www.youtube.com/watch?v=${id}`,
  why,
  impact: 'High',
  effort,
})

const gfg = (path: string, title: string, why: string, tag: string): ResourceItem => ({
  title,
  type: 'Practice',
  tag,
  provider: 'GeeksforGeeks',
  url: `https://www.geeksforgeeks.org/${path}`,
  why,
  impact: 'High',
  effort: '45 min/day',
})

export const COMPANY_PREP_PROFILES: CompanyPrepProfile[] = [
  {
    name: 'Amazon',
    aliases: ['Amazon', 'AWS'],
    focusAreas: ['DSA', 'Leadership Principles', 'System Design', 'OOPS'],
    rounds: ['Online Assessment', 'Technical', 'Bar Raiser', 'HR'],
    skillPriority: ['dsa', 'communication', 'interview'],
    resources: [
      gfg('amazon-interview-preparation', 'GFG Amazon SDE Interview Prep', 'Company-specific OA and coding patterns asked at Amazon', 'Amazon'),
      {
        title: 'Amazon Leadership Principles (Official)',
        type: 'Guide',
        tag: 'Amazon',
        provider: 'Official',
        url: 'https://www.amazon.jobs/content/en/our-workplace/leadership-principles',
        why: 'Behavioral rounds are scored against these 16 principles',
        impact: 'High',
        effort: '2 hrs one-time',
        company: 'Amazon',
      },
      {
        title: 'Grokking the System Design Interview',
        type: 'Course',
        tag: 'Amazon',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/grokking-the-system-design-interview/',
        why: 'Amazon L5+ loops include system design',
        impact: 'High',
        effort: '1 hr/day',
        company: 'Amazon',
      },
      yt('M0Zb8KaLRoE', 'NeetCode — System Design for Beginners', 'System design vocabulary for Amazon loops', 'Amazon', '45 min'),
    ],
  },
  {
    name: 'Google',
    aliases: ['Google', 'Alphabet'],
    focusAreas: ['DSA', 'Graphs', 'Dynamic Programming', 'Googliness'],
    rounds: ['Phone Screen', 'Onsite', 'Hiring Committee'],
    skillPriority: ['dsa', 'interview', 'communication'],
    resources: [
      gfg('google-interview-preparation', 'GFG Google Interview Preparation', 'Topic-wise Google coding questions', 'Google'),
      {
        title: 'InterviewBit — Google Interview Questions',
        type: 'Practice',
        tag: 'Google',
        provider: 'InterviewBit',
        url: 'https://www.interviewbit.com/google-interview-questions/',
        why: 'Curated Google-tagged problems with editorial solutions',
        impact: 'High',
        effort: '60 min/day',
        company: 'Google',
      },
      {
        title: 'Algorithms, Part I — Princeton (Coursera)',
        type: 'Course',
        tag: 'Google',
        provider: 'Coursera',
        url: 'https://www.coursera.org/learn/algorithms-part1',
        why: 'Rigorous algorithms foundation aligned with Google technical bar',
        impact: 'High',
        effort: '5 hrs/week',
        company: 'Google',
      },
      yt('RBSGKlAvoiM', 'freeCodeCamp — Data Structures Full Course', 'Complete DS foundation for Google-style problems', 'Google', '12 hrs total'),
    ],
  },
  {
    name: 'Microsoft',
    aliases: ['Microsoft', 'MSFT'],
    focusAreas: ['DSA', 'OOPS', 'Projects', 'Behavioral'],
    rounds: ['Codility OA', 'Technical', 'AA Round'],
    skillPriority: ['dsa', 'projects', 'communication'],
    resources: [
      gfg('microsoft-interview-experience-set-1', 'GFG Microsoft Interview Experiences', 'Real Microsoft interview breakdowns', 'Microsoft'),
      {
        title: 'LeetCode — Microsoft Tagged Problems',
        type: 'Practice',
        tag: 'Microsoft',
        provider: 'LeetCode',
        url: 'https://leetcode.com/company/microsoft/',
        why: 'Live company-tagged problem set',
        impact: 'High',
        effort: '45 min/day',
        company: 'Microsoft',
      },
      {
        title: 'Master the Coding Interview (Udemy)',
        type: 'Course',
        tag: 'Microsoft',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/master-the-coding-interview-data-structures-algorithms/',
        why: 'Patterns seen in Microsoft OAs and tech rounds',
        impact: 'High',
        effort: '1 hr/day',
        company: 'Microsoft',
      },
      yt('OCCp8hQAx1s', 'Abdul Bari — Algorithms Playlist', 'Clear DSA explanations for Microsoft OA topics', 'Microsoft', '30 min/day'),
    ],
  },
  {
    name: 'Flipkart',
    aliases: ['Flipkart'],
    focusAreas: ['DSA', 'Aptitude', 'Machine Coding', 'Projects'],
    rounds: ['Aptitude', 'Coding', 'Machine Round', 'HR'],
    skillPriority: ['aptitude', 'dsa', 'projects'],
    resources: [
      gfg('flipkart-interview-experience', 'GFG Flipkart Interview Experience', 'Flipkart coding and machine round patterns', 'Flipkart'),
      {
        title: 'IndiaBix — Aptitude Practice',
        type: 'Practice',
        tag: 'Flipkart',
        provider: 'IndiaBix',
        url: 'https://www.indiabix.com/aptitude/questions-and-answers/',
        why: 'Flipkart OA includes quant and logical reasoning',
        impact: 'High',
        effort: '30 min/day',
        company: 'Flipkart',
      },
      {
        title: 'InterviewBit — Flipkart Questions',
        type: 'Practice',
        tag: 'Flipkart',
        provider: 'InterviewBit',
        url: 'https://www.interviewbit.com/flipkart-interview-questions/',
        why: 'Company-specific coding questions',
        impact: 'High',
        effort: '45 min/day',
        company: 'Flipkart',
      },
      yt('k9GS1SyOKBc', 'Striver — SDE Sheet Overview', 'Structured DSA for Flipkart coding rounds', 'Flipkart', '45 min/day'),
    ],
  },
  {
    name: 'TCS',
    aliases: ['TCS', 'Tata Consultancy Services'],
    focusAreas: ['Aptitude', 'C/Java', 'Communication', 'Projects'],
    rounds: ['NQT', 'Technical', 'Managerial', 'HR'],
    skillPriority: ['aptitude', 'communication', 'dsa'],
    resources: [
      gfg('tcs-nqt-placement-paper', 'GFG TCS NQT Placement Papers', 'TCS NQT questions with solutions', 'TCS'),
      {
        title: 'IndiaBix — TCS NQT Mock Test',
        type: 'Practice',
        tag: 'TCS',
        provider: 'IndiaBix',
        url: 'https://www.indiabix.com/online-test/tcs-nqt-mock-test/',
        why: 'Mock NQT matching TCS quant and reasoning format',
        impact: 'High',
        effort: '30 min/day',
        company: 'TCS',
      },
      {
        title: 'TCS iON Career Edge (Coursera)',
        type: 'Course',
        tag: 'TCS',
        provider: 'Coursera',
        url: 'https://www.coursera.org/learn/tcs-ion-career-edge-young-professional',
        why: 'TCS-recognized employability course',
        impact: 'Medium',
        effort: '3 hrs/week',
        company: 'TCS',
      },
    ],
  },
  {
    name: 'Infosys',
    aliases: ['Infosys'],
    focusAreas: ['Aptitude', 'Pseudo Code', 'Communication', 'Puzzle'],
    rounds: ['Online Test', 'Technical', 'HR'],
    skillPriority: ['aptitude', 'communication', 'dsa'],
    resources: [
      gfg('infosys-interview-experience', 'GFG Infosys Interview Preparation', 'Infosys aptitude and pseudo-code patterns', 'Infosys'),
      {
        title: 'IndiaBix — Infosys Mock Test',
        type: 'Practice',
        tag: 'Infosys',
        provider: 'IndiaBix',
        url: 'https://www.indiabix.com/online-test/infosys-mock-test/',
        why: 'Matches Infosys online test sections',
        impact: 'High',
        effort: '30 min/day',
        company: 'Infosys',
      },
      {
        title: 'Infosys Springboard',
        type: 'Course',
        tag: 'Infosys',
        provider: 'Official',
        url: 'https://infyspringboard.onwingspan.com/',
        why: 'Official Infosys learning platform',
        impact: 'Medium',
        effort: '2 hrs/week',
        company: 'Infosys',
      },
    ],
  },
  {
    name: 'Wipro',
    aliases: ['Wipro'],
    focusAreas: ['Aptitude', 'Verbal', 'Technical', 'Communication'],
    rounds: ['Online Assessment', 'Technical', 'HR'],
    skillPriority: ['aptitude', 'communication', 'resume'],
    resources: [
      gfg('wipro-interview-experience', 'GFG Wipro Interview Questions', 'Wipro NLTH hiring track questions', 'Wipro'),
      {
        title: 'IndiaBix — Wipro Mock Test',
        type: 'Practice',
        tag: 'Wipro',
        provider: 'IndiaBix',
        url: 'https://www.indiabix.com/online-test/wipro-mock-test/',
        why: 'Verbal and aptitude sections mirror Wipro OA',
        impact: 'High',
        effort: '30 min/day',
        company: 'Wipro',
      },
    ],
  },
  {
    name: 'Accenture',
    aliases: ['Accenture'],
    focusAreas: ['Aptitude', 'Communication', 'Pseudo Code', 'Cognitive'],
    rounds: ['Cognitive Assessment', 'Technical', 'HR'],
    skillPriority: ['aptitude', 'communication', 'dsa'],
    resources: [
      gfg('accenture-interview-experience', 'GFG Accenture Interview Experience', 'Accenture cognitive and technical rounds', 'Accenture'),
      {
        title: 'IndiaBix — Accenture Mock Test',
        type: 'Practice',
        tag: 'Accenture',
        provider: 'IndiaBix',
        url: 'https://www.indiabix.com/online-test/accenture-mock-test/',
        why: 'Practice cognitive and aptitude before Accenture OA',
        impact: 'High',
        effort: '30 min/day',
        company: 'Accenture',
      },
    ],
  },
  {
    name: 'Goldman Sachs',
    aliases: ['Goldman Sachs', 'GS'],
    focusAreas: ['DSA', 'Quant', 'Probability', 'System Design'],
    rounds: ['HackerRank OA', 'Technical', 'Superday'],
    skillPriority: ['dsa', 'aptitude', 'interview'],
    resources: [
      gfg('goldman-sachs-interview-experience', 'GFG Goldman Sachs Interview Prep', 'GS engineering interview patterns', 'Goldman Sachs'),
      {
        title: 'LeetCode — Goldman Sachs',
        type: 'Practice',
        tag: 'Goldman Sachs',
        provider: 'LeetCode',
        url: 'https://leetcode.com/company/goldman-sachs/',
        why: 'Company-tagged problems from recent GS interviews',
        impact: 'High',
        effort: '60 min/day',
        company: 'Goldman Sachs',
      },
      {
        title: 'Mathematics for Machine Learning (Coursera)',
        type: 'Course',
        tag: 'Goldman Sachs',
        provider: 'Coursera',
        url: 'https://www.coursera.org/specializations/mathematics-machine-learning',
        why: 'Quant fundamentals for GS engineering roles',
        impact: 'High',
        effort: '4 hrs/week',
        company: 'Goldman Sachs',
      },
    ],
  },
  {
    name: 'Adobe',
    aliases: ['Adobe'],
    focusAreas: ['DSA', 'C++', 'OOPS', 'Projects'],
    rounds: ['Online Test', 'Technical', 'Director Round'],
    skillPriority: ['dsa', 'projects', 'resume'],
    resources: [
      gfg('adobe-interview-experience', 'GFG Adobe Interview Preparation', 'Adobe coding and C++ questions', 'Adobe'),
      {
        title: 'LeetCode — Adobe Tagged',
        type: 'Practice',
        tag: 'Adobe',
        provider: 'LeetCode',
        url: 'https://leetcode.com/company/adobe/',
        why: 'Recent Adobe interview questions',
        impact: 'High',
        effort: '45 min/day',
        company: 'Adobe',
      },
      yt('zYhAnO-BKSA', 'C++ OOPS — freeCodeCamp', 'Adobe technical rounds test OOPS in C++', 'Adobe', '4 hrs total'),
    ],
  },
]

export const ROLE_RESOURCE_EXTENSIONS: Record<string, ResourceItem[]> = {
  'Software Engineering': [
    {
      title: 'NeetCode 150 — Free Roadmap',
      type: 'Roadmap',
      tag: 'DSA',
      provider: 'NeetCode',
      url: 'https://neetcode.io/roadmap',
      why: 'Pattern-based DSA roadmap for product companies',
      impact: 'High',
      effort: '60 min/day',
    },
    {
      title: 'GFG SDE Sheet — 180 Problems',
      type: 'Practice',
      tag: 'DSA',
      provider: 'GeeksforGeeks',
      url: 'https://www.geeksforgeeks.org/sde-sheet/',
      why: 'Topic-wise sheet covering placement DSA patterns',
      impact: 'High',
      effort: '45 min/day',
    },
  ],
  'Data Science': [
    {
      title: 'StatQuest — Statistics & ML (YouTube)',
      type: 'Video',
      tag: 'Data',
      provider: 'YouTube',
      url: 'https://www.youtube.com/c/joshstarmer',
      why: 'Statistics fundamentals for data science OAs',
      impact: 'High',
      effort: '30 min/day',
    },
    {
      title: 'IBM Data Science Professional (Coursera)',
      type: 'Course',
      tag: 'Data',
      provider: 'Coursera',
      url: 'https://www.coursera.org/professional-certificates/ibm-data-science',
      why: 'Industry credential with portfolio projects',
      impact: 'High',
      effort: '5 hrs/week',
    },
  ],
  'Product Management': [
    {
      title: 'Google Project Management Certificate (Coursera)',
      type: 'Course',
      tag: 'PM',
      provider: 'Coursera',
      url: 'https://www.coursera.org/professional-certificates/google-project-management',
      why: 'PM fundamentals recognized by tech recruiters',
      impact: 'High',
      effort: '4 hrs/week',
    },
    {
      title: 'Exponent — PM Interview Prep',
      type: 'Course',
      tag: 'PM',
      provider: 'Official',
      url: 'https://www.tryexponent.com/courses/pm',
      why: 'Product sense and behavioral frameworks',
      impact: 'High',
      effort: '45 min/day',
    },
  ],
}

export interface CompanyPrepSection {
  company: string
  focusAreas: string[]
  rounds: string[]
  resources: ResourceItem[]
  prioritySkills: string[]
}

function normalizeCompany(name: string): string {
  return name.trim().toLowerCase()
}

export function matchCompanyProfile(name: string): CompanyPrepProfile | undefined {
  const n = normalizeCompany(name)
  return COMPANY_PREP_PROFILES.find(
    p => p.name.toLowerCase() === n || p.aliases.some(a => a.toLowerCase() === n),
  )
}

export function resolveCompanyProfiles(targetCompanies: string[]): CompanyPrepProfile[] {
  const seen = new Set<string>()
  const result: CompanyPrepProfile[] = []
  for (const raw of targetCompanies) {
    const profile = matchCompanyProfile(raw)
    if (profile && !seen.has(profile.name)) {
      seen.add(profile.name)
      result.push(profile)
    }
  }
  return result
}

export function buildCompanyPrepSections(
  targetCompanies: string[],
  gapKeys: string[],
): CompanyPrepSection[] {
  const profiles = resolveCompanyProfiles(targetCompanies)
  if (!profiles.length) return []

  return profiles.map(profile => {
    const gapSet = new Set(gapKeys)
    const sortedSkills = [...profile.skillPriority].sort((a, b) => {
      const ag = gapSet.has(a) ? 1 : 0
      const bg = gapSet.has(b) ? 1 : 0
      return bg - ag
    })

    return {
      company: profile.name,
      focusAreas: profile.focusAreas,
      rounds: profile.rounds,
      resources: profile.resources.map(r => ({ ...r, company: profile.name })),
      prioritySkills: sortedSkills,
    }
  })
}

export function mergeCompanyResources(
  base: ResourceItem[],
  companies: string[],
  gapKeys: string[],
  limit = 12,
): ResourceItem[] {
  const sections = buildCompanyPrepSections(companies, gapKeys)
  const companyItems = sections.flatMap(s => s.resources)
  const seen = new Set<string>()
  const merged: ResourceItem[] = []

  for (const item of [...companyItems, ...base]) {
    const key = `${item.url}::${item.title}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
    if (merged.length >= limit) break
  }
  return merged
}

export function providerLabel(provider?: string): string {
  return provider ?? 'Web'
}
