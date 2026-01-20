'use client'

import * as React from 'react'
import { Calendar } from 'lucide-react'
import { type Session } from '@/types/session'
import { formatSessionDate, formatSessionTime } from '@/utils/sessionDisplay'

interface PastSessionsListProps {
  sessions: Session[]
  onSessionClick?: (session: Session) => void
}

/**
 * Formats a session status for display
 */
function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
}

/**
 * Gets status badge color class
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'scheduled':
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

export function PastSessionsList({ sessions, onSessionClick }: PastSessionsListProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No past sessions for this client</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          className={`bg-card border rounded-lg p-4 hover:bg-accent/50 transition-colors ${onSessionClick ? 'cursor-pointer' : ''}`}
          onClick={() => onSessionClick?.(session)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">
                  {formatSessionDate(session)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatSessionTime(session)}
                </span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {session.room && (
                  <p>Room: {session.room.name}</p>
                )}
                {session.engineer && (
                  <p>
                    Engineer: {session.engineer.full_name || session.engineer.email || 'Unknown'}
                  </p>
                )}
              </div>
            </div>
            <div className="ml-4">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}
              >
                {formatStatus(session.status)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}








