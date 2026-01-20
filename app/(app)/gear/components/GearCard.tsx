'use client'

import * as React from 'react'
import { Music, Trash2, Edit, Mic, Guitar, Headphones, Volume2, Piano, Radio, Zap, Monitor, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type Gear } from '../actions'

interface GearCardProps {
  gear: Gear
  onEdit: (gear: Gear) => void
  onDelete: (gearId: string) => void
  isDeleting?: boolean
}

export function GearCard({ gear, onEdit, onDelete, isDeleting }: GearCardProps) {

  // Helper function to get type-specific icon
  const getTypeIcon = (typeName: string | null | undefined) => {
    if (!typeName) return Music
    
    const categoryLower = typeName.toLowerCase()
    
    if (categoryLower.includes('microphone') || categoryLower.includes('mic')) {
      return Mic
    }
    if (categoryLower.includes('guitar') || categoryLower.includes('bass') || categoryLower.includes('string')) {
      return Guitar
    }
    if (categoryLower.includes('piano') || categoryLower.includes('keyboard') || categoryLower.includes('keys')) {
      return Piano
    }
    if (categoryLower.includes('headphone') || categoryLower.includes('headset')) {
      return Headphones
    }
    if (categoryLower.includes('speaker') || categoryLower.includes('monitor') || categoryLower.includes('playback')) {
      return Volume2
    }
    if (categoryLower.includes('audio interface') || categoryLower.includes('interface') || categoryLower.includes('preamp')) {
      return Radio
    }
    if (categoryLower.includes('power') || categoryLower.includes('amp') || categoryLower.includes('amplifier')) {
      return Zap
    }
    if (categoryLower.includes('screen') || categoryLower.includes('display') || categoryLower.includes('tv')) {
      return Monitor
    }
    if (categoryLower.includes('camera') || categoryLower.includes('video')) {
      return Camera
    }
    
    // Default fallback
    return Music
  }

  // Helper function to format gear display name
  const getGearDisplayName = (g: Gear): string => {
    const parts: string[] = []
    if (g.brand) parts.push(g.brand)
    if (g.model) parts.push(g.model)
    if (parts.length === 0) {
      return g.type?.name || 'Unnamed Gear'
    }
    return parts.join(' ')
  }

  const displayName = getGearDisplayName(gear)

  return (
    <div
      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => onEdit(gear)}
    >
      <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-muted rounded-md border">
        {(() => {
          const IconComponent = getTypeIcon(gear.type?.name)
          return <IconComponent className="h-8 w-8 text-muted-foreground" />
        })()}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-base">{displayName}</div>
            {gear.type?.name && (
              <div className="text-sm text-muted-foreground mt-0.5">{gear.type.name}</div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-start gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(gear)}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(gear.id)}
          disabled={isDeleting}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

