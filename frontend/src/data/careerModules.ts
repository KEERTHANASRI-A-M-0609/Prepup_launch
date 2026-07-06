export type ModuleStatus = 'live' | 'partial' | 'planned'

export type ModuleCategory =
  | 'Workspace'
  | 'Planning'
  | 'Goals'
  | 'Applications'
  | 'Knowledge'
  | 'AI Tools'
  | 'Analytics'
  | 'Community'
  | 'Portfolio'

export interface CareerModule {
  id: string
  title: string
  description: string
  category: ModuleCategory
  status: ModuleStatus
  route?: string
  tags?: string[]
}

export const MODULE_CATEGORIES: ModuleCategory[] = [
  'Workspace',
  'Planning',
  'Goals',
  'Applications',
  'Knowledge',
  'AI Tools',
  'Analytics',
  'Community',
  'Portfolio',
]

export const CAREER_MODULES: CareerModule[] = [
  // Workspace
  { id: 'command-center', title: 'Command Center Dashboard', description: 'Live readiness, probability, gaps, and today\'s focus.', category: 'Workspace', status: 'live', route: '/', tags: ['dashboard'] },
  { id: 'career-workspace', title: 'Career Operating System Workspace', description: 'Notion-like hub for all placement modules.', category: 'Workspace', status: 'live', route: '/workspace', tags: ['hub'] },
  { id: 'placement-journal', title: 'Placement Journal', description: 'Daily wins, setbacks, and lessons learned.', category: 'Workspace', status: 'live', route: '/knowledge', tags: ['journal'] },
  { id: 'daily-reflection', title: 'Daily Reflection System', description: 'Structured reflection tied to verified planner tasks.', category: 'Workspace', status: 'live', route: '/knowledge', tags: ['reflection'] },
  { id: 'weekly-review', title: 'Weekly Review System', description: 'End-of-week progress and next-week priorities.', category: 'Workspace', status: 'live', route: '/reports', tags: ['review'] },
  { id: 'monthly-review', title: 'Monthly Career Review', description: 'Month-over-month readiness and pipeline review.', category: 'Workspace', status: 'planned' },
  { id: 'life-dashboard', title: 'Life Dashboard', description: 'Holistic view of career, health, and discipline scores.', category: 'Workspace', status: 'partial', route: '/' },
  { id: 'smart-notifications', title: 'Smart Notification Center', description: 'In-app, email, and WhatsApp alerts.', category: 'Workspace', status: 'partial', route: '/notifications' },

  // Planning
  { id: 'study-planner', title: 'Study Planner', description: 'Role and company-aware daily study plan.', category: 'Planning', status: 'live', route: '/planner', tags: ['ai'] },
  { id: 'ai-study-planner', title: 'AI Study Planner', description: 'Personalized tasks from gaps, role, and target companies.', category: 'Planning', status: 'live', route: '/planner', tags: ['ai'] },
  { id: 'preparation-calendar', title: 'Preparation Calendar', description: 'Calendar view of study and prep blocks.', category: 'Planning', status: 'planned' },
  { id: 'interview-calendar', title: 'Interview Calendar', description: 'Upcoming interviews and prep deadlines.', category: 'Planning', status: 'partial', route: '/applications' },
  { id: 'placement-events', title: 'Placement Event Calendar', description: 'Campus drives, OA dates, and hiring events.', category: 'Planning', status: 'planned' },
  { id: 'oa-hub', title: 'OA Preparation Hub', description: 'Company-specific OA patterns and timed mocks.', category: 'Planning', status: 'partial', route: '/preparation' },
  { id: 'mock-oa', title: 'Mock OA Simulator', description: 'Timed online assessment simulations.', category: 'Planning', status: 'planned' },

  // Goals
  { id: 'goal-management', title: 'Goal Management System', description: 'Set placement goals and track completion.', category: 'Goals', status: 'partial', route: '/settings' },
  { id: 'smart-goals', title: 'Smart Goal Tracking', description: 'SMART goals linked to readiness milestones.', category: 'Goals', status: 'planned' },
  { id: 'milestones', title: 'Milestone Tracker', description: 'Key placement milestones and checkpoints.', category: 'Goals', status: 'planned' },
  { id: 'achievements', title: 'Achievement Tracker', description: 'Badges for verified execution and offers.', category: 'Goals', status: 'partial', route: '/momentum' },
  { id: 'career-roadmap', title: 'Career Roadmap Builder', description: 'Visual roadmap from today to offer.', category: 'Goals', status: 'planned' },
  { id: 'company-roadmaps', title: 'Company-Specific Roadmaps', description: 'Prep roadmaps per target company.', category: 'Goals', status: 'partial', route: '/resources' },

  // Applications
  { id: 'application-kanban', title: 'Application Kanban Board', description: 'Track applications across pipeline stages.', category: 'Applications', status: 'live', route: '/applications' },
  { id: 'company-research', title: 'Company Research Hub', description: 'Research notes and intel per company.', category: 'Applications', status: 'live', route: '/knowledge' },
  { id: 'company-prep-tracker', title: 'Company Preparation Tracker', description: 'Track prep progress per target company.', category: 'Applications', status: 'partial', route: '/planner' },
  { id: 'interview-experiences', title: 'Interview Experience Repository', description: 'Store and learn from interview experiences.', category: 'Applications', status: 'live', route: '/failures' },
  { id: 'company-question-banks', title: 'Company-Specific Question Banks', description: 'Curated questions by company and round.', category: 'Applications', status: 'partial', route: '/preparation' },
  { id: 'recruiter-crm', title: 'Personal CRM for Recruiters', description: 'Track recruiter conversations and follow-ups.', category: 'Applications', status: 'planned' },
  { id: 'referral-tracker', title: 'Referral Tracker', description: 'Referral requests and status per company.', category: 'Applications', status: 'live', route: '/knowledge' },
  { id: 'follow-up-reminders', title: 'Follow-up Reminder System', description: 'Automated nudges for applications and recruiters.', category: 'Applications', status: 'partial', route: '/notifications' },

  // Knowledge
  { id: 'resource-library', title: 'Resource Library', description: 'Gap-based learning resources.', category: 'Knowledge', status: 'live', route: '/resources' },
  { id: 'personalized-learning', title: 'Personalized Learning Hub', description: 'Resources tailored to role and weaknesses.', category: 'Knowledge', status: 'live', route: '/preparation' },
  { id: 'placement-wiki', title: 'Placement Wiki', description: 'Playbooks for roles, companies, and rounds.', category: 'Knowledge', status: 'live', route: '/knowledge' },
  { id: 'personal-notes', title: 'Personal Notes System', description: 'Free-form notes across modules.', category: 'Knowledge', status: 'live', route: '/knowledge' },
  { id: 'dsa-notes', title: 'DSA Notes Repository', description: 'Pattern notes and problem solutions.', category: 'Knowledge', status: 'live', route: '/knowledge' },
  { id: 'interview-notes', title: 'Interview Notes Repository', description: 'Questions asked and your answers.', category: 'Knowledge', status: 'live', route: '/knowledge' },
  { id: 'bookmarks', title: 'Bookmark System', description: 'Save resources and links for later.', category: 'Knowledge', status: 'live', route: '/knowledge' },
  { id: 'resource-collections', title: 'Resource Collections', description: 'Curated lists by topic or company.', category: 'Knowledge', status: 'partial', route: '/resources' },

  // AI Tools
  { id: 'ai-career-coach', title: 'AI Career Coach', description: 'Guidance based on readiness and gaps.', category: 'AI Tools', status: 'partial', route: '/health' },
  { id: 'ai-resume-writer', title: 'AI Resume Writer', description: 'ATS-optimized resume suggestions.', category: 'AI Tools', status: 'partial', route: '/health?module=resume' },
  { id: 'ai-interview-answers', title: 'AI Interview Answer Generator', description: 'STAR answers for behavioral questions.', category: 'AI Tools', status: 'partial', route: '/health?module=interview' },
  { id: 'ai-career-chat', title: 'AI Career Chat Assistant', description: 'Chat-based career Q&A and navigation.', category: 'AI Tools', status: 'live', route: '/', tags: ['chat', 'ai'] },
  { id: 'ai-linkedin', title: 'AI LinkedIn Optimizer', description: 'Headline and summary optimization.', category: 'AI Tools', status: 'planned' },
  { id: 'ai-cold-email', title: 'AI Cold Email Generator', description: 'Outreach templates for referrals.', category: 'AI Tools', status: 'planned' },
  { id: 'placement-blueprint', title: 'Placement Success Blueprint Generator', description: 'Personalized strategy from profile data.', category: 'AI Tools', status: 'partial', route: '/' },
  { id: 'placement-strategy', title: 'Personalized Placement Strategy', description: 'Weekly focus areas and readiness projection from your gaps.', category: 'AI Tools', status: 'live', route: '/readiness' },

  // Analytics
  { id: 'career-health-score', title: 'Career Health Score', description: 'Evidence-based readiness across modules.', category: 'Analytics', status: 'live', route: '/health' },
  { id: 'readiness-heatmap', title: 'Readiness Heatmap', description: 'Visual heatmap of skill readiness.', category: 'Analytics', status: 'partial', route: '/readiness' },
  { id: 'progress-heatmap', title: 'Progress Heatmap', description: 'Execution consistency over time.', category: 'Analytics', status: 'live', route: '/momentum' },
  { id: 'skill-progress', title: 'Skill Progress Tracker', description: 'Track DSA, projects, resume over weeks.', category: 'Analytics', status: 'partial', route: '/reports' },
  { id: 'domain-readiness', title: 'Domain Readiness Tracker', description: 'Readiness vs role benchmarks.', category: 'Analytics', status: 'live', route: '/readiness' },
  { id: 'company-readiness', title: 'Company Readiness Tracker', description: 'How ready you are per target company.', category: 'Analytics', status: 'live', route: '/readiness' },
  { id: 'offer-readiness', title: 'Offer Readiness Tracker', description: 'Probability and offer-stage readiness.', category: 'Analytics', status: 'partial', route: '/' },
  { id: 'placement-analytics', title: 'Placement Analytics Center', description: 'Deep analytics on prep and pipeline.', category: 'Analytics', status: 'partial', route: '/reports' },
  { id: 'placement-prediction', title: 'Placement Prediction Engine', description: 'ML-style placement probability.', category: 'Analytics', status: 'partial', route: '/' },
  { id: 'offer-probability', title: 'Offer Probability Engine', description: 'Offer odds by company and stage.', category: 'Analytics', status: 'live', route: '/readiness' },
  { id: 'focus-score', title: 'Focus Score', description: 'Daily focus and task completion quality.', category: 'Analytics', status: 'partial', route: '/planner' },
  { id: 'productivity-score', title: 'Productivity Score', description: 'Hours and verified tasks per week.', category: 'Analytics', status: 'live', route: '/momentum' },
  { id: 'discipline-score', title: 'Discipline Score', description: 'Streak and consistency metrics.', category: 'Analytics', status: 'live', route: '/momentum' },
  { id: 'consistency-score', title: 'Consistency Score', description: 'Execution regularity over 30 days.', category: 'Analytics', status: 'live', route: '/momentum' },
  { id: 'career-risk', title: 'Career Risk Detection', description: 'Detect momentum and pipeline risks.', category: 'Analytics', status: 'partial', route: '/failures' },
  { id: 'burnout-detection', title: 'Burnout Detection', description: 'Workload and inactivity signals.', category: 'Analytics', status: 'planned' },
  { id: 'skill-tree', title: 'Skill Tree Visualization', description: 'RPG-style skill unlock progression.', category: 'Analytics', status: 'planned' },
  { id: 'placement-journey', title: 'Placement Journey Visualization', description: 'Timeline from start to offer.', category: 'Analytics', status: 'planned' },
  { id: 'benchmarking', title: 'Benchmarking System', description: 'Compare against role benchmarks.', category: 'Analytics', status: 'live', route: '/readiness' },
  { id: 'peer-comparison', title: 'Peer Comparison Analytics', description: 'Anonymous peer benchmarking.', category: 'Analytics', status: 'planned' },
  { id: 'executive-reports', title: 'Executive Career Report Center', description: 'Exportable career reports.', category: 'Analytics', status: 'partial', route: '/reports' },

  // Community
  { id: 'mentor-workspace', title: 'Mentor Workspace', description: 'Share progress with mentors.', category: 'Community', status: 'planned' },
  { id: 'peer-learning', title: 'Peer Learning Workspace', description: 'Study groups and peer accountability.', category: 'Community', status: 'planned' },
  { id: 'accountability-partner', title: 'Accountability Partner System', description: 'Pair with a prep buddy.', category: 'Community', status: 'planned' },
  { id: 'alumni-connect', title: 'Alumni Connect Module', description: 'Connect with placed alumni.', category: 'Community', status: 'planned' },
  { id: 'community-feed', title: 'Placement Community Feed', description: 'Community updates and tips.', category: 'Community', status: 'planned' },
  { id: 'success-stories', title: 'Success Stories Hub', description: 'Placement success stories.', category: 'Community', status: 'planned' },
  { id: 'career-insights', title: 'Career Insights Feed', description: 'Industry and placement insights.', category: 'Community', status: 'planned' },
  { id: 'industry-trends', title: 'Industry Trends Dashboard', description: 'Hiring trends by role and domain.', category: 'Community', status: 'planned' },
  { id: 'salary-insights', title: 'Salary Insights Dashboard', description: 'Compensation benchmarks.', category: 'Community', status: 'planned' },

  // Portfolio
  { id: 'resume-versions', title: 'Resume Version Manager', description: 'Multiple resume versions per role.', category: 'Portfolio', status: 'partial', route: '/health?module=resume' },
  { id: 'portfolio-builder', title: 'Portfolio Builder', description: 'Showcase projects and demos.', category: 'Portfolio', status: 'partial', route: '/health?module=github' },
  { id: 'project-showcase', title: 'Project Showcase Hub', description: 'Highlight best projects for recruiters.', category: 'Portfolio', status: 'partial', route: '/health?module=github' },
  { id: 'github-tracker', title: 'GitHub Contribution Tracker', description: 'Commits and contribution streaks.', category: 'Portfolio', status: 'partial', route: '/health?module=github' },
  { id: 'coding-streak', title: 'Coding Streak Tracker', description: 'LeetCode and coding consistency.', category: 'Portfolio', status: 'partial', route: '/health?module=coding' },
  { id: 'contest-tracker', title: 'Coding Contest Tracker', description: 'Contest participation and ratings.', category: 'Portfolio', status: 'planned' },
  { id: 'career-timeline', title: 'Career Timeline', description: 'Visual timeline of career events.', category: 'Portfolio', status: 'planned' },
  { id: 'digital-portfolio', title: 'Digital Career Portfolio', description: 'Shareable career portfolio page.', category: 'Portfolio', status: 'planned' },
  { id: 'career-knowledge-graph', title: 'Career Knowledge Graph', description: 'Connected view of skills and experiences.', category: 'Portfolio', status: 'planned' },
  { id: 'networking-tracker', title: 'Networking Tracker', description: 'Track networking conversations.', category: 'Portfolio', status: 'planned' },
]

export function getModulesByCategory(category: ModuleCategory): CareerModule[] {
  return CAREER_MODULES.filter(m => m.category === category)
}

export function countByStatus() {
  const live = CAREER_MODULES.filter(m => m.status === 'live').length
  const partial = CAREER_MODULES.filter(m => m.status === 'partial').length
  const planned = CAREER_MODULES.filter(m => m.status === 'planned').length
  return { live, partial, planned, total: CAREER_MODULES.length }
}
