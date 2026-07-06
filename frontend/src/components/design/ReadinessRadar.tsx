import { motion } from 'framer-motion'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

const SKILLS = [
  { key: 'dsa', label: 'Coding' },
  { key: 'resume', label: 'Resume' },
  { key: 'projects', label: 'Projects' },
  { key: 'communication', label: 'Communication' },
  { key: 'aptitude', label: 'Aptitude' },
  { key: 'interview', label: 'Interview' },
] as const

interface Props {
  scores: Record<string, number>
  onSkillClick?: (key: string) => void
}

export default function ReadinessRadar({ scores, onSkillClick }: Props) {
  const data = SKILLS.map(s => ({
    skill: s.label,
    value: scores[s.key] ?? 0,
    key: s.key,
  }))

  const avg = Math.round(data.reduce((a, d) => a + d.value, 0) / data.length)

  return (
    <div className="surface-elevated p-6 h-full">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-label">Readiness Map</p>
          <p className="font-display text-xl font-bold mt-1" style={{ color: 'var(--text)' }}>
            Skill Profile
          </p>
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-right"
        >
          <p className="text-3xl font-bold font-display" style={{ color: 'var(--accent)' }}>{avg}%</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>overall</p>
        </motion.div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="var(--border)" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: 'var(--text-2)', fontSize: 11, fontWeight: 500 }}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.15}
            strokeWidth={2}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-2 mt-4">
        {data.map((d, i) => (
          <motion.button
            key={d.key}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSkillClick?.(d.key)}
            className="text-left p-3 rounded-xl transition-colors hover:bg-[var(--bg-muted)]"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
              {d.skill}
            </p>
            <p className="text-lg font-bold mt-0.5" style={{
              color: d.value >= 70 ? 'var(--success)' : d.value >= 45 ? 'var(--warning)' : 'var(--danger)',
            }}>
              {d.value}%
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
