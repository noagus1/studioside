'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { autoSelectStudio } from '@/actions/switchStudio'
import type { UserStudio } from '@/data/getUserStudios'

interface AutoSelectStudioProps {
  studios: UserStudio[]
}

/**
 * Client component that auto-selects a studio when none is selected.
 * Prioritizes owner > admin > member studios.
 * Uses useTransition for instant, non-blocking updates.
 * Shows a loading indicator while selecting the studio.
 */
export function AutoSelectStudio({ studios }: AutoSelectStudioProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSelecting, setIsSelecting] = React.useState(true)
  const hasSelectedRef = React.useRef(false)

  React.useEffect(() => {
    // Only run once
    if (hasSelectedRef.current) return
    hasSelectedRef.current = true

    // Call server action immediately
    autoSelectStudio().then((result) => {
      setIsSelecting(false)
      if ('success' in result) {
        // Use startTransition for non-blocking refresh
        startTransition(() => {
          router.refresh()
        })
      }
    })
  }, [router])

  // Show loading indicator while selecting studio
  if (isSelecting || isPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your studio...</p>
        </div>
      </div>
    )
  }

  // Don't render anything once selection is complete
  return null
}
