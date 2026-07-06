/* eslint-disable @typescript-eslint/no-explicit-any */

type Profile = Record<string, any>

function scoreLine(scores: Record<string, number>, key: string, label: string): string {
  const val = scores[key]
  if (val == null) return ''
  return `• ${label}: ${val}%`
}

function pickResources(gaps: { key?: string; label?: string }[], limit = 2) {
  const map: Record<string, { title: string; url: string }> = {
    dsa: { title: 'LeetCode Problem Set', url: 'https://leetcode.com/problemset/' },
    projects: { title: 'GitHub — ship a commit today', url: 'https://github.com/' },
    resume: { title: 'Jobscan ATS check', url: 'https://www.jobscan.co/' },
    aptitude: { title: 'IndiaBix Aptitude', url: 'https://www.indiabix.com/aptitude/' },
    communication: { title: 'PrepUp Communication module', url: 'http://localhost:5173/health?module=communication' },
    interview: { title: 'Mock Interview module', url: 'http://localhost:5173/health?module=interview' },
  }
  return gaps.slice(0, limit).map(g => map[g.key ?? ''] ?? { title: 'PrepUp Daily Planner', url: 'http://localhost:5173/planner' })
}

export function buildStatusMessage(profile: Profile): string {
  const name = profile.name ?? 'there'
  const domain = profile.domain ?? 'Software Engineering'
  const scores = profile.scores ?? {}
  const gaps = profile.gaps ?? []
  const assessed = profile.assessed
  const streak = profile.streak
  const overall = profile.overall_readiness

  const lines = [`📊 *PrepUp Status — ${name}*`, `Role track: ${domain}`]

  if (!assessed) {
    lines.push('\n⚠️ Assessment not complete yet.')
    lines.push('Open PrepUp → Career Health to unlock your readiness score.')
    return lines.join('\n')
  }

  if (overall != null) lines.push(`\n🎯 Overall readiness: *${overall}%*`)

  const scoreBits = [
    scoreLine(scores, 'dsa', 'DSA'),
    scoreLine(scores, 'projects', 'Projects'),
    scoreLine(scores, 'resume', 'Resume'),
    scoreLine(scores, 'aptitude', 'Aptitude'),
    scoreLine(scores, 'communication', 'Communication'),
  ].filter(Boolean)
  if (scoreBits.length) lines.push('\n' + scoreBits.join('\n'))

  if (gaps.length) {
    const top = gaps[0]
    lines.push(`\n🔴 Biggest gap: *${top.label ?? '?'}* (${top.current ?? 0}% → target ${top.target ?? 0}%)`)
  }
  if (streak) lines.push(`\n🔥 Streak: ${streak} day${streak !== 1 ? 's' : ''}`)

  lines.push('\nReply *HELP* for commands')
  return lines.join('\n')
}

export function buildDailyDigest(profile: Profile): string {
  const first = String(profile.name ?? 'there').split(' ')[0]
  const status = buildStatusMessage(profile)
  const resources = pickResources(profile.gaps ?? [], 2)

  const lines = [`☀️ *Good morning, ${first}!*`, '', status]

  const challengeLine = profile.daily_challenge as { title?: string; url?: string; difficulty?: string } | undefined
  if (challengeLine?.title && challengeLine?.url) {
    lines.splice(2, 0, '', `🎯 *Today's LeetCode:* ${challengeLine.title} (${challengeLine.difficulty ?? 'Medium'})`, challengeLine.url)
  } else {
    lines.splice(2, 0, '', '🎯 *Today:* Open Daily Planner for your LeetCode challenge.')
  }

  if (resources.length) {
    lines.push('\n💡 *Today\'s resource picks:*')
    resources.forEach((r, i) => lines.push(`${i + 1}. ${r.title} — ${r.url}`))
  }

  const soon = (profile.applications ?? []).filter(
    (a: { days_to_deadline?: number }) => a.days_to_deadline != null && a.days_to_deadline >= 0 && a.days_to_deadline <= 3,
  )
  if (soon.length) {
    lines.push('\n📅 *Deadlines coming up:*')
    soon.slice(0, 3).forEach((a: { company?: string; days_to_deadline?: number; status?: string }) => {
      lines.push(`• ${a.company} — ${a.days_to_deadline}d (${a.status})`)
    })
  }

  const inactive = profile.days_inactive
  if (inactive && inactive >= 2) {
    lines.push(`\n⚠️ Inactive ${inactive} days — open Daily Planner to protect your streak.`)
  }

  lines.push('\nOpen PrepUp → Daily Planner for today\'s focus tasks.')
  return lines.join('\n').slice(0, 1600)
}

export function buildWeeklyReport(profile: Profile): string {
  const first = String(profile.name ?? 'there').split(' ')[0]
  const domain = profile.domain ?? 'Software Engineering'
  const overall = profile.overall_readiness
  const gaps = profile.gaps ?? []
  const weekly = profile.weekly_stats ?? {}
  const apps = profile.applications ?? []

  const lines = [
    `📈 *Weekly Report — ${first}*`,
    `Week ending ${weekly.week_label ?? 'today'} · ${domain}`,
    '',
  ]

  if (overall != null) {
    const delta = weekly.readiness_delta
    const trend = delta != null && delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta}% vs last week)` : ''
    lines.push(`🎯 Readiness: *${overall}%*${trend}`)
  } else {
    lines.push('⚠️ Complete assessment for a readiness score.')
  }

  lines.push(`⏱ Prep this week: *${weekly.hours_this_week ?? 0}* hrs · *${weekly.tasks_this_week ?? 0}* tasks`)
  if (profile.streak) lines.push(`🔥 Current streak: ${profile.streak} days`)
  lines.push(`\n📋 Pipeline: ${weekly.active_applications ?? 0} active · ${weekly.offers ?? 0} offers`)

  if (gaps.length) {
    const top = gaps[0]
    lines.push(`🔴 Focus next week: *${top.label}* (gap ${top.gap ?? 0} pts)`)
  }

  const resources = pickResources(gaps, 2)
  if (resources.length) {
    lines.push('\n💡 *Resources for your weakness:*')
    resources.forEach((r, i) => lines.push(`${i + 1}. ${r.title} — ${r.url}`))
  }

  const soon = apps.filter(
    (a: { days_to_deadline?: number }) => a.days_to_deadline != null && a.days_to_deadline >= 0 && a.days_to_deadline <= 7,
  )
  if (soon.length) {
    lines.push('\n📅 *Deadlines next 7 days:*')
    soon.slice(0, 4).forEach((a: { company?: string; role?: string; days_to_deadline?: number }) => {
      lines.push(`• ${a.company} (${a.role ?? ''}) — ${a.days_to_deadline}d`)
    })
  }

  return lines.join('\n').slice(0, 1600)
}

export function buildApplicationAlert(app: Profile): string {
  const company = app.company ?? 'Company'
  const role = app.role ?? ''
  const status = app.status ?? 'Wishlist'
  const deadline = app.deadline ?? ''
  const days = app.days_to_deadline

  const lines = [
    '📅 *New application tracked!*',
    '',
    `🏢 *${company}*`,
    `Role: ${role || '—'}`,
    `Status: ${status}`,
  ]

  if (deadline) {
    if (days != null) {
      const when = days >= 0 ? `in ${days} day${days !== 1 ? 's' : ''}` : 'passed'
      lines.push(`Deadline: ${deadline} (${when})`)
    } else {
      lines.push(`Deadline: ${deadline}`)
    }
  }

  lines.push('\nOpen PrepUp → Application Pipeline')
  return lines.join('\n')
}
