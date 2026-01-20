'use client'

import { CommandPaletteTrigger } from './CommandPaletteTrigger'
import { useCommandPalette } from './CommandPaletteProvider'

/**
 * Command Palette Header Component
 * 
 * Client component that renders the search trigger in the header.
 * Must be a separate client component since the layout is a server component.
 */
export function CommandPaletteHeader() {
  const { openPalette } = useCommandPalette()

  return <CommandPaletteTrigger onOpen={openPalette} />
}
