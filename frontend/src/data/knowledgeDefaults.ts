import type { WikiPage, KnowledgeData } from '../types'

export const WIKI_SEED: WikiPage[] = [
  {
    id: 'wiki-oa',
    title: 'Online Assessment (OA) Playbook',
    category: 'Rounds',
    builtIn: true,
    updatedAt: new Date().toISOString(),
    body: `**Before OA**
• Revise aptitude (time/speed/distance, ratios, puzzles)
• Practice 2 timed coding problems (45 min each)
• Check company-specific OA platform (HackerRank, AMCAT, etc.)

**During OA**
• Read all questions first — attempt easy wins
• For coding: write brute force, then optimize if time allows
• Don't leave MCQs blank — eliminate wrong options

**After OA**
• Log questions in Interview Notes
• Add company to Application Pipeline`,
  },
  {
    id: 'wiki-dsa',
    title: 'DSA Technical Round Guide',
    category: 'Rounds',
    builtIn: true,
    updatedAt: new Date().toISOString(),
    body: `**Preparation**
• 150–200 LeetCode problems minimum for product companies
• Master: Arrays, Trees, Graphs, DP, Binary Search
• Practice explaining approach out loud (5 min)

**In the interview**
• Clarify inputs, edge cases, constraints
• Think aloud — interviewers want your process
• Start with brute force → optimize → code → test

**Common patterns**
• Two pointers, sliding window, BFS/DFS, monotonic stack`,
  },
  {
    id: 'wiki-hr',
    title: 'HR & Behavioral Round',
    category: 'Rounds',
    builtIn: true,
    updatedAt: new Date().toISOString(),
    body: `**STAR format**
• Situation — context in 1 sentence
• Task — your responsibility
• Action — what YOU did (use "I")
• Result — measurable outcome

**Prepare 5 stories**
• Conflict resolution, leadership, failure, achievement, teamwork

**Common questions**
• Tell me about yourself (90 sec max)
• Why this company? Why this role?
• Strengths / weaknesses (weakness + how you're improving)`,
  },
  {
    id: 'wiki-resume',
    title: 'Resume ATS Checklist',
    category: 'Preparation',
    builtIn: true,
    updatedAt: new Date().toISOString(),
    body: `• One page for students; PDF only
• Quantify impact (%, users, latency, revenue)
• Action verbs: Built, Designed, Led, Optimized
• Skills section matches job description keywords
• GitHub + LinkedIn links that work
• No photos or graphics for ATS systems
• Run through PrepUp Resume Intelligence module`,
  },
  {
    id: 'wiki-service',
    title: 'Service Company vs Product Company',
    category: 'Strategy',
    builtIn: true,
    updatedAt: new Date().toISOString(),
    body: `**Service (TCS, Infosys, Wipro, Accenture)**
• Higher volume hiring, aptitude-heavy
• Communication and fundamentals matter
• Lower DSA bar than FAANG

**Product (Amazon, Microsoft, startups)**
• DSA + system design (for experienced)
• Strong projects and GitHub evidence
• Fewer slots, higher competition

**Match your prep** to target company tier in PrepUp Readiness.`,
  },
]

export function createDefaultKnowledge(): KnowledgeData {
  return {
    notes: [],
    wikiPages: [...WIKI_SEED],
    journal: [],
    companyResearch: [],
    bookmarks: [],
    referrals: [],
  }
}

export function mergeKnowledge(stored: Partial<KnowledgeData> | null | undefined): KnowledgeData {
  const base = createDefaultKnowledge()
  if (!stored) return base
  const builtInIds = new Set(WIKI_SEED.map(w => w.id))
  const userWiki = (stored.wikiPages ?? []).filter(w => !builtInIds.has(w.id))
  return {
    notes: stored.notes ?? [],
    wikiPages: [...WIKI_SEED, ...userWiki],
    journal: stored.journal ?? [],
    companyResearch: stored.companyResearch ?? [],
    bookmarks: stored.bookmarks ?? [],
    referrals: stored.referrals ?? [],
  }
}
