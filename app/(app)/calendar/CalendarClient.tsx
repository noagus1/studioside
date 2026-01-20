'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatSessionTitle, formatSessionTime, formatSessionDay } from '@/utils/sessionDisplay'
import type { Session } from '@/types/session'

interface CalendarClientProps {
  sessions: Session[]
  studioTimezone?: string
  initialSessionId?: string
}

// Month View Component
function MonthView({
  sessions,
  currentMonth,
  currentYear,
  onSessionClick,
  highlightSessionId,
}: {
  sessions: Session[]
  currentMonth: number
  currentYear: number
  onSessionClick: (session: Session) => void
  highlightSessionId?: string | null
}) {
  const today = new Date()

  // Group sessions by date
  const sessionsByDate = React.useMemo(() => {
    const grouped: Record<string, Session[]> = {}
    sessions.forEach((session) => {
      const dateKey = new Date(session.start_time).toISOString().split('T')[0]
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(session)
    })
    return grouped
  }, [sessions])


  // Get month dates based on state
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()

  // Generate calendar days
  const calendarDays: Array<{ date: Date; sessions: Session[] }> = []
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push({
      date: new Date(currentYear, currentMonth, -startingDayOfWeek + i + 1),
      sessions: [],
    })
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day)
    const dateKey = date.toISOString().split('T')[0]
    calendarDays.push({
      date,
      sessions: sessionsByDate[dateKey] || [],
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  }

  // Format start time for display
  const formatStartTime = (session: Session): string => {
    const startDate = new Date(session.start_time)
    return startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="space-y-4">

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 bg-muted/50 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-semibold">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dateKey = day.date.toISOString().split('T')[0]
            const isTodayDate = isToday(day.date)
            const isCurrentMonthDate = isCurrentMonth(day.date)

            return (
              <div
                key={index}
                className={`
                  min-h-[100px] border-r border-b p-2
                  ${!isCurrentMonthDate ? 'bg-muted/20 text-muted-foreground' : ''}
                  ${isTodayDate ? 'bg-primary/5' : ''}
                `}
              >
                <div
                  className={`
                    text-sm font-semibold mb-1
                    ${isTodayDate ? 'text-primary' : ''}
                  `}
                >
                  {day.date.getDate()}
                </div>
                <div className="space-y-1">
                  {day.sessions.slice(0, 3).map((session) => {
                    const isHighlight = highlightSessionId === session.id
                    const startTime = formatStartTime(session)
                    const title = formatSessionTitle(session)
                    return (
                      <div
                        key={session.id}
                        className={`text-xs rounded px-2 py-1 truncate cursor-pointer transition-colors ${
                          isHighlight
                            ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40'
                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                        title={formatSessionTitle(session) + ' • ' + formatSessionTime(session)}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSessionClick(session)
                        }}
                      >
                        <span className="text-primary/70 font-medium">{startTime}</span>
                        {' '}- {title}
                      </div>
                    )
                  })}
                  {day.sessions.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{day.sessions.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Week View Component
function WeekView({
  sessions,
  currentWeekStart,
  onSessionClick,
  highlightSessionId,
}: {
  sessions: Session[]
  currentWeekStart: Date
  onSessionClick: (session: Session) => void
  highlightSessionId?: string | null
}) {
  const today = new Date()

  // Current time state (updates every minute)
  const [currentTime, setCurrentTime] = React.useState(new Date())

  const formatLocalDateKey = React.useCallback((date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  type SessionSegment = {
    session: Session
    dateKey: string
    startMinutes: number
    endMinutes: number
  }

  React.useEffect(() => {
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])


  // Calculate current time position
  const currentTimeInfo = React.useMemo(() => {
    const now = currentTime
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const totalMinutes = hours * 60 + minutes
    const percentageThroughHour = minutes / 60
    
    // Format current time for display (without AM/PM)
    const timeLabel = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).replace(/\s?(AM|PM)/i, '') // Remove AM/PM

    return {
      hours,
      minutes,
      totalMinutes,
      percentageThroughHour,
      timeLabel,
    }
  }, [currentTime])

  // Get current week (Sunday through Saturday) based on navigation state
  const startOfWeek = currentWeekStart

  // Generate 7 days for the week
  const weekDays = React.useMemo(() => {
    const days: Array<{ date: Date; dateKey: string }> = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push({
        date,
        dateKey: formatLocalDateKey(date),
      })
    }
    return days
  }, [formatLocalDateKey, startOfWeek])

  // Group sessions by date
  const segmentsByDate = React.useMemo(() => {
    const grouped: Record<string, SessionSegment[]> = {}

    const toMinutes = (date: Date) => date.getHours() * 60 + date.getMinutes()

    sessions.forEach((session) => {
      const start = new Date(session.start_time)
      const end = new Date(session.end_time)

      const startDay = formatLocalDateKey(start)
      const endDay = formatLocalDateKey(end)

      let cursor = new Date(start)
      cursor.setHours(0, 0, 0, 0)

      while (true) {
        const currentDayKey = formatLocalDateKey(cursor)
        const isStartDay = currentDayKey === startDay
        const isEndDay = currentDayKey === endDay

        const segmentStartMinutes = isStartDay ? toMinutes(start) : 0
        const segmentEndMinutes = isEndDay ? toMinutes(end) : 24 * 60

        if (segmentEndMinutes > segmentStartMinutes) {
          if (!grouped[currentDayKey]) grouped[currentDayKey] = []
          grouped[currentDayKey].push({
            session,
            dateKey: currentDayKey,
            startMinutes: segmentStartMinutes,
            endMinutes: segmentEndMinutes,
          })
        }

        if (currentDayKey === endDay) break
        cursor.setDate(cursor.getDate() + 1)
      }
    })

    return grouped
  }, [formatLocalDateKey, sessions])

  // Generate time slots (12AM to 11PM - full 24 hours)
  const timeSlots = React.useMemo(() => {
    const slots: Array<{ hour: number; label: string }> = []
    for (let hour = 0; hour <= 23; hour++) {
      const date = new Date()
      date.setHours(hour, 0, 0, 0)
      slots.push({
        hour,
        label: date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          hour12: true,
        }),
      })
    }
    return slots
  }, [])

  const gridBodyRef = React.useRef<HTMLTableSectionElement | null>(null)
  const [rowHeight, setRowHeight] = React.useState(80)
  const pxPerMinute = rowHeight / 60

  // Debug instrumentation removed

  // Measure actual row height from the first rendered row to sync blocks with grid lines
  React.useLayoutEffect(() => {
    const measureRow = () => {
      const row = gridBodyRef.current?.querySelector('tr')
      if (!row) return
      const measured = row.getBoundingClientRect().height
      if (!measured) return
      setRowHeight((prev) => (Math.abs(prev - measured) < 0.5 ? prev : measured))
    }

    measureRow()
    window.addEventListener('resize', measureRow)
    return () => window.removeEventListener('resize', measureRow)
  }, [])

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Helper to render time label with styled hour and AM/PM
  const renderTimeLabel = (label: string) => {
    const parts = label.split(' ')
    const hour = parts[0]
    const period = parts[1] || ''
    
    return (
      <span className="inline-flex items-baseline">
        <span className="text-xs font-medium text-foreground">{hour}</span>
        {period && (
          <span className="text-[10px] font-medium text-muted-foreground ml-0.5">{period}</span>
        )}
      </span>
    )
  }

  // Calculate red pill position for overlap detection
  const lineTop = currentTimeInfo.totalMinutes * pxPerMinute

  return (
    <div className="space-y-4 w-full">
      {/* Calendar Container - Wrapped to prevent space-y-4 from adding gap between headers and table */}
      <div>
        {/* Day Headers - Positioned above calendar, aligned with columns */}
        <div className="flex items-stretch">
          {/* Spacer for y-axis column */}
          <div className="w-12 flex-shrink-0"></div>
          {/* Day headers */}
          <div className="grid grid-cols-7 relative flex-1 min-w-0 bg-transparent">
            {weekDays.map((day) => {
              const isCurrentDay = isToday(day.date)
              const dayAbbr = day.date.toLocaleDateString('en-US', { weekday: 'short' })
              const dayNumber = day.date.getDate()
              
              return (
                <div
                  key={day.dateKey}
                  className={`flex items-center justify-center px-2 py-2 ${isCurrentDay ? 'gap-1.5' : 'gap-1'}`}
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  <span className={`text-sm ${isCurrentDay ? 'font-medium text-foreground' : 'font-light text-muted-foreground'}`}>
                    {dayAbbr}
                  </span>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                    isCurrentDay 
                      ? 'bg-red-500 text-white font-medium' 
                      : 'text-muted-foreground font-light'
                  }`}>
                    {dayNumber}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Calendar Grid with Y-Axis Labels - Using table for perfect row alignment */}
        <div className="mt-0 relative flex">
          {/* Y-Axis Time Labels - separate container with no borders */}
          <div className="w-12 flex-shrink-0">
            <table className="w-full border-collapse">
              <tbody>
                {timeSlots.map((slot, slotIndex) => (
                  <tr key={slot.hour} className={slotIndex === 0 ? 'border-t border-transparent' : ''} style={{ height: `${rowHeight}px` }}>
                    <td className="align-top" style={{ height: `${rowHeight}px` }}>
                      <div className="flex justify-end pr-2">
                        <div className="text-xs font-medium text-muted-foreground whitespace-nowrap -mt-2">
                          {renderTimeLabel(slot.label)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Calendar Grid - with borders */}
          <div className="border border-border border-t-0 rounded-b-lg rounded-t-none overflow-visible flex-1 relative">
            <table className="w-full table-fixed border-collapse">
              <tbody ref={gridBodyRef} className="divide-y">
                {timeSlots.map((slot, slotIndex) => (
                  <tr key={slot.hour} className={slotIndex === 0 ? 'border-t border-border' : ''} style={{ height: `${rowHeight}px` }}>
                    {/* Calendar Day Columns */}
                    {weekDays.map((day, index) => {
                      return (
                        <td
                          key={day.dateKey}
                          className={`${index < 6 ? 'border-r border-border' : ''} p-1 align-top ${
                            isToday(day.date) ? 'bg-primary/5' : ''
                          }`}
                          style={{ height: `${rowHeight}px` }}
                        />
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Overlay: render one continuous block per session per day */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="grid grid-cols-7 h-full">
                {weekDays.map((day) => {
                  const daySegments = segmentsByDate[day.dateKey] || []
                  return (
                    <div key={day.dateKey} className="relative h-full px-1">
                      {daySegments.map((segment) => {
                        const { session, startMinutes, endMinutes } = segment
                        const sessionStartDay = formatLocalDateKey(new Date(session.start_time))
                        const isSessionStartDay = segment.dateKey === sessionStartDay
                        const clientName = session.client?.name || 'Unknown Client'
                        const roomName = session.room?.name
                        const durationMinutes = Math.max(0, endMinutes - startMinutes)
                        if (durationMinutes === 0) return null
                        const top = startMinutes * pxPerMinute
                        const height = durationMinutes * pxPerMinute

                        return (
                          <div
                            key={session.id}
                            className="absolute left-0 right-0 box-border rounded bg-primary/10 text-primary text-xs ring-1 ring-primary/15 hover:bg-primary/20 transition-colors pointer-events-auto overflow-hidden"
                            style={{
                              top: `${top + 1}px`,
                              height: `${Math.max(0, height - 1)}px`,
                            }}
                            title={formatSessionTitle(session) + ' • ' + formatSessionTime(session)}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSessionClick(session)
                            }}
                            >
                              <div className="box-border flex h-full w-full flex-col gap-0.5 px-2 py-1.5">
                                <div className="font-semibold text-[13px] leading-snug text-foreground whitespace-normal break-words">
                                  {clientName}
                                </div>
                                {roomName && isSessionStartDay && (
                                  <div className="text-[11px] text-muted-foreground leading-tight whitespace-normal break-words">
                                    {roomName}
                                  </div>
                                )}
                                {isSessionStartDay && (
                                  <div className="text-[11px] text-primary/70 leading-tight truncate">
                                    {formatSessionTime(session)}
                                  </div>
                                )}
                              </div>
                            </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Current Time Horizontal Line */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{ top: `${lineTop}px` }}
            >
              <div className="grid grid-cols-7 relative">
                {/* Day columns - faint redline with saturated red for current day */}
                {weekDays.map((day, index) => {
                  const isCurrentDay = isToday(day.date)
                  return (
                    <div
                      key={day.dateKey}
                      className={`${index < 6 ? 'border-r border-border' : ''} h-0.5 ${
                        isCurrentDay ? 'bg-red-500' : 'bg-red-500/20'
                      } relative`}
                    >
                      {isCurrentDay && (
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Current Time Label on Y-Axis */}
            <div
              className="absolute pointer-events-none z-30"
              style={{ 
                top: `${lineTop + 1}px`,
                left: '0',
                width: '3rem',
                paddingRight: '0.5rem',
                transform: 'translate(-100%, -50%)',
              }}
            >
              <div className="bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap text-right">
                {currentTimeInfo.timeLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Sessions View Component
function SessionsView({
  sessions,
  onSessionClick,
  timeZone,
  highlightSessionId,
}: {
  sessions: Session[]
  onSessionClick: (session: Session) => void
  timeZone?: string
  highlightSessionId?: string | null
}) {
  // Sort all sessions by start time (earliest first)
  const sortedSessions = React.useMemo(() => {
    return [...sessions].sort((a, b) => {
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    })
  }, [sessions])

  const groupedSessions = React.useMemo(() => {
    const groups: Array<{ dayLabel: string; sessions: Session[] }> = []

    sortedSessions.forEach((session) => {
      const dayLabel = formatSessionDay(session, { timeZone })
      const lastGroup = groups[groups.length - 1]

      if (lastGroup && lastGroup.dayLabel === dayLabel) {
        lastGroup.sessions.push(session)
      } else {
        groups.push({ dayLabel, sessions: [session] })
      }
    })

    return groups
  }, [sortedSessions, timeZone])

  const getStatusClasses = (status: Session['status']) => {
    switch (status) {
      case 'in_progress':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
      case 'completed':
        return 'bg-slate-100 text-slate-800 border border-slate-200'
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border border-rose-200'
      case 'scheduled':
      default:
        return 'bg-amber-100 text-amber-800 border border-amber-200'
    }
  }

  const getStatusLabel = (status: Session['status']) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      case 'scheduled':
      default:
        return 'Scheduled'
    }
  }

  return (
    <div className="space-y-4">
      {sortedSessions.length === 0 ? (
        <div className="bg-muted/50 border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No upcoming sessions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedSessions.map((group, groupIndex) => (
            <div key={`${group.dayLabel}-${groupIndex}`} className="space-y-3">
              {group.sessions.map((session, sessionIndex) => {
                const isLast =
                  groupIndex === groupedSessions.length - 1 &&
                  sessionIndex === group.sessions.length - 1

                return (
                  <div key={session.id} className="relative flex gap-4">
                    {/* Rail + Time Anchor */}
                    <div className="relative w-32 flex-shrink-0 pr-4 text-right">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {group.dayLabel}
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {formatSessionTime(session, { timeZone })}
                      </div>

                      <div className="absolute right-[-12px] top-[10px]">
                        <span className="block h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/15" />
                      </div>
                      {!isLast && (
                        <div className="absolute right-[-10px] top-6 bottom-[-18px] w-px bg-border" />
                      )}
                    </div>

                    {/* Session Card */}
                    <div
                      className={`flex-1 rounded-lg border bg-card p-4 transition cursor-pointer ${
                        highlightSessionId === session.id ? 'ring-2 ring-primary border-primary/60' : ''
                      }`}
                      onClick={() => onSessionClick(session)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="text-sm font-semibold text-foreground truncate">
                            {formatSessionTitle(session)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {session.room?.name && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                              {session.room.name}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${getStatusClasses(session.status)}`}
                          >
                            {getStatusLabel(session.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CalendarClient({ sessions, studioTimezone, initialSessionId }: CalendarClientProps) {
  const router = useRouter()
  const [view, setView] = React.useState<'month' | 'sessions' | 'week'>('week')
  const [highlightSessionId, setHighlightSessionId] = React.useState<string | null>(initialSessionId ?? null)
  
  // Week navigation state (lifted to main component for header display)
  const today = new Date()
  const [currentWeekStart, setCurrentWeekStart] = React.useState(() => {
    const start = new Date(today)
    const dayOfWeek = start.getDay() // 0 = Sunday, 6 = Saturday
    start.setDate(today.getDate() - dayOfWeek)
    start.setHours(0, 0, 0, 0)
    return start
  })
  
  // Month navigation state (lifted to main component for header display)
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth())
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear())

  const viewLabels: Record<'month' | 'sessions' | 'week', string> = {
    month: 'Month',
    sessions: 'Sessions',
    week: 'Week',
  }
  
  // Calculate date range text based on current view
  const dateRangeDisplay = React.useMemo(() => {
    if (view === 'week') {
      const month = currentWeekStart.toLocaleDateString('en-US', { month: 'long' })
      const year = currentWeekStart.getFullYear()
      return { month, year }
    } else if (view === 'month') {
      const month = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { month: 'long' })
      const year = currentYear
      return { month, year }
    }
    return { month: 'Calendar', year: null }
  }, [view, currentWeekStart, currentMonth, currentYear])

  // Navigation handlers for week view
  const handlePreviousWeek = React.useCallback(() => {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() - 7)
    setCurrentWeekStart(newWeekStart)
  }, [currentWeekStart])

  const handleNextWeek = React.useCallback(() => {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() + 7)
    setCurrentWeekStart(newWeekStart)
  }, [currentWeekStart])

  const handleTodayWeek = React.useCallback(() => {
    const todayStart = new Date(today)
    const dayOfWeek = todayStart.getDay() // 0 = Sunday, 6 = Saturday
    todayStart.setDate(today.getDate() - dayOfWeek)
    todayStart.setHours(0, 0, 0, 0)
    setCurrentWeekStart(todayStart)
  }, [today])

  // Navigation handlers for month view
  const handlePreviousMonth = React.useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }, [currentMonth, currentYear])

  const handleNextMonth = React.useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }, [currentMonth, currentYear])

  const handleTodayMonth = React.useCallback(() => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }, [today])

  // Handle session creation callback for auto-refresh
  const handleSessionClick = React.useCallback(
    (session: Session) => {
      router.push(`/sessions/${session.id}`)
    },
    [router]
  )

  React.useEffect(() => {
    if (!initialSessionId) return
    const targetSession = sessions.find((session) => session.id === initialSessionId)
    if (!targetSession) return

    const start = new Date(targetSession.start_time)
    const startOfWeek = new Date(start)
    const dayOfWeek = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)

    setView('week')
    setCurrentWeekStart(startOfWeek)
    setHighlightSessionId(initialSessionId)
  }, [initialSessionId, sessions])

  return (
    <div className="space-y-3">
      {/* Header with View Selector and Navigation */}
      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-2">
        <div className="flex items-center">
          <h2 className="text-2xl font-semibold">
            {dateRangeDisplay.month}
            {dateRangeDisplay.year && (
              <span className="font-light ml-2">{dateRangeDisplay.year}</span>
            )}
          </h2>
        </div>
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {viewLabels[view]}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuRadioGroup value={view} onValueChange={(value) => setView(value as 'month' | 'sessions' | 'week')}>
                <DropdownMenuRadioItem value="month">Month</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="week">Week</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sessions">Sessions</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-end gap-2">
          {/* Navigation Buttons - only show for week and month views */}
          {(view === 'week' || view === 'month') && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={view === 'week' ? handlePreviousWeek : handlePreviousMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={view === 'week' ? handleTodayWeek : handleTodayMonth}
                className="h-8"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={view === 'week' ? handleNextWeek : handleNextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* View Content */}
      {view === 'month' ? (
        <MonthView
          sessions={sessions}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onSessionClick={handleSessionClick}
          highlightSessionId={highlightSessionId}
        />
      ) : view === 'week' ? (
        <WeekView
          sessions={sessions}
          currentWeekStart={currentWeekStart}
          onSessionClick={handleSessionClick}
          highlightSessionId={highlightSessionId}
        />
      ) : (
        <SessionsView
          sessions={sessions}
          onSessionClick={handleSessionClick}
          timeZone={studioTimezone}
          highlightSessionId={highlightSessionId}
        />
      )}

    </div>
  )
}
