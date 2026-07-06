import { RefreshCw, Database, Wifi } from 'lucide-react'
import { formatSyncTime } from '../engine/intelligenceTimelineEngine'

export default function LiveSyncStrip({
  mongoOnline,
  apiOnline,
  lastSyncedAt,
  isSyncing,
  onRefresh,
}: {
  mongoOnline: boolean
  apiOnline: boolean
  lastSyncedAt: string | null
  isSyncing: boolean
  onRefresh: () => void
}) {
  const connected = apiOnline && mongoOnline

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs"
      style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {connected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Database size={13} className="text-emerald-600 shrink-0" />
            <span className="font-medium" style={{ color: 'var(--success)' }}>Live · prepup cluster</span>
          </>
        ) : apiOnline ? (
          <>
            <Wifi size={13} className="shrink-0 dash-label" />
            <span className="dash-subtext">API online · syncing…</span>
          </>
        ) : (
          <span className="dash-subtext">Connecting to PrepUp API…</span>
        )}
        <span className="dash-label hidden sm:inline">·</span>
        <span className="dash-label truncate">
          {isSyncing ? 'Saving…' : `Last sync ${formatSyncTime(lastSyncedAt)}`}
        </span>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isSyncing}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-semibold shrink-0 transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
      >
        <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
        Refresh
      </button>
    </div>
  )
}
