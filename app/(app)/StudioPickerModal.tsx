'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { UserStudio } from '@/data/getUserStudios'
import { switchStudio } from '@/actions/switchStudio'

interface StudioPickerModalProps {
  studios: UserStudio[]
}

export default function StudioPickerModal({ studios }: StudioPickerModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = (studioId: string) => {
    setError(null)
    setSelectedId(studioId)
    startTransition(() => {
      switchStudio(studioId).then((result) => {
        if ('error' in result) {
          setError(result.message)
          setSelectedId(null)
          return
        }
        router.refresh()
      })
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 px-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-lg">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Select a studio</h1>
          <p className="text-sm text-muted-foreground">
            Choose which studio you want to open.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {studios.map((studio) => (
            <button
              key={studio.studios.id}
              type="button"
              onClick={() => handleSelect(studio.studios.id)}
              disabled={isPending && selectedId === studio.studios.id}
              className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left transition hover:border-primary/60 disabled:opacity-60"
            >
              <span className="font-medium">{studio.studios.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{studio.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
