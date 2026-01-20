'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { switchStudio } from '@/actions/switchStudio'
import type { UserStudio } from '@/data/getUserStudios'

type Props = {
  studios: UserStudio[]
  currentStudioId: string | null
}

/**
 * Studio switcher dropdown.
 * Keeps it simple: change selection → server action → refresh.
 */
export default function StudioSwitcher({ studios, currentStudioId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedStudioId, setSelectedStudioId] = React.useState<string | ''>(
    currentStudioId ?? studios[0]?.studios.id ?? ''
  )

  const handleChange = (nextStudioId: string) => {
    setSelectedStudioId(nextStudioId)

    if (!nextStudioId || nextStudioId === currentStudioId) return

    startTransition(() => {
      switchStudio(nextStudioId).then((result) => {
        if ('success' in result) {
          router.refresh()
        } else {
          console.error('Failed to switch studio:', result.message)
        }
      })
    })
  }

  if (!studios || studios.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="min-w-[180px] rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={selectedStudioId}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
      >
        {studios.map((studio) => (
          <option key={studio.studios.id} value={studio.studios.id}>
            {studio.studios.name}
          </option>
        ))}
      </select>
      {isPending ? (
        <span className="text-xs text-muted-foreground">Switching...</span>
      ) : null}
    </div>
  )
}
