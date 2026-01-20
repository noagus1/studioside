'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SessionListItem } from './SessionListItem'
import type { Session } from '@/types/session'

interface SessionsPanelProps {
  todaySessions: Session[]
  upcomingSessions: Session[]
}

export function SessionsPanel({ todaySessions, upcomingSessions }: SessionsPanelProps) {
  const router = useRouter()
  const hasTodaySessions = todaySessions.length > 0
  const hasUpcomingSessions = upcomingSessions.length > 0
  const hasAnySessions = hasTodaySessions || hasUpcomingSessions
  
  return (
    <section className="space-y-4">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold leading-none tracking-tight">Sessions</h2>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground p-6 space-y-4">
        {!hasAnySessions ? (
          // Both empty - single empty state
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No sessions scheduled</p>
            <Button size="sm" onClick={() => router.push('/sessions/new')}>
              Create Session
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Today Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">Today</h3>
                <Link href="/sessions" className="text-sm text-muted-foreground hover:text-foreground">
                  View all
                </Link>
              </div>
              {hasTodaySessions ? (
                <div className="space-y-3">
                  {todaySessions.map((session) => (
                    <SessionListItem key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-3">No sessions today</p>
                  <Button size="sm" variant="outline" onClick={() => router.push('/sessions/new')}>
                    Create Session
                  </Button>
                </div>
              )}
            </div>

            {/* Upcoming Section - Only show if there are upcoming sessions */}
            {hasUpcomingSessions && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Upcoming</h3>
                <div className="space-y-3">
                  {upcomingSessions.slice(0, 3).map((session) => (
                    <SessionListItem key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
