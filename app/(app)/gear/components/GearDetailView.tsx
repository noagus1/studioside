'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GearDetailForm } from './GearDetailForm'
import type { Gear, GearType } from '../actions'

function getDisplayTitle(gear: Gear) {
  return gear.model?.trim() || gear.brand?.trim() || gear.type?.name || 'Gear'
}

export function GearDetailView({ gear, gearTypes }: { gear: Gear; gearTypes?: GearType[] }) {
  const router = useRouter()
  const [mode, setMode] = React.useState<'view' | 'edit'>('view')
  const [currentGear, setCurrentGear] = React.useState<Gear>(gear)

  const handleSaved = (updated: Gear) => {
    setCurrentGear(updated)
    setMode('view')
  }

  if (mode === 'edit') {
    return (
      <div className="space-y-6">
        <GearDetailForm
          gear={currentGear}
          gearTypes={gearTypes}
          onSaved={handleSaved}
          onDeleted={() => router.push('/gear')}
          onCancel={() => setMode('view')}
        />
      </div>
    )
  }

  const title = getDisplayTitle(currentGear)
  const subtitleParts: string[] = []
  if (currentGear.model && title !== currentGear.model) {
    subtitleParts.push(currentGear.model)
  }
  if (currentGear.brand && currentGear.brand !== title) {
    subtitleParts.push(currentGear.brand)
  }
  if (currentGear.type?.name) {
    subtitleParts.push(currentGear.type.name)
  }
  const subtitle = subtitleParts.filter(Boolean).join(' • ')
  const quantity = Number.isFinite(currentGear.quantity) ? Math.max(currentGear.quantity, 0) : 1

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/gear')}
            aria-label="Back to gear"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <Button onClick={() => setMode('edit')}>Edit</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Overview</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium">{currentGear.type?.name || 'Uncategorized'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Brand</span>
              <span className="font-medium">{currentGear.brand || '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Model</span>
              <span className="font-medium">{currentGear.model || '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium">×{quantity}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Metadata</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">
                {currentGear.created_at ? new Date(currentGear.created_at).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Updated</span>
              <span className="font-medium">
                {currentGear.updated_at ? new Date(currentGear.updated_at).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

