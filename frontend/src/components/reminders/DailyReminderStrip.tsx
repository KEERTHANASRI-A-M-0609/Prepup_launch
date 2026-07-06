import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Flame, Trophy, Code2 } from 'lucide-react'
import {
  getDailyChallenge,
  challengeUrl,
  getUpcomingContests,
  buildStreakMessage,
} from '../../engine/dailyReminderEngine'
import type { ActivityLog } from '../../types'

export default function DailyReminderStrip({
  userKey,
  activityLog,
  compact = false,
}: {
  userKey: string
  activityLog: ActivityLog[]
  compact?: boolean
}) {
  const navigate = useNavigate()
  const challenge = useMemo(() => getDailyChallenge(userKey), [userKey])
  const url = challengeUrl(challenge)
  const contests = useMemo(() => getUpcomingContests().filter(c => c.urgency !== 'upcoming'), [])
  const streak = useMemo(() => buildStreakMessage(activityLog), [activityLog])

  return (
    <section className={`dash-panel ${compact ? 'dash-panel-compact' : ''}`} style={{ borderColor: 'color-mix(in srgb, var(--accent) 30%, var(--border))' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="dash-panel-label flex items-center gap-1"><Code2 size={12} /> Today&apos;s challenge</p>
          <h2 className="dash-panel-title">{challenge.title}</h2>
          <p className="dash-panel-desc">
            {challenge.difficulty} · {challenge.topic} · ~{challenge.estimatedMins} min
          </p>
          <p className={`text-xs mt-2 font-medium ${streak.atRisk ? 'text-amber-600' : 'text-emerald-600'}`}>
            <Flame size={12} className="inline mr-1" />
            {streak.message}
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <a href={url} target="_blank" rel="noopener noreferrer" className="dash-cta-primary text-xs">
            Open LeetCode <ExternalLink size={12} />
          </a>
          <button type="button" onClick={() => navigate('/planner')} className="dash-link-btn text-xs justify-center">
            Mark done in planner →
          </button>
        </div>
      </div>
      {contests.length > 0 && (
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
          {contests.map(c => (
            <a
              key={c.name}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
              style={{ background: c.urgency === 'today' ? 'var(--danger-soft)' : 'var(--warning-soft)', color: 'var(--text)' }}
            >
              <Trophy size={12} />
              {c.name} — {c.when}
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
