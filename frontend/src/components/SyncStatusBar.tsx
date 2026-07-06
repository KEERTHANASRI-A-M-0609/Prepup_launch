import { useApp } from '../store/AppContext'

/** Hidden — connection retries happen silently in the background. */
export default function SyncStatusBar() {
  return null
}

/** Shown only when API and database are fully connected. */
export function ConnectionPill() {
  const { apiOnline, mongoOnline } = useApp()

  if (!apiOnline || !mongoOnline) return null

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-100 border border-emerald-400/30">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Connected
    </span>
  )
}
