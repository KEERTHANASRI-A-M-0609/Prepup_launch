import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  label?: string
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  maxWidth?: string
}

export default function PageShell({ label, title, subtitle, action, children, maxWidth = '1200px' }: Props) {
  return (
    <div className="page-container py-6 sm:py-10" style={{ maxWidth }}>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 mb-10 flex-wrap"
      >
        <div className="space-y-2">
          {label && <p className="text-label">{label}</p>}
          <h1 className="text-2xl sm:text-3xl md:text-display font-display leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-base max-w-xl" style={{ color: 'var(--text-2)' }}>{subtitle}</p>
          )}
        </div>
        {action}
      </motion.header>
      {children}
    </div>
  )
}
