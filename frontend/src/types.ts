export interface PlatformData {
  leetcode: import('./services/platformAPI').LeetCodeData | null
  github: import('./services/platformAPI').GitHubData | null
  fetchedAt: string
}

export interface ResumeEvidence {
  fileName: string
  fileSize: number
  wordCount: number
  hasEmail: boolean
  hasPhone: boolean
  hasGithub: boolean
  hasLinkedin: boolean
  hasEducation: boolean
  hasExperience: boolean
  hasProjects: boolean
  hasSkills: boolean
  quantifiedCount: number   // number of lines with digits/% (impact metrics)
  actionVerbCount: number   // strong action verbs
  estimatedPages: number
  rawScore: number          // 0–100 final score (structure + role alignment)
  structuralScore?: number
  roleAlignment?: number
  detectedFocus?: string
  targetDomain?: string
  roleConflicts?: string[]
  roleWarnings?: string[]
  aiTips?: string[]
  aiSummary?: string
  mlSimilarityPct?: number
  aiSource?: string
}

export interface CommEvidence {
  method: 'voice' | 'skipped'
  durationSecs: number
  wordCount: number
  fillerCount: number       // um, uh, like, you know, basically
  wordsPerMinute: number
  fillerRate: number        // fillers per 100 words
  transcript: string
  score: number             // 0–100 computed
  fluency?: number
  confidence?: number
  grammar?: number
  vocabulary?: number
  speakingPace?: number
  sentenceStructure?: number
  professionalTone?: number
  strengths?: string[]
  weaknesses?: string[]
  recommendations?: string[]
}

export interface MockInterviewSession {
  id: string
  date: string
  type: 'technical' | 'behavioral' | 'mixed'
  score: number
  problemSolving: number
  communication: number
  technicalDepth: number
  confidence: number
  feedback: string[]
  questions: string[]
  transcript: string
}

export interface CodingProfile {
  leetcode?: string
  hackerrank?: string
  codechef?: string
  github?: string
  problemsSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  weakTopics: string[]
  recommendedTopics: string[]
  consistencyScore: number
  contestActivity: number
  readinessScore: number
  roadmap: string[]
}

export interface AptitudeEvidence {
  totalQuestions: number
  correct: number
  score: number             // 0–100
  categoryScores: { quant: number; logical: number; verbal: number }
}

export interface UserProfile {
  name: string
  email: string
  phone?: string
  college: string
  branch: string
  graduationYear: string
  cgpa: string
  goal: 'placement' | 'internship'
  domain: string
  targetRole?: string
  level: 'beginner' | 'intermediate' | 'advanced'
  weeklyHours: string
  targetCompanies: string[]
}

export interface AssessmentSections {
  leetcode: boolean
  github: boolean
  resume: boolean
  aptitude: boolean
  communication: boolean
}

export interface Assessment {
  dsa: number
  resume: number
  projects: number
  communication: number
  aptitude: number
  interview: number
  completed: boolean
  sections?: AssessmentSections
  assessedAt?: string
  resumeEvidence?: ResumeEvidence
  commEvidence?: CommEvidence
  aptitudeEvidence?: AptitudeEvidence
}

export interface Application {
  id: string
  company: string
  role: string
  status: 'Wishlist' | 'Applied' | 'Online Assessment' | 'Technical Interview' | 'HR Interview' | 'Selected' | 'Rejected'
  deadline: string
  notes: string
}

export interface FailureEntry {
  id: string
  company: string
  role: string
  round: string
  date: string
  questionsAsked: string
  confidence: 1 | 2 | 3 | 4 | 5
  difficulty: 'Easy' | 'Medium' | 'Hard'
  reason: string
  tags: string[]
}

export interface DSATopic {
  name: string
  solved: number
  total: number
}

export interface Project {
  id: string
  name: string
  description: string
  github: string
  demo: string
  status: 'In Progress' | 'Completed' | 'Deployed'
  tech: string[]
}

export interface RecoveryState {
  inactive: boolean
  daysInactive: number
  reason: string
  planActive: boolean
  tasksDone: Record<number, boolean>
}

export interface ActivityLog {
  date: string
  tasksCompleted: number
  hoursSpent: number
  /** Planner tasks verified with proof — counts for streaks */
  verifiedTasks?: number
  /** Platform actions (assessments, applications, modules) beyond planner tasks */
  executions?: number
}

export interface ResourceItem {
  title: string
  type: string
  tag: string
  url: string
  why?: string
  impact?: string
  effort?: string
  provider?: string
  company?: string
}

export interface WeekSnapshot {
  week: string
  readiness: number
  hours: number
}

export interface PersonalNote {
  id: string
  title: string
  body: string
  tags: string[]
  category: 'general' | 'dsa' | 'interview' | 'company'
  updatedAt: string
}

export interface WikiPage {
  id: string
  title: string
  body: string
  category: string
  builtIn?: boolean
  updatedAt: string
}

export interface JournalEntry {
  id: string
  date: string
  mood: 'great' | 'ok' | 'tough'
  wins: string
  struggles: string
  lessons: string
}

export interface CompanyResearch {
  id: string
  company: string
  roleNotes: string
  interviewTips: string
  cultureNotes: string
  salaryNotes: string
  updatedAt: string
}

export interface Bookmark {
  id: string
  title: string
  url: string
  tags: string[]
  createdAt: string
}

export interface ReferralEntry {
  id: string
  company: string
  contactName: string
  status: 'Requested' | 'Submitted' | 'Interview' | 'Closed'
  notes: string
  updatedAt: string
}

export interface KnowledgeData {
  notes: PersonalNote[]
  wikiPages: WikiPage[]
  journal: JournalEntry[]
  companyResearch: CompanyResearch[]
  bookmarks: Bookmark[]
  referrals: ReferralEntry[]
}

export interface CompanyReadinessResult {
  company: string
  readinessPct: number
  strong: string[]
  weak: string[]
}

export interface WeeklyStrategy {
  thisWeek: string[]
  currentReadiness: number
  projectedReadiness: number
}
