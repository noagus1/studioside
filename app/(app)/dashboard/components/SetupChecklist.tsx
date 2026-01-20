'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StudioOverviewStats } from '../actions'

interface SetupChecklistProps {
  stats: StudioOverviewStats
}

interface ChecklistItem {
  id: string
  label: string
  href: string
  completed: boolean
}

export function SetupChecklist({ stats }: SetupChecklistProps) {
  const router = useRouter()

  const items: ChecklistItem[] = [
    {
      id: 'room',
      label: 'Add your first room',
      href: '/settings/rooms',
      completed: stats.roomsCount > 0,
    },
    {
      id: 'client',
      label: 'Create a client',
      href: '/clients',
      completed: stats.clientsCount > 0,
    },
    {
      id: 'gear',
      label: 'Add gear inventory',
      href: '/gear',
      completed: stats.gearCount > 0,
    },
    {
      id: 'session',
      label: 'Schedule a session',
      href: '/sessions/new',
      completed: stats.sessionsThisMonth > 0,
    },
  ]

  const allCompleted = items.every((item) => item.completed)

  // Don't show if all items are completed
  if (allCompleted) {
    return null
  }

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">Get Started</h3>
      <div className="bg-card border rounded-lg p-4">
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent transition-colors text-left"
            >
              {item.completed ? (
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  item.completed
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground'
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
