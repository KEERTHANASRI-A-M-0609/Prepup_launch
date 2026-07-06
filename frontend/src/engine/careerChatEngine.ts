import type { Application, Assessment, FailureEntry, PlatformData, UserProfile, ActivityLog } from '../types'
import { computeGaps, computeOverall, computePlacementProbability, recommendResourcePlan, computeConsistency } from './intelligence'
import { computeReadinessConfidence, getTopPriority, ASSESSMENT_MODULES } from './assessmentEngine'
import { generatePersonalizedPlan } from './plannerEngine'
import { CAREER_MODULES } from '../data/careerModules'
import { companyOffersDomain, getCompatibleCompanies } from './roleCompanyEngine'

export type ChatAction =
  | { type: 'navigate'; label: string; path: string }
  | { type: 'prompt'; label: string; message: string }

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  actions?: ChatAction[]
  timestamp: number
}

export interface ChatContext {
  user: UserProfile | null
  assessment: Assessment | null
  applications: Application[]
  activityLog: ActivityLog[]
  platformData: PlatformData | null
  failures: FailureEntry[]
  loggedIn: boolean
}

type IntentHandler = {
  id: string
  score: (msg: string, ctx: ChatContext) => number
  reply: (msg: string, ctx: ChatContext) => ChatMessage
}

const ROUTES: { keywords: RegExp; path: string; label: string; hint: string }[] = [
  { keywords: /\b(dashboard|command|home)\b/i, path: '/', label: 'Open Dashboard', hint: 'Your command center — readiness, pipeline, and quick actions.' },
  { keywords: /\b(workspace|hub)\b/i, path: '/workspace', label: 'Open Workspace', hint: 'Placement HQ with all live tools in one view.' },
  { keywords: /\b(health|assess|assessment|career health)\b/i, path: '/health', label: 'Career Health', hint: 'Run resume, LeetCode, GitHub, aptitude, communication, and mock interview modules.' },
  { keywords: /\b(planner|daily plan|today'?s plan|study plan)\b/i, path: '/planner', label: 'Daily Planner', hint: 'Role- and company-aware tasks generated for your gaps.' },
  { keywords: /\b(application|pipeline|tracker)\b/i, path: '/applications', label: 'Applications', hint: 'Track wishlist → applied → interview → offer.' },
  { keywords: /\b(resource|learn|prep)\b/i, path: '/resources', label: 'Resources', hint: 'Gap-ranked learning links for your domain.' },
  { keywords: /\b(readiness|radar)\b/i, path: '/readiness', label: 'Readiness', hint: 'Skill radar and placement benchmarks.' },
  { keywords: /\b(failure|rejection|intel)\b/i, path: '/failures', label: 'Failure Intel', hint: 'Log rejections and get pattern-based fixes.' },
  { keywords: /\b(momentum|streak|heatmap)\b/i, path: '/momentum', label: 'Momentum', hint: 'Activity streaks and consistency heatmap.' },
  { keywords: /\b(report|weekly)\b/i, path: '/reports', label: 'Weekly Reports', hint: 'Week-over-week readiness and hours.' },
  { keywords: /\b(setting|profile|phone|whatsapp|notification)\b/i, path: '/settings', label: 'Settings', hint: 'Profile, cloud sync, WhatsApp, and test alerts.' },
  { keywords: /\b(notif)\b/i, path: '/notifications', label: 'Notifications', hint: 'In-app alerts and reminders.' },
  { keywords: /\b(knowledge|wiki|notes|journal|bookmark|referral)\b/i, path: '/knowledge', label: 'Knowledge Hub', hint: 'Notes, wiki playbooks, journal, company research, bookmarks, and referrals.' },
  { keywords: /\b(project|portfolio|preparation)\b/i, path: '/preparation', label: 'Preparation', hint: 'Projects and portfolio builder.' },
]

const QUICK_STARTERS_LOGGED_IN = [
  'What should I do today?',
  'Show my skill gaps',
  'What is my readiness score?',
  'How many applications do I have?',
  'What companies fit my domain?',
]

const QUICK_STARTERS_GUEST = [
  'What are the features?',
  'How do I get started?',
  'What is PrepUp?',
  'How does onboarding work?',
]

export function getChatStarters(loggedIn: boolean): string[] {
  return loggedIn ? QUICK_STARTERS_LOGGED_IN : QUICK_STARTERS_GUEST
}

function id() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function assistant(text: string, actions?: ChatAction[]): ChatMessage {
  return { id: id(), role: 'assistant', text, actions, timestamp: Date.now() }
}

function matchRoute(msg: string) {
  return ROUTES.find(r => r.keywords.test(msg))
}

function moduleListText(filter?: RegExp): string {
  const mods = filter
    ? CAREER_MODULES.filter(m => filter.test(m.title) || filter.test(m.description) || (m.tags ?? []).some(t => filter.test(t)))
    : CAREER_MODULES.filter(m => m.status === 'live' || m.status === 'partial')
  const live = mods.filter(m => m.status === 'live').slice(0, 10)
  if (live.length === 0) return 'No matching modules found.'
  return live.map(m => `• **${m.title}** — ${m.description}`).join('\n')
}

function buildProfileSummary(ctx: ChatContext): string {
  const u = ctx.user
  if (!u) return 'You are not signed in yet.'
  return [
    `**${u.name || 'Student'}** · ${u.domain || 'Domain not set'}`,
    u.targetRole ? `Target role: ${u.targetRole}` : null,
    u.targetCompanies?.length ? `Companies: ${u.targetCompanies.join(', ')}` : 'No target companies selected',
    u.college ? `${u.college} · ${u.branch || 'Branch'}` : null,
    u.weeklyHours ? `Weekly hours: ${u.weeklyHours}` : null,
    u.phone ? `Phone: ${u.phone}` : 'No phone — add in Settings for WhatsApp alerts',
  ].filter(Boolean).join('\n')
}

function buildReadinessSummary(ctx: ChatContext): ChatMessage {
  const conf = computeReadinessConfidence(ctx.assessment, ctx.platformData)
  if (conf.measuredSections === 0) {
    return assistant(
      'No assessment evidence yet. Complete Career Health modules (resume, LeetCode, GitHub, aptitude, communication) to unlock your readiness score.',
      [
        { type: 'navigate', label: 'Start Career Health', path: '/health' },
        { type: 'prompt', label: 'What to do first?', message: 'What assessment should I complete next?' },
      ],
    )
  }
  const score = computeOverall(ctx.assessment!)
  const prob = computePlacementProbability(ctx.assessment!, ctx.applications)
  const { streak } = computeConsistency(ctx.activityLog)
  return assistant(
    [
      `**Readiness: ${score}%** (confidence: ${conf.confidence})`,
      `Placement odds: **${prob.probability}%**${prob.topBlocker ? ` — top blocker: ${prob.topBlocker}` : ''}`,
      streak > 0 ? `Current streak: **${streak} days**` : 'No active streak — complete a planner task today.',
      conf.missingEvidence.length ? `Still missing: ${conf.missingEvidence.join(', ')}` : 'All core sections have evidence.',
    ].filter(Boolean).join('\n'),
    [
      { type: 'navigate', label: 'View Readiness', path: '/readiness' },
      { type: 'prompt', label: 'Show gaps', message: 'Show my skill gaps' },
    ],
  )
}

function buildGapsSummary(ctx: ChatContext): ChatMessage {
  const domain = ctx.user?.domain || 'Software Engineering'
  const conf = computeReadinessConfidence(ctx.assessment, ctx.platformData)
  if (!ctx.assessment || conf.measuredSections === 0) {
    return assistant('Complete at least one Career Health module so I can rank your skill gaps.', [
      { type: 'navigate', label: 'Career Health', path: '/health' },
    ])
  }
  const gaps = computeGaps(ctx.assessment, domain).slice(0, 5)
  if (gaps.length === 0) {
    return assistant(`No major gaps for **${domain}**. Keep momentum with daily planner tasks.`, [
      { type: 'navigate', label: 'Daily Planner', path: '/planner' },
    ])
  }
  const lines = gaps.map((g, i) => `${i + 1}. **${g.label}** — ${g.current}% (target ${g.target}%)`)
  return assistant(`Top gaps for **${domain}**:\n${lines.join('\n')}`, [
    { type: 'navigate', label: 'Get Resources', path: '/resources' },
    { type: 'navigate', label: 'Daily Planner', path: '/planner' },
  ])
}

function buildTodayPlan(ctx: ChatContext): ChatMessage {
  const domain = ctx.user?.domain || 'Software Engineering'
  const tasks = generatePersonalizedPlan({
    domain,
    level: ctx.user?.level,
    weeklyHours: ctx.user?.weeklyHours,
    targetCompanies: ctx.user?.targetCompanies,
    assessment: ctx.assessment,
    applications: ctx.applications,
    activityLog: ctx.activityLog,
  })
  const core = tasks.filter(t => t.tier === 'core' || t.priority === 'high').slice(0, 5)
  const pick = core.length > 0 ? core : tasks.slice(0, 5)
  if (pick.length === 0) {
    return assistant('Complete Career Health first — then I can build your personalized daily plan.', [
      { type: 'navigate', label: 'Career Health', path: '/health' },
    ])
  }
  const lines = pick.map((t, i) => `${i + 1}. ${t.text} (~${t.estimatedMins} min)${t.why ? ` — ${t.why}` : ''}`)
  return assistant(
    `**Today's focus** (${domain}${ctx.user?.targetCompanies?.length ? ` · ${ctx.user.targetCompanies.slice(0, 2).join(', ')}` : ''}):\n${lines.join('\n')}`,
    [
      { type: 'navigate', label: 'Open Planner', path: '/planner' },
      { type: 'prompt', label: 'My gaps', message: 'Show my skill gaps' },
    ],
  )
}

function buildApplicationsSummary(ctx: ChatContext): ChatMessage {
  const apps = ctx.applications
  if (apps.length === 0) {
    return assistant(
      'No applications tracked yet. Add companies from wishlist through offer — deadlines and WhatsApp alerts work when configured in Settings.',
      [{ type: 'navigate', label: 'Add Application', path: '/applications' }],
    )
  }
  const byStatus = new Map<string, number>()
  for (const a of apps) byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1)
  const lines = [...byStatus.entries()].map(([s, n]) => `• ${s}: ${n}`)
  const recent = apps.slice(0, 3).map(a => `• ${a.company} — ${a.role} (${a.status})`)
  const soon = apps
    .filter(a => a.deadline && !['Rejected', 'Selected'].includes(a.status))
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0]
  let extra = ''
  if (soon?.deadline) {
    const days = Math.ceil((new Date(soon.deadline).getTime() - Date.now()) / 86400000)
    extra = `\n\nNext deadline: **${soon.company}** (${soon.role}) in **${days}d**.`
  }
  return assistant(
    `**${apps.length} applications** in pipeline:\n${lines.join('\n')}\n\nRecent:\n${recent.join('\n')}${extra}`,
    [
      { type: 'navigate', label: 'Open Pipeline', path: '/applications' },
      { type: 'prompt', label: "Today's plan", message: 'What should I do today?' },
    ],
  )
}

function buildApplicationsHowTo(): ChatMessage {
  return assistant(
    `**Application Pipeline** works like this:\n\n` +
    `1. **Wishlist** — companies you want to apply to\n` +
    `2. **Applied** — submitted applications\n` +
    `3. **OA / Interview** — rounds in progress\n` +
    `4. **Offer / Rejected** — final outcomes\n\n` +
    `Add entries from **Pipeline** → syncs to MongoDB when cloud is on. Set deadlines for alerts.`,
    [
      { type: 'navigate', label: 'Open Pipeline', path: '/applications' },
      { type: 'navigate', label: 'Settings', path: '/settings' },
    ],
  )
}

function buildResourcesSummary(ctx: ChatContext): ChatMessage {
  const plan = recommendResourcePlan({
    assessment: ctx.assessment,
    domain: ctx.user?.domain || 'Software Engineering',
    level: ctx.user?.level ?? 'intermediate',
    weeklyHours: ctx.user?.weeklyHours,
    targetCompanies: ctx.user?.targetCompanies,
  })
  const top = plan.topPicks.slice(0, 4)
  if (top.length === 0) {
    return assistant('Complete assessment modules to unlock personalized resource recommendations.', [
      { type: 'navigate', label: 'Career Health', path: '/health' },
    ])
  }
  return assistant(
    `Top resources for **${ctx.user?.domain || 'your domain'}**:\n${top.map((r, i) => `${i + 1}. **${r.title}** — ${r.why ?? r.tag}`).join('\n')}`,
    [{ type: 'navigate', label: 'All Resources', path: '/resources' }],
  )
}

function buildCompanyHelp(ctx: ChatContext): ChatMessage {
  const domain = ctx.user?.domain || 'Software Engineering'
  const compatible = getCompatibleCompanies(domain)
  const selected = ctx.user?.targetCompanies ?? []
  const invalid = selected.filter(c => !companyOffersDomain(c, domain))
  let text = `For **${domain}**, campus-compatible companies include:\n${compatible.slice(0, 10).join(', ')}.`
  if (selected.length) {
    text += `\n\n**Your picks:** ${selected.join(', ')}.`
    if (invalid.length) text += `\n\n⚠ **${invalid.join(', ')}** may not hire ${domain} on campus — update in Settings.`
  } else {
    text += '\n\nSet target companies in Settings or re-run onboarding.'
  }
  return assistant(text, [
    { type: 'navigate', label: 'Settings', path: '/settings' },
    { type: 'navigate', label: 'Resources', path: '/resources' },
  ])
}

function buildMomentumSummary(ctx: ChatContext): ChatMessage {
  const { consistencyScore, streak } = computeConsistency(ctx.activityLog)
  const totalTasks = ctx.activityLog.reduce((s, d) => s + d.tasksCompleted, 0)
  const totalHours = ctx.activityLog.reduce((s, d) => s + d.hoursSpent, 0)
  return assistant(
    [
      `**Streak:** ${streak} day${streak === 1 ? '' : 's'}`,
      `**Consistency:** ${consistencyScore}%`,
      `**Total tasks logged:** ${totalTasks}`,
      `**Hours logged:** ${totalHours.toFixed(1)}h`,
      streak === 0 ? 'Complete one planner task today to start a streak.' : 'Keep it up — momentum feeds readiness confidence.',
    ].join('\n'),
    [
      { type: 'navigate', label: 'Momentum Center', path: '/momentum' },
      { type: 'navigate', label: 'Daily Planner', path: '/planner' },
    ],
  )
}

function buildNextAssessment(ctx: ChatContext): ChatMessage {
  const top = getTopPriority(ctx.user, ctx.assessment, ctx.platformData)
  if (top) {
    return assistant(
      `**Next up: ${top.title}**\n${top.reason}\nPotential impact: **+${top.potentialImpact}** readiness points.`,
      [{ type: 'navigate', label: 'Open Module', path: `/health?module=${top.moduleId}` }],
    )
  }
  return assistant('Core assessments look complete. Focus on daily planner execution and applications.', [
    { type: 'navigate', label: 'Planner', path: '/planner' },
    { type: 'navigate', label: 'Applications', path: '/applications' },
  ])
}

function buildHelp(ctx: ChatContext): ChatMessage {
  const caps = ctx.loggedIn
    ? [
        '"What should I do today?" — personalized tasks',
        '"Show my skill gaps" — ranked weak areas',
        '"What is my readiness score?" — odds & confidence',
        '"How many applications?" — pipeline summary',
        '"Open planner" / "applications" — navigate anywhere',
        '"What companies fit my domain?" — campus compatibility',
      ]
    : [
        '"What is PrepUp?" — platform overview',
        '"How do I get started?" — sign up steps',
        '"What modules are available?" — live tools list',
        '"How does onboarding work?" — domain & companies',
      ]
  return assistant(
    `I'm your **PrepUp assistant** — ask in plain English about features, your plan, gaps, readiness, or applications.\n\n**Examples:**\n${caps.map(c => `• ${c}`).join('\n')}`,
    ctx.loggedIn
      ? [
          { type: 'prompt', label: "Today's plan", message: 'What should I do today?' },
          { type: 'prompt', label: 'My gaps', message: 'Show my skill gaps' },
          { type: 'prompt', label: 'Readiness', message: 'What is my readiness score?' },
        ]
      : [
          { type: 'prompt', label: 'Get started', message: 'How do I get started?' },
          { type: 'prompt', label: 'Modules', message: 'What modules are available?' },
        ],
  )
}

export function buildWelcomeMessage(ctx: ChatContext): ChatMessage {
  if (!ctx.loggedIn) {
    return assistant(
      'Hi! I\'m the **PrepUp assistant**. Ask me about the platform, modules, or how to get started — each question gets a specific answer.',
      [
        { type: 'prompt', label: 'What is PrepUp?', message: 'What is PrepUp?' },
        { type: 'prompt', label: 'Get started', message: 'How do I get started?' },
      ],
    )
  }
  const name = ctx.user?.name?.split(' ')[0] || 'there'
  const top = getTopPriority(ctx.user, ctx.assessment, ctx.platformData)
  const conf = computeReadinessConfidence(ctx.assessment, ctx.platformData)
  const score = conf.measuredSections > 0 && ctx.assessment ? computeOverall(ctx.assessment) : null

  let intro = `Hi **${name}**! I know your profile, scores, and pipeline.`
  if (score !== null) intro += ` Readiness: **${score}%**.`
  if (top) intro += ` Suggested next: **${top.title}**.`
  else if (conf.measuredSections === 0) intro += ' Start with Career Health assessments.'

  return assistant(intro + '\n\nAsk me in your own words — features, your plan, gaps, applications, companies, and more.', [
    { type: 'prompt', label: "Today's plan", message: 'What should I do today?' },
    { type: 'prompt', label: 'My gaps', message: 'Show my skill gaps' },
    { type: 'prompt', label: 'Applications', message: 'How many applications do I have?' },
  ])
}

function buildGuestPlatformOverview(): ChatMessage {
  return assistant(
    '**PrepUp** is a placement intelligence platform:\n\n' +
    '• **Career Health** — resume, LeetCode, GitHub, aptitude, communication, mock interview\n' +
    '• **Daily Planner** — tasks matched to your domain and target companies\n' +
    '• **Application Pipeline** — track wishlist → offer\n' +
    '• **Resources & Readiness** — gap-based learning and scores\n' +
    '• **WhatsApp digests** — optional alerts in Settings\n\n' +
    'Sign up free, complete onboarding, then run assessments.',
    [{ type: 'prompt', label: 'How to start', message: 'How do I get started?' }],
  )
}

function normalizeQuestion(msg: string): string {
  return msg.toLowerCase().replace(/[^\w\s?]/g, ' ').replace(/\s+/g, ' ').trim()
}

function buildFeaturesOverview(ctx: ChatContext): ChatMessage {
  const live = CAREER_MODULES.filter(m => m.status === 'live')
  const groups = new Map<string, string[]>()
  for (const m of live) {
    const list = groups.get(m.category) ?? []
    list.push(`**${m.title}** — ${m.description}`)
    groups.set(m.category, list)
  }
  const body = [...groups.entries()]
    .map(([cat, items]) => `**${cat}**\n${items.slice(0, 4).map(i => `• ${i}`).join('\n')}`)
    .join('\n\n')

  const intro = ctx.loggedIn
    ? 'Here’s what PrepUp offers — personalized to your profile when you’re signed in:'
    : 'PrepUp is a placement intelligence platform. Here’s what you can use today:'

  return assistant(
    `${intro}\n\n${body}\n\n` +
    '**Core flow:** assess your skills → see gaps & readiness → follow a daily plan → track applications → get resources for weak areas.',
    ctx.loggedIn
      ? [
          { type: 'navigate', label: 'Dashboard', path: '/' },
          { type: 'prompt', label: 'My plan today', message: 'What should I do today?' },
          { type: 'navigate', label: 'Career Health', path: '/health' },
        ]
      : [
          { type: 'prompt', label: 'Get started', message: 'How do I get started?' },
          { type: 'prompt', label: 'Features', message: 'What are the features?' },
        ],
  )
}

function buildGuestGettingStarted(): ChatMessage {
  return assistant(
    '**Getting started with PrepUp:**\n\n' +
    '1. Click **Get Started** on the homepage and register with your email\n' +
    '2. Complete **onboarding** — choose your domain (SWE, Cyber, etc.), role, and target companies\n' +
    '3. Open **Career Health** and run assessments (resume, coding, aptitude, communication)\n' +
    '4. Check your **Dashboard** for readiness score, gaps, and today’s priority\n' +
    '5. Add companies to your **Application Pipeline** as you apply\n\n' +
    'Once signed in, your progress saves to your account automatically.',
    [
      { type: 'prompt', label: 'What features?', message: 'What are the features?' },
      { type: 'prompt', label: 'Onboarding', message: 'How does onboarding work?' },
    ],
  )
}

function buildSyncHelp(): ChatMessage {
  return assistant(
    'Your data is tied to your account when you’re signed in.\n\n' +
    '• Complete onboarding and assessments — they sync to your profile\n' +
    '• If data does not appear on another device, sign out and sign in again to refresh your session\n' +
    '• Add your phone in **Settings** for WhatsApp reminders\n\n' +
    'Everything you do in PrepUp (applications, scores, activity) stays on your account.',
    [{ type: 'navigate', label: 'Settings', path: '/settings' }],
  )
}

/** Loose keyword match for natural phrasing the regex intents miss */
function scoreByKeywords(msg: string): { id: string; score: number }[] {
  const n = normalizeQuestion(msg)
  const rules: { id: string; words: string[]; weight: number }[] = [
    { id: 'features', words: ['feature', 'features', 'offer', 'provide', 'capability', 'what can', 'what does', 'functionality', 'include'], weight: 1 },
    { id: 'get-started', words: ['get started', 'begin', 'start', 'sign up', 'register', 'first time', 'new user'], weight: 1 },
    { id: 'today', words: ['today', 'daily', 'focus', 'should i do', 'plan for'], weight: 1 },
    { id: 'gaps', words: ['gap', 'gaps', 'weak', 'improve', 'blocker', 'lowest'], weight: 1 },
    { id: 'readiness', words: ['readiness', 'ready', 'score', 'odds', 'probability'], weight: 1 },
    { id: 'apps-count', words: ['application', 'pipeline', 'applied', 'interview stage'], weight: 0.9 },
    { id: 'apps-how', words: ['how application', 'how pipeline', 'how tracker'], weight: 1 },
    { id: 'companies', words: ['company', 'companies', 'target', 'campus', 'hire'], weight: 0.85 },
    { id: 'resources', words: ['resource', 'learn', 'study', 'course', 'material'], weight: 1 },
    { id: 'momentum', words: ['streak', 'momentum', 'consistency', 'activity'], weight: 1 },
    { id: 'resume', words: ['resume', 'cv', 'ats'], weight: 1 },
    { id: 'coding', words: ['leetcode', 'coding', 'dsa', 'algorithm', 'hackerrank'], weight: 1 },
    { id: 'github', words: ['github', 'repo', 'portfolio', 'project'], weight: 0.9 },
    { id: 'aptitude', words: ['aptitude', 'quant', 'reasoning'], weight: 1 },
    { id: 'communication', words: ['communication', 'speak', 'voice', 'english'], weight: 1 },
    { id: 'interview', words: ['mock interview', 'interview prep', 'interview'], weight: 0.85 },
    { id: 'onboarding', words: ['onboard', 'onboarding', 'domain', 'setup'], weight: 0.9 },
    { id: 'prepup-about', words: ['prepup', 'prep up', 'what is', 'about', 'platform'], weight: 0.8 },
    { id: 'modules', words: ['module', 'modules', 'tool', 'tools'], weight: 0.85 },
    { id: 'whatsapp', words: ['whatsapp', 'digest', 'alert', 'notification'], weight: 0.9 },
    { id: 'help', words: ['help', 'assist', 'support'], weight: 0.7 },
  ]
  const scores: { id: string; score: number }[] = []
  for (const rule of rules) {
    let s = 0
    for (const w of rule.words) {
      if (n.includes(w)) s += w.length * rule.weight
    }
    if (s > 0) scores.push({ id: rule.id, score: s })
  }
  return scores.sort((a, b) => b.score - a.score)
}

function replyByIntentId(id: string, msg: string, ctx: ChatContext): ChatMessage | null {
  const map: Record<string, (m: string, c: ChatContext) => ChatMessage> = {
    features: () => buildFeaturesOverview(ctx),
    'get-started': () => buildGuestGettingStarted(),
    today: (_m, c) => buildTodayPlan(c),
    gaps: (_m, c) => buildGapsSummary(c),
    readiness: (_m, c) => buildReadinessSummary(c),
    'apps-count': (_m, c) => buildApplicationsSummary(c),
    'apps-how': () => buildApplicationsHowTo(),
    companies: (_m, c) => buildCompanyHelp(c),
    resources: (_m, c) => buildResourcesSummary(c),
    momentum: (_m, c) => buildMomentumSummary(c),
    resume: (_m, c) => INTENTS.find(i => i.id === 'resume')!.reply(msg, c),
    coding: (_m, c) => INTENTS.find(i => i.id === 'coding')!.reply(msg, c),
    github: (_m, c) => INTENTS.find(i => i.id === 'github')!.reply(msg, c),
    aptitude: (_m, c) => INTENTS.find(i => i.id === 'aptitude')!.reply(msg, c),
    communication: (_m, c) => INTENTS.find(i => i.id === 'communication')!.reply(msg, c),
    interview: (_m, c) => INTENTS.find(i => i.id === 'interview')!.reply(msg, c),
    onboarding: () => buildGuestOnboarding(),
    'prepup-about': () => buildGuestPlatformOverview(),
    modules: (m) => INTENTS.find(i => i.id === 'modules')!.reply(m, ctx),
    whatsapp: (_m, c) => INTENTS.find(i => i.id === 'whatsapp')!.reply(msg, c),
    help: (_m, c) => buildHelp(c),
    sync: () => buildSyncHelp(),
  }
  const fn = map[id]
  return fn ? fn(msg, ctx) : null
}

function buildGuestOnboarding(): ChatMessage {
  return assistant(
    '**Onboarding** sets your placement track:\n\n' +
    '• **Domain** — Software Engineering, Cybersecurity, Data, etc.\n' +
    '• **Target role** — e.g. SDE, Security Analyst\n' +
    '• **Companies** — PrepUp filters incompatible campus hirers\n' +
    '• **Weekly hours** — adjusts plan intensity\n\n' +
    'You can update domain and companies later in Settings.',
    [{ type: 'navigate', label: 'Settings', path: '/settings' }],
  )
}

function buildNavigateReply(msg: string): ChatMessage | null {
  const route = matchRoute(msg)
  if (!route) return null
  const wantsNav = /\b(open|go to|take me|navigate|show me|launch)\b/i.test(msg)
  if (!wantsNav && !/^(planner|applications|resources|dashboard|health|settings)$/i.test(msg.trim())) {
    return null
  }
  return assistant(`Opening **${route.label.replace('Open ', '')}** — ${route.hint}`, [
    { type: 'navigate', label: route.label, path: route.path },
  ])
}

const INTENTS: IntentHandler[] = [
  {
    id: 'greet',
    score: (m) => (/^(hi|hello|hey|yo|good\s+(morning|evening|afternoon))\b/i.test(m.trim()) ? 100 : 0),
    reply: (_m, ctx) => {
      const name = ctx.user?.name?.split(' ')[0]
      return assistant(
        name
          ? `Hello **${name}**! Ask about your plan, gaps, readiness, applications, or say "open planner".`
          : 'Hello! Ask about PrepUp, getting started, or available modules.',
        getChatStarters(ctx.loggedIn).slice(0, 3).map(s => ({ type: 'prompt', label: s.replace(/\?.*$/, '').slice(0, 22), message: s })),
      )
    },
  },
  {
    id: 'features',
    score: (m) => {
      if (/\bfeatures?\b/i.test(m)) return 96
      if (/\bwhat\b.*\b(do|offer|include|have)\b/i.test(m) && /\b(prepup|prep up|platform|you|it)\b/i.test(m)) return 92
      if (/\b(capabilit|functionality|what can you do)\b/i.test(m)) return 90
      return 0
    },
    reply: (_m, ctx) => buildFeaturesOverview(ctx),
  },
  {
    id: 'help',
    score: (m) => (/\b(help|what can you|commands|capabilities)\b/i.test(m) ? 90 : 0),
    reply: (_m, ctx) => buildHelp(ctx),
  },
  {
    id: 'today',
    score: (m) => {
      if (/\b(what should i do|today'?s?\s+(plan|focus|task)|daily plan|my plan for today)\b/i.test(m)) return 95
      if (/\bwhat.*do.*today\b/i.test(m)) return 90
      return 0
    },
    reply: (_m, ctx) => buildTodayPlan(ctx),
  },
  {
    id: 'gaps',
    score: (m) => {
      if (/\b(skill\s+)?gaps?\b/i.test(m)) return 95
      if (/\b(weak|weakest|blocker|improve|lowest\s+score)\b/i.test(m)) return 85
      return 0
    },
    reply: (_m, ctx) => buildGapsSummary(ctx),
  },
  {
    id: 'readiness',
    score: (m) => {
      if (/\b(readiness|how ready|placement odds|probability|my score)\b/i.test(m)) return 95
      if (/\bhow.*ready.*am i\b/i.test(m)) return 90
      return 0
    },
    reply: (_m, ctx) => buildReadinessSummary(ctx),
  },
  {
    id: 'apps-count',
    score: (m) => {
      if (/\b(how many|count|number of).*\bapplication/i.test(m)) return 95
      if (/\bmy\s+(applications|pipeline)\b/i.test(m) && !/\bhow\b/i.test(m)) return 85
      if (/\bapplication.*\b(status|pipeline|deadline)\b/i.test(m)) return 80
      return 0
    },
    reply: (_m, ctx) => buildApplicationsSummary(ctx),
  },
  {
    id: 'apps-how',
    score: (m) => (/\bhow.*\b(application|pipeline|tracker)\b/i.test(m) || /\bapplication.*\bwork\b/i.test(m) ? 92 : 0),
    reply: () => buildApplicationsHowTo(),
  },
  {
    id: 'companies',
    score: (m) => {
      if (/\b(what companies|which companies|companies fit|compatible companies|target companies)\b/i.test(m)) return 95
      if (/\b(company|companies|infosys|tcs|wipro|amazon|google)\b/i.test(m) && /\b(domain|campus|hire|target|fit)\b/i.test(m)) return 85
      return /\b(company|companies)\b/i.test(m) ? 60 : 0
    },
    reply: (_m, ctx) => buildCompanyHelp(ctx),
  },
  {
    id: 'resources',
    score: (m) => (/\b(resource|learn|study|course|where.*learn)\b/i.test(m) ? 88 : 0),
    reply: (_m, ctx) => buildResourcesSummary(ctx),
  },
  {
    id: 'momentum',
    score: (m) => (/\b(streak|momentum|consistency|heatmap|activity)\b/i.test(m) ? 90 : 0),
    reply: (_m, ctx) => buildMomentumSummary(ctx),
  },
  {
    id: 'profile',
    score: (m) => (/\b(my profile|who am i|my domain|my role|about me)\b/i.test(m) ? 90 : 0),
    reply: (_m, ctx) => assistant(buildProfileSummary(ctx), [{ type: 'navigate', label: 'Settings', path: '/settings' }]),
  },
  {
    id: 'failures',
    score: (m) => (/\b(failure|rejection|rejected|reject)\b/i.test(m) ? 88 : 0),
    reply: (_m, ctx) => {
      const n = ctx.failures.length
      return assistant(
        n > 0
          ? `You logged **${n}** rejection${n === 1 ? '' : 's'}. Failure Intel finds patterns (DSA, communication, aptitude) and suggests fixes.`
          : 'Log rejections in Failure Intel — I\'ll map patterns to targeted resources.',
        [{ type: 'navigate', label: 'Failure Intel', path: '/failures' }],
      )
    },
  },
  {
    id: 'whatsapp',
    score: (m) => (/\b(whatsapp|digest|sms|text alert)\b/i.test(m) ? 90 : 0),
    reply: () => assistant(
      '**WhatsApp alerts:**\n1. Add phone (+91…) in Settings\n2. Join Twilio sandbox if prompted\n3. Enable daily digest / application alerts\n4. Use **Test** buttons in Settings',
      [{ type: 'navigate', label: 'Settings', path: '/settings' }],
    ),
  },
  {
    id: 'sync',
    score: (m) => (/\b(cloud sync|sync|not saving|save my data|account data|lost data)\b/i.test(m) ? 92 : 0),
    reply: () => buildSyncHelp(),
  },
  {
    id: 'resume',
    score: (m) => (/\b(resume|cv|ats)\b/i.test(m) ? 90 : 0),
    reply: (_m, ctx) => {
      const mod = ASSESSMENT_MODULES.find(m => m.id === 'resume')
      return assistant(
        `**${mod?.title}** — ${mod?.subtitle}\nYour resume score: **${ctx.assessment?.resume ?? 'not assessed'}%**.`,
        [{ type: 'navigate', label: 'Resume Module', path: '/health?module=resume' }],
      )
    },
  },
  {
    id: 'coding',
    score: (m) => (/\b(leetcode|coding|dsa|data structure|algorithm|hackerrank|codechef)\b/i.test(m) ? 90 : 0),
    reply: (_m, ctx) => {
      const lc = ctx.platformData?.leetcode
      const detail = lc
        ? `LeetCode **@${lc.username}**: ${lc.totalSolved} solved (${lc.mediumSolved} medium, ${lc.hardSolved} hard).`
        : 'Connect LeetCode in Career Health for evidence-based scoring.'
      return assistant(`DSA score: **${ctx.assessment?.dsa ?? '—'}%**.\n${detail}`, [
        { type: 'navigate', label: 'Coding Module', path: '/health?module=coding' },
      ])
    },
  },
  {
    id: 'github',
    score: (m) => (/\b(github|git hub|repos?|portfolio)\b/i.test(m) ? 88 : 0),
    reply: (_m, ctx) => {
      const gh = ctx.platformData?.github
      const detail = gh
        ? `GitHub **@${gh.username}**: ${gh.publicRepos} repos, ${gh.totalStars} stars, ${gh.recentCommitDays} active days (30d).`
        : 'Connect GitHub in the GitHub Intelligence module under Career Health.'
      return assistant(`Projects score: **${ctx.assessment?.projects ?? '—'}%**.\n${detail}`, [
        { type: 'navigate', label: 'GitHub Module', path: '/health?module=github' },
      ])
    },
  },
  {
    id: 'aptitude',
    score: (m) => (/\b(aptitude|quant|reasoning|oa prep)\b/i.test(m) ? 90 : 0),
    reply: (_m, ctx) => assistant(
      `Aptitude score: **${ctx.assessment?.aptitude ?? '—'}%**. Complete the aptitude module for OA-style prep.`,
      [{ type: 'navigate', label: 'Aptitude Module', path: '/health?module=aptitude' }],
    ),
  },
  {
    id: 'communication',
    score: (m) => (/\b(communication|speak|voice|english|hr round)\b/i.test(m) ? 90 : 0),
    reply: (_m, ctx) => assistant(
      `Communication score: **${ctx.assessment?.communication ?? '—'}%**. Use the voice assessment in Career Health.`,
      [{ type: 'navigate', label: 'Communication', path: '/health?module=communication' }],
    ),
  },
  {
    id: 'interview',
    score: (m) => (/\b(mock interview|technical interview|interview prep|interview module)\b/i.test(m) ? 90 : 0),
    reply: () => assistant(
      'Mock interviews are in **Career Health → Interview Intelligence**. Scores feed your overall readiness.',
      [{ type: 'navigate', label: 'Interview Module', path: '/health?module=interview' }],
    ),
  },
  {
    id: 'next-assessment',
    score: (m) => (/\b(next assessment|what.*complete|pending module|career health|assessment next)\b/i.test(m) ? 88 : 0),
    reply: (_m, ctx) => buildNextAssessment(ctx),
  },
  {
    id: 'modules',
    score: (m) => {
      if (/\bfeatures?\b/i.test(m)) return 0
      if (/\bwhat modules\b/i.test(m)) return 95
      if (/\b(module|tool)\b/i.test(m) && /\b(available|list|what|which)\b/i.test(m)) return 90
      return /\b(module|tool)s?\b/i.test(m) ? 50 : 0
    },
    reply: (m) => {
      const filter = /\b(ai|plan|application|analytics)\b/i.exec(m)
      return assistant(
        filter ? `Matching modules:\n${moduleListText(filter)}` : `**Live modules:**\n${moduleListText()}`,
        [{ type: 'navigate', label: 'Workspace', path: '/workspace' }],
      )
    },
  },
  {
    id: 'prepup-about',
    score: (m) => (/\b(prepup|prep up|what is this|about the platform|what does prepup)\b/i.test(m) ? 85 : 0),
    reply: () => buildGuestPlatformOverview(),
  },
  {
    id: 'get-started',
    score: (m) => (/\b(get started|sign up|register|create account|how to start)\b/i.test(m) ? 88 : 0),
    reply: () => buildGuestGettingStarted(),
  },
  {
    id: 'onboarding',
    score: (m) => (/\b(onboard|onboarding|setup profile|pick domain)\b/i.test(m) ? 88 : 0),
    reply: () => buildGuestOnboarding(),
  },
  {
    id: 'navigate',
    score: (m) => (buildNavigateReply(m) ? 75 : 0),
    reply: (m) => buildNavigateReply(m) ?? assistant('Where would you like to go? Try "open planner" or "applications".'),
  },
]

const PERSONALIZED_INTENTS = new Set([
  'today', 'gaps', 'readiness', 'apps-count', 'companies', 'resources',
  'momentum', 'profile', 'failures', 'next-assessment',
])

function applyGuestGate(intentId: string, ctx: ChatContext, reply: ChatMessage): ChatMessage {
  if (ctx.loggedIn || !PERSONALIZED_INTENTS.has(intentId)) return reply
  return assistant(
    'Sign in to get answers about **your** readiness, gaps, and daily plan.\n\nHere’s what I can explain without an account:',
    [
      { type: 'prompt', label: 'Features', message: 'What are the features?' },
      { type: 'prompt', label: 'Get started', message: 'How do I get started?' },
      { type: 'prompt', label: 'What is PrepUp?', message: 'What is PrepUp?' },
    ],
  )
}

export function processChatMessage(raw: string, ctx: ChatContext): ChatMessage {
  const msg = raw.trim()
  if (!msg) return assistant('Ask me anything — features, getting started, your daily plan, gaps, applications, and more.')

  let best: { handler: IntentHandler; score: number } | null = null
  for (const handler of INTENTS) {
    const score = handler.score(msg, ctx)
    if (score > 0 && (!best || score > best.score)) {
      best = { handler, score }
    }
  }

  if (best && best.score >= 48) {
    return applyGuestGate(best.handler.id, ctx, best.handler.reply(msg, ctx))
  }

  const kwHits = scoreByKeywords(msg)
  if (kwHits.length > 0 && kwHits[0].score >= 10) {
    const kwReply = replyByIntentId(kwHits[0].id, msg, ctx)
    if (kwReply) return applyGuestGate(kwHits[0].id, ctx, kwReply)
  }

  const route = matchRoute(msg)
  if (route) {
    return assistant(route.hint, [{ type: 'navigate', label: route.label, path: route.path }])
  }

  if (/\b(thanks|thank you|ok|okay|cool|great)\b/i.test(msg)) {
    return assistant('You’re welcome! Ask anytime — I’m here to help with placement prep.')
  }

  return assistant(
    ctx.loggedIn
      ? 'I can help with your **daily plan**, **skill gaps**, **readiness**, **applications**, **companies**, **resources**, or **interviews**. What would you like to explore?'
      : 'I can walk you through **features**, **getting started**, **onboarding**, and how PrepUp helps with placement prep. What would you like to know?',
    getChatStarters(ctx.loggedIn).slice(0, 4).map(s => ({
      type: 'prompt' as const,
      label: s.replace(/\?.*$/, '').slice(0, 22),
      message: s,
    })),
  )
}

/** Rule-based first; falls back to Gemini / ML coach when intent is unclear. */
export async function processChatMessageWithAI(raw: string, ctx: ChatContext): Promise<ChatMessage> {
  const msg = raw.trim()
  let bestScore = 0
  for (const handler of INTENTS) {
    bestScore = Math.max(bestScore, handler.score(msg, ctx))
  }
  const kwHits = scoreByKeywords(msg)
  const kwScore = kwHits[0]?.score ?? 0

  if (bestScore >= 48 || kwScore >= 10 || matchRoute(msg)) {
    return processChatMessage(raw, ctx)
  }

  try {
    const { backendAPI } = await import('../services/api')
    const res = await backendAPI.aiChat(msg, {
      user: ctx.user,
      assessment: ctx.assessment,
      applications: ctx.applications,
      failures: ctx.failures,
      activityLog: ctx.activityLog,
      platformData: ctx.platformData,
    })
    const tag = res.source === 'gemini' ? '\n\n_Gemini AI · PrepUp Coach_' : '\n\n_ML/NLP · PrepUp Coach_'
    return assistant(res.text + tag, getChatStarters(ctx.loggedIn).slice(0, 3).map(s => ({
      type: 'prompt' as const,
      label: s.replace(/\?.*$/, '').slice(0, 22),
      message: s,
    })))
  } catch {
    return processChatMessage(raw, ctx)
  }
}

export function createUserMessage(text: string): ChatMessage {
  return { id: id(), role: 'user', text, timestamp: Date.now() }
}
