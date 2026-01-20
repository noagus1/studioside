/**
 * Session Display Utilities
 * 
 * Utility functions for consistently formatting and displaying sessions
 * across the application (Dashboard, Calendar, Session List, etc.)
 */

import type { Session } from '@/types/session'

/**
 * Formats a session title using the MVP format: "Client Name - Room Name"
 * 
 * @param session - Session object with optional client and room relations
 * @returns Formatted session title string
 */
export function formatSessionTitle(session: Session): string {
  const client = session.client?.name || 'Unknown Client'
  const room = session.room?.name || 'No Room'
  return `${client} - ${room}`
}

/**
 * Formats a session time range as "Start Time - End Time"
 * Uses 12-hour format with AM/PM by default.
 * 
 * @param session - Session object with start_time and end_time
 * @param options - Formatting options
 * @returns Formatted time string (e.g., "2:00 PM - 4:00 PM")
 */
export function formatSessionTime(
  session: Session,
  options?: {
    use24Hour?: boolean
    includeDate?: boolean
    timeZone?: string
  }
): string {
  const startDate = new Date(session.start_time)
  const endDate = new Date(session.end_time)

  const formatTime = (date: Date): string => {
    const timeFormat: Intl.DateTimeFormatOptions = options?.use24Hour
      ? {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }
      : {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }

    if (options?.timeZone) {
      timeFormat.timeZone = options.timeZone
    }

    return date.toLocaleTimeString('en-US', timeFormat)
  }

  const startTime = formatTime(startDate)
  const endTime = formatTime(endDate)

  if (options?.includeDate) {
    const dateStr = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    return `${dateStr} • ${startTime} - ${endTime}`
  }

  return `${startTime} - ${endTime}`
}

/**
 * Formats a session's calendar day label with timezone awareness.
 * Format: "Tue, Mar 12" or "Tue, Mar 12, 2025" when includeYear is true.
 */
export function formatSessionDay(
  session: Session,
  options?: { timeZone?: string; includeYear?: boolean }
): string {
  const date = new Date(session.start_time)
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }

  if (options?.timeZone) {
    dateOptions.timeZone = options.timeZone
  }

  if (options?.includeYear) {
    dateOptions.year = 'numeric'
  }

  return new Intl.DateTimeFormat('en-US', dateOptions).format(date)
}

/**
 * Formats a session for compact display (e.g., calendar cells)
 * Format: "Client Name\nRoom | Time Range"
 * 
 * @param session - Session object with relations
 * @returns Formatted string for compact display
 */
export function formatSessionCompact(session: Session): string {
  const client = session.client?.name || 'Unknown Client'
  const room = session.room?.name || 'No Room'
  const time = formatSessionTime(session)
  return `${client}\n${room} | ${time}`
}

/**
 * Formats a session with engineer information if available
 * Format: "Client Name - Room Name\nEngineer Name | Start Time - End Time"
 * 
 * @param session - Session object with relations
 * @returns Formatted string with engineer info
 */
export function formatSessionWithEngineer(session: Session): string {
  const title = formatSessionTitle(session)
  const time = formatSessionTime(session)

  if (session.engineer) {
    const engineerName = session.engineer.full_name || session.engineer.email || 'Unknown Engineer'
    return `${title}\n${engineerName} | ${time}`
  }

  return `${title}\n${time}`
}

/**
 * Gets a short date string for a session
 * Format: "Mon, Jan 15" or "Today", "Tomorrow"
 * 
 * @param session - Session object with start_time
 * @returns Formatted date string
 */
export function formatSessionDate(session: Session): string {
  const sessionDate = new Date(session.start_time)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const sessionDateOnly = new Date(sessionDate)
  sessionDateOnly.setHours(0, 0, 0, 0)

  if (sessionDateOnly.getTime() === today.getTime()) {
    return 'Today'
  } else if (sessionDateOnly.getTime() === tomorrow.getTime()) {
    return 'Tomorrow'
  } else {
    return sessionDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }
}
