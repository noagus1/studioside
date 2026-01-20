import Link from 'next/link'
import type { Session } from '@/types/session'

interface SessionListItemProps {
  session: Session
}

function getStatusLabel(status: Session['status']): string {
  switch (status) {
    case 'scheduled':
      return 'Scheduled'
    case 'in_progress':
      return 'In progress'
    case 'live':
      return 'Live'
    case 'completed':
      return 'Completed'
    case 'finished':
      return 'Finished'
    case 'cancelled':
      return 'Cancelled'
    case 'no_show':
      return 'No-show'
    default:
      return status
  }
}

function getStatusPillClasses(status: Session['status']): string {
  switch (status) {
    case 'scheduled':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
    case 'in_progress':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'live':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'completed':
      return 'border-muted-foreground/20 bg-muted text-muted-foreground'
    case 'finished':
      return 'border-muted-foreground/20 bg-muted text-muted-foreground'
    case 'cancelled':
      return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
    case 'no_show':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
    default:
      return 'border-muted-foreground/20 bg-muted text-muted-foreground'
  }
}

function getStatusDotClasses(status: Session['status']): string {
  switch (status) {
    case 'in_progress':
    case 'live':
      return 'bg-emerald-500'
    case 'completed':
    case 'finished':
      return 'bg-muted-foreground/60'
    case 'cancelled':
      return 'bg-red-500'
    case 'no_show':
      return 'bg-amber-500'
    default:
      return 'bg-blue-500'
  }
}

export function SessionListItem({ session }: SessionListItemProps) {
  const now = Date.now()
  const startTime = new Date(session.start_time)
  const endTime = new Date(session.end_time)
  const isActiveNow =
    session.status !== 'cancelled' &&
    session.status !== 'completed' &&
    session.status !== 'finished' &&
    startTime.getTime() <= now &&
    now < endTime.getTime()
  const timeStr = startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const clientName = session.client?.name || 'Unknown Client'
  const roomName = session.room?.name || 'No Room'
  const showStatusPill = isActiveNow || session.status !== 'scheduled'
  const statusText = isActiveNow ? 'Active' : getStatusLabel(session.status)
  const pillClasses = isActiveNow
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : getStatusPillClasses(session.status)
  const dotClasses = isActiveNow ? 'bg-emerald-500' : getStatusDotClasses(session.status)

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block border rounded-lg p-3 hover:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <span className="shrink-0 font-medium text-sm tabular-nums">{timeStr}</span>
              <span className="shrink-0 text-muted-foreground">|</span>
              <span className="min-w-0 text-sm text-foreground truncate">
                {clientName} - {roomName}
              </span>
            </div>
            {showStatusPill ? (
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${pillClasses}`}
              >
                <span className={`mr-1 inline-flex h-1.5 w-1.5 rounded-full ${dotClasses}`} />
                {statusText}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  )
}
