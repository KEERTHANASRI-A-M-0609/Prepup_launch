import {
  Code2, FileText, Wrench, Mic, Calculator, Mail, MapPin, type LucideIcon,
} from 'lucide-react'

const MAP: Record<string, LucideIcon> = {
  dsa: Code2,
  resume: FileText,
  projects: Wrench,
  communication: Mic,
  aptitude: Calculator,
  interview: Mail,
}

export default function ActionCategoryIcon({
  category,
  size = 16,
  className,
}: {
  category: string
  size?: number
  className?: string
}) {
  const Icon = MAP[category] ?? MapPin
  return <Icon size={size} className={className} style={{ color: 'var(--accent)' }} />
}
