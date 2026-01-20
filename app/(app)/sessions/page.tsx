import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { Button } from '@/components/ui/button'
import { getSessions } from './actions'
import { getStudioSettings } from '@/actions/getStudioSettings'
import type { Session } from '@/types/session'
import { formatSessionTime, formatSessionTitle } from '@/utils/sessionDisplay'

function isoDateInTimeZone(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const yyyy = get('year')
  const mm = get('month')
  const dd = get('day')

  return `${yyyy}-${mm}-${dd}`
}

function shiftIsoDate(isoDate: string, days: number): string {
  // Treat ISO date keys (YYYY-MM-DD) as calendar days, independent of timezone/DST.
  const [yyyy, mm, dd] = isoDate.split('-').map((part) => Number(part))
  const date = new Date(Date.UTC(yyyy, (mm ?? 1) - 1, dd ?? 1))
  date.setUTCDate(date.getUTCDate() + days)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getRelativeDayLabel(dateIso: string, todayIso: string, tomorrowIso: string) {
  if (dateIso === todayIso) return 'Today'
  if (dateIso === tomorrowIso) return 'Tomorrow'
  return null
}

function formatAbsoluteHeaderDate(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatDateGroupHeader(options: {
  dateIso: string
  representativeDate: Date
  todayIso: string
  tomorrowIso: string
  timeZone?: string
}) {
  const { dateIso, representativeDate, todayIso, tomorrowIso, timeZone } = options
  const relative = getRelativeDayLabel(dateIso, todayIso, tomorrowIso)
  const absolute = formatAbsoluteHeaderDate(representativeDate, timeZone)
  if (relative) return `${relative} · ${absolute}`
  return absolute
}

function buildSearchHref({
  q,
  upcoming,
  recent,
}: {
  q?: string
  upcoming?: 'all' | undefined
  recent?: 'all' | undefined
}) {
  const params = new URLSearchParams()
  if (q?.trim()) params.set('q', q.trim())
  if (upcoming) params.set('upcoming', upcoming)
  if (recent) params.set('recent', recent)
  const qs = params.toString()
  return qs ? `/sessions?${qs}` : '/sessions'
}

function normalizeSearch(text: string) {
  return text.trim().toLowerCase()
}

function statusLabel(status: Session['status']) {
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

function statusPillClasses(status: Session['status']) {
  switch (status) {
    case 'in_progress':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'live':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'completed':
      return 'border-muted-foreground/20 bg-muted text-muted-foreground'
    case 'finished':
      return 'border-muted-foreground/20 bg-muted text-muted-foreground'
    case 'no_show':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
    case 'cancelled':
      return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
    default:
      return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
  }
}

function statusDotClasses(status: Session['status']) {
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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export default async function SessionsHubPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const q = typeof searchParams?.q === 'string' ? searchParams.q : ''
  const upcomingParam = typeof searchParams?.upcoming === 'string' ? searchParams.upcoming : undefined
  const recentParam = typeof searchParams?.recent === 'string' ? searchParams.recent : undefined

  const upcomingLimit = upcomingParam === 'all' ? 60 : 10
  const recentLimit = recentParam === 'all' ? 60 : 12

  // Fetch sessions around "now" so the default view can prioritize upcoming/active.
  const now = new Date()
  const studioSettings = await getStudioSettings()
  const timeZone = 'error' in studioSettings ? undefined : studioSettings.studio.timezone || undefined

  // Use studio-local calendar day keys for all comparisons/ranges to avoid server TZ skew.
  const todayIso = isoDateInTimeZone(now, timeZone)
  const rangeStartIso = shiftIsoDate(todayIso, -30)
  const rangeEndIso = shiftIsoDate(todayIso, 180)

  const sessionsResult = await getSessions(rangeStartIso, rangeEndIso)

  if ('error' in sessionsResult) {
    if (sessionsResult.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground mt-1">Your studio’s sessions</p>
        </div>
        <div className="mt-6 rounded-lg border border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
          {sessionsResult.message}
        </div>
      </div>
    )
  }

  const tomorrowIso = shiftIsoDate(todayIso, 1)
  const cutoffIso = shiftIsoDate(todayIso, -14)

  const normalizedQ = normalizeSearch(q)

  const filtered = sessionsResult.sessions.filter((session) => {
    if (!normalizedQ) return true
    const start = new Date(session.start_time)
    const dateIso = isoDateInTimeZone(start, timeZone)
    const title = formatSessionTitle(session)
    const time = formatSessionTime(session, { timeZone })
    const room = session.room?.name ?? ''
    const client = session.client?.name ?? ''

    const haystack = normalizeSearch([title, time, dateIso, room, client].filter(Boolean).join(' • '))
    return haystack.includes(normalizedQ)
  })

  const isActiveNow = (session: Session) => {
    if (session.status === 'cancelled' || session.status === 'completed') return false
    const start = new Date(session.start_time).getTime()
    const end = new Date(session.end_time).getTime()
    const t = now.getTime()
    return start <= t && t < end
  }

  const isUpcoming = (session: Session) => {
    if (session.status === 'cancelled') return false
    const startIso = isoDateInTimeZone(new Date(session.start_time), timeZone)
    return startIso >= todayIso && !isActiveNow(session)
  }

  const isRecentlyFinished = (session: Session) => {
    if (session.status === 'cancelled') return false
    const endTime = new Date(session.end_time).getTime()
    if (!(endTime < now.getTime())) return false
    const endIso = isoDateInTimeZone(new Date(session.end_time), timeZone)
    return endIso >= cutoffIso
  }

  const activeSessions = filtered.filter(isActiveNow).slice(0, 5)

  const activeGroups = activeSessions.reduce((groups, session) => {
    const dateIso = isoDateInTimeZone(new Date(session.start_time), timeZone)
    const existing = groups.get(dateIso)
    if (existing) {
      existing.push(session)
    } else {
      groups.set(dateIso, [session])
    }
    return groups
  }, new Map<string, Session[]>())
  const activeGroupKeys = Array.from(activeGroups.keys()).sort()
  const activeSingleKey = activeGroupKeys.length === 1 ? activeGroupKeys[0] : null

  const upcomingAll = filtered
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  const upcomingTodaySessions = upcomingAll.filter((session) => {
    if (session.status === 'cancelled' || session.status === 'completed') return false
    const start = new Date(session.start_time)
    const startIso = isoDateInTimeZone(start, timeZone)
    return startIso === todayIso && start.getTime() > now.getTime()
  })

  const upcomingFutureAll = upcomingAll.filter((session) => {
    if (session.status === 'cancelled' || session.status === 'completed') return false
    const startIso = isoDateInTimeZone(new Date(session.start_time), timeZone)
    return startIso > todayIso
  })

  const upcomingFutureSessions = upcomingFutureAll.slice(0, upcomingLimit)
  const upcomingSessionsToRender = [...upcomingTodaySessions, ...upcomingFutureSessions]
  const upcomingShownCount = upcomingSessionsToRender.length

  const upcomingGroups = upcomingSessionsToRender.reduce((groups, session) => {
    const dateIso = isoDateInTimeZone(new Date(session.start_time), timeZone)
    const existing = groups.get(dateIso)
    if (existing) {
      existing.push(session)
    } else {
      groups.set(dateIso, [session])
    }
    return groups
  }, new Map<string, Session[]>())
  const upcomingGroupKeys = Array.from(upcomingGroups.keys()).sort()

  const recentAll = filtered
    .filter(isRecentlyFinished)
    .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime())
  const recentSessions = recentAll.slice(0, recentLimit)

  const recentGroups = recentSessions.reduce((groups, session) => {
    const dateIso = isoDateInTimeZone(new Date(session.end_time), timeZone)
    const existing = groups.get(dateIso)
    if (existing) {
      existing.push(session)
    } else {
      groups.set(dateIso, [session])
    }
    return groups
  }, new Map<string, Session[]>())
  const recentGroupKeys = Array.from(recentGroups.keys()).sort((a, b) => b.localeCompare(a))

  const upcomingSingleKey = upcomingGroupKeys.length === 1 ? upcomingGroupKeys[0] : null
  const upcomingSectionHeader = (() => {
    const firstKey = upcomingGroupKeys[0]
    if (!firstKey) return null
    const group = upcomingGroups.get(firstKey) ?? []
    if (group.length === 0) return null
    return formatDateGroupHeader({
      dateIso: firstKey,
      representativeDate: new Date(group[0].start_time),
      todayIso,
      tomorrowIso,
      timeZone,
    })
  })()

  const recentSingleKey = recentGroupKeys.length === 1 ? recentGroupKeys[0] : null
  const recentSingleHeader = recentSingleKey
    ? (() => {
        const group = recentGroups.get(recentSingleKey) ?? []
        if (group.length === 0) return null
        return formatDateGroupHeader({
          dateIso: recentSingleKey,
          representativeDate: new Date(group[0].end_time),
          todayIso,
          tomorrowIso,
          timeZone,
        })
      })()
    : null

  const recentSectionHeader =
    recentSingleHeader ??
    (() => {
      const firstKey = recentGroupKeys[0]
      if (!firstKey) return null
      const group = recentGroups.get(firstKey) ?? []
      if (group.length === 0) return null
      return formatDateGroupHeader({
        dateIso: firstKey,
        representativeDate: new Date(group[0].end_time),
        todayIso,
        tomorrowIso,
        timeZone,
      })
    })()

  const showActiveNow = activeSessions.length > 0
  const showUpcoming = upcomingAll.length > 0 || upcomingParam === 'all'
  const showRecent = recentSessions.length > 0

  const renderSessionRow = (
    session: Session,
    { variant }: { variant: 'active' | 'upcoming' | 'finished' }
  ) => {
    const start = new Date(session.start_time)
    const end = new Date(session.end_time)
    const timeRange = formatSessionTime(session, { timeZone })
    const clientName = session.client?.name || 'Unknown Client'
    const roomName = session.room?.name || 'No Room'
    const engineerName = session.engineer?.full_name || session.engineer?.email || null

    const isActiveVariant = variant === 'active'
    const isLiveNow = isActiveVariant && now.getTime() >= start.getTime() && now.getTime() <= end.getTime()

    const clockOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...(timeZone ? { timeZone } : {}),
    }
    const startClock = start.toLocaleTimeString('en-US', clockOptions)
    const endClock = end.toLocaleTimeString('en-US', clockOptions)

    const progressPct =
      variant === 'active'
        ? clamp(
            ((now.getTime() - start.getTime()) / Math.max(1, end.getTime() - start.getTime())) * 100,
            0,
            100
          )
        : 0

    const containerClasses =
      variant === 'active'
        ? 'p-3'
        : variant === 'upcoming'
          ? 'p-3'
          : 'p-2.5'

    const timeLineClasses =
      variant === 'active'
        ? 'text-sm font-normal text-foreground tabular-nums'
        : variant === 'upcoming'
          ? 'text-xs font-normal text-foreground tabular-nums'
          : 'text-xs font-normal text-foreground tabular-nums'

    const primaryLineClasses =
      variant === 'active'
        ? 'text-sm font-medium text-foreground truncate'
        : variant === 'upcoming'
          ? 'text-sm font-medium text-foreground truncate'
          : 'text-sm font-medium text-foreground truncate'

    const roomLineClasses =
      variant === 'active'
        ? 'mt-1 text-sm font-normal text-foreground'
        : variant === 'upcoming'
          ? 'mt-1 text-sm font-normal text-foreground'
          : 'mt-0.5 text-sm font-normal text-foreground'

    const metaRowClasses =
      variant === 'active'
        ? 'mt-2 text-xs text-muted-foreground/90'
        : variant === 'upcoming'
          ? 'mt-1 text-xs text-muted-foreground/90'
          : 'mt-0.5 text-[11px] text-muted-foreground/70'

    const timeRowMarginClasses = variant === 'finished' ? 'mt-1.5' : 'mt-2'

    return (
      <Link
        key={session.id}
        href={`/sessions/${session.id}`}
        className={`group block rounded-xl border border-border/50 bg-card/40 transition-colors hover:bg-card/60 hover:border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${containerClasses}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className={`leading-tight ${primaryLineClasses}`}>{clientName} Session</div>
              </div>
              <div className="flex items-center">
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-opacity group-hover:opacity-100 opacity-70" />
              </div>
            </div>

            <div className={roomLineClasses}>{roomName}</div>

            {variant === 'active' ? (
              <div className={`mt-2 flex items-center gap-3 ${timeLineClasses}`}>
                <span className="shrink-0 text-xs leading-none">{startClock}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`absolute left-0 top-0 h-2 rounded-full bg-emerald-500/90 dark:bg-emerald-400/90 ${isLiveNow ? "overflow-hidden motion-safe:before:content-[''] motion-safe:before:absolute motion-safe:before:inset-0 motion-safe:before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] motion-safe:before:animate-live-shimmer" : ''}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs leading-none">{endClock}</span>
              </div>
            ) : (
              <div
                className={`${timeRowMarginClasses} flex items-center justify-between gap-3 ${timeLineClasses}`}
              >
                <span className="shrink-0 text-xs leading-none">{startClock}</span>
                <span className="shrink-0 text-xs leading-none">{endClock}</span>
              </div>
            )}

            {engineerName && variant === 'active' ? (
              <div className={metaRowClasses}>
                Engineer: <span className="text-muted-foreground">{engineerName}</span>
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          </div>
          <Button asChild>
            <Link href="/sessions/new">New session</Link>
          </Button>
        </div>

      </div>

      <div className="space-y-10">
        {/* Active now */}
        {showActiveNow ? (
          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex flex-col">
                <h2 className="text-base font-medium tracking-[0.015em]">Active</h2>
                <div className="text-[11px] font-medium text-muted-foreground/70">Now</div>
              </div>
            </div>

            <div className="space-y-2">
              {activeGroupKeys.map((dateIso, idx) => {
                const group = activeGroups.get(dateIso) ?? []
                if (group.length === 0) return null

                // Suppress date rows by default; show only if multiple day-groups exist.
                if (activeSingleKey && dateIso === activeSingleKey) {
                  return (
                    <div key={dateIso} className="space-y-2">
                      {group.map((s) => renderSessionRow(s, { variant: 'active' }))}
                    </div>
                  )
                }

                const representativeDate = new Date(group[0].start_time)
                const header = formatDateGroupHeader({
                  dateIso,
                  representativeDate,
                  todayIso,
                  tomorrowIso,
                  timeZone,
                })

                return (
                  <div key={dateIso} className={idx === 0 ? 'space-y-2' : 'pt-3 space-y-2'}>
                    <div className="text-[11px] font-medium text-muted-foreground/70">{header}</div>
                    <div className="space-y-2">{group.map((s) => renderSessionRow(s, { variant: 'active' }))}</div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* Upcoming */}
        {showUpcoming ? (
          <section className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <h2 className="text-base font-medium tracking-[0.015em]">Upcoming</h2>
                {upcomingSectionHeader ? (
                  <div className="text-[11px] font-medium text-muted-foreground/70">{upcomingSectionHeader}</div>
                ) : null}
              </div>
              {upcomingAll.length > upcomingShownCount ? (
                <Button asChild variant="ghost" size="sm">
                  <Link
                    href={buildSearchHref({
                      q,
                      upcoming: 'all',
                      recent: recentParam === 'all' ? 'all' : undefined,
                    })}
                  >
                    View all upcoming
                  </Link>
                </Button>
              ) : upcomingParam === 'all' && upcomingFutureAll.length > 0 ? (
                <Button asChild variant="ghost" size="sm">
                  <Link
                    href={buildSearchHref({
                      q,
                      upcoming: undefined,
                      recent: recentParam === 'all' ? 'all' : undefined,
                    })}
                  >
                    Show fewer
                  </Link>
                </Button>
              ) : null}
            </div>

            {upcomingAll.length > 0 ? (
              <div className="space-y-2">
                {upcomingGroupKeys.map((dateIso, idx) => {
                  const group = upcomingGroups.get(dateIso) ?? []
                  if (group.length === 0) return null
                  const representativeDate = new Date(group[0].start_time)
                  const header = formatDateGroupHeader({
                    dateIso,
                    representativeDate,
                    todayIso,
                    tomorrowIso,
                    timeZone,
                  })

                  if (upcomingSingleKey && dateIso === upcomingSingleKey) {
                    return (
                      <div key={dateIso} className="space-y-2">
                        {group.map((s) => renderSessionRow(s, { variant: 'upcoming' }))}
                      </div>
                    )
                  }

                  return (
                    <div key={dateIso} className={idx === 0 ? 'space-y-2' : 'pt-3 space-y-2'}>
                      {idx === 0 && upcomingSectionHeader ? null : (
                        <div className="text-[11px] font-medium text-muted-foreground/70">{header}</div>
                      )}
                      <div className="space-y-2">
                        {group.map((s) => renderSessionRow(s, { variant: 'upcoming' }))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-6">
                <div className="text-sm font-medium text-foreground">No upcoming sessions</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Create a session to put time on the calendar.
                </div>
                <div className="mt-4">
                  <Button asChild size="sm">
                    <Link href="/sessions/new">New session</Link>
                  </Button>
                </div>
              </div>
            )}
          </section>
        ) : null}

        {/* Recently finished */}
        {showRecent ? (
          <section className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <h2 className="text-base font-medium tracking-[0.015em] text-muted-foreground">Finished</h2>
                {recentSectionHeader ? (
                  <div className="text-[11px] font-medium text-muted-foreground/70">{recentSectionHeader}</div>
                ) : null}
              </div>
              {recentAll.length > recentLimit ? (
                <Button asChild variant="ghost" size="sm">
                  <Link
                    href={buildSearchHref({
                      q,
                      upcoming: upcomingParam === 'all' ? 'all' : undefined,
                      recent: 'all',
                    })}
                  >
                    View all recent
                  </Link>
                </Button>
              ) : recentParam === 'all' && recentAll.length > 0 ? (
                <Button asChild variant="ghost" size="sm">
                  <Link
                    href={buildSearchHref({
                      q,
                      upcoming: upcomingParam === 'all' ? 'all' : undefined,
                      recent: undefined,
                    })}
                  >
                    Show fewer
                  </Link>
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              {recentGroupKeys.map((dateIso, idx) => {
                const group = recentGroups.get(dateIso) ?? []
                if (group.length === 0) return null
                const representativeDate = new Date(group[0].end_time)
                const header = formatDateGroupHeader({
                  dateIso,
                  representativeDate,
                  todayIso,
                  tomorrowIso,
                  timeZone,
                })

                if (recentSingleKey && dateIso === recentSingleKey) {
                  return (
                    <div key={dateIso} className="space-y-1">
                      {group.map((s) => renderSessionRow(s, { variant: 'finished' }))}
                    </div>
                  )
                }

                return (
                  <div key={dateIso} className={idx === 0 ? 'space-y-2' : 'pt-3 space-y-2'}>
                    {idx === 0 && recentSectionHeader ? null : (
                      <div className="text-[11px] font-medium text-muted-foreground/70">{header}</div>
                    )}
                    <div className="space-y-1">
                      {group.map((s) => renderSessionRow(s, { variant: 'finished' }))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

