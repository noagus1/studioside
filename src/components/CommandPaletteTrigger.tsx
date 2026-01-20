'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandPaletteTriggerProps {
  onOpen: () => void
  className?: string
}

/**
 * Command Palette Trigger Button
 * 
 * A clickable button that looks like a search input but opens the command palette.
 */
export function CommandPaletteTrigger({
  onOpen,
  className,
}: CommandPaletteTriggerProps) {
  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'w-full h-8 pl-8 pr-20 rounded-full',
          'text-sm text-left',
          'bg-background border border-border/50',
          'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
          'focus:border-border',
          'hover:border-border/80',
          'transition-colors',
          'cursor-pointer',
          'active:scale-[0.98]'
        )}
      >
        <span className="text-muted-foreground">Search everything...</span>
      </button>
      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-60 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </div>
  )
}
