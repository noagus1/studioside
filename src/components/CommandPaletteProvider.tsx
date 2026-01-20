'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CommandPalette } from './CommandPalette'

interface CommandPaletteContextType {
  open: boolean
  setOpen: (open: boolean) => void
  openPalette: () => void
  closePalette: () => void
}

const CommandPaletteContext = React.createContext<
  CommandPaletteContextType | undefined
>(undefined)

/**
 * Command Palette Provider
 * 
 * Manages the command palette state and keyboard shortcuts.
 * Should be rendered at the app level to enable Cmd+K globally.
 */
export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  const openPalette = React.useCallback(() => {
    setOpen(true)
  }, [])

  const closePalette = React.useCallback(() => {
    setOpen(false)
  }, [])

  // Listen for Cmd+K (or Ctrl+K on Windows/Linux)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
        return
      }

      // Cmd/Ctrl + N: open session builder (prevent browser new window)
      if (e.key.toLowerCase() === 'n' && (e.metaKey || e.ctrlKey)) {
        const target = e.target as HTMLElement | null
        const tag = target?.tagName
        const isEditable =
          target?.isContentEditable ||
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT'

        // Allow Cmd+N inside the command palette input, but avoid hijacking
        // keystrokes in normal form fields throughout the app.
        const isCmdkInput =
          (target as HTMLElement | null)?.hasAttribute?.('cmdk-input') ||
          !!(target as HTMLElement | null)?.closest?.('[cmdk-input]')

        if (isEditable && !isCmdkInput) return

        e.preventDefault()
        setOpen(false)
        router.push('/sessions/new')
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [router])

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      openPalette,
      closePalette,
    }),
    [open, openPalette, closePalette]
  )

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  )
}

/**
 * Hook to programmatically open the command palette
 */
export function useCommandPalette() {
  const context = React.useContext(CommandPaletteContext)
  if (context === undefined) {
    throw new Error(
      'useCommandPalette must be used within a CommandPaletteProvider'
    )
  }
  return context
}
