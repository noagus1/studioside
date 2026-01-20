'use client'

import * as React from 'react'

type SettingsSection = 'profile' | 'account' | 'studio' | 'team' | 'rooms'

const VALID_SECTIONS: SettingsSection[] = ['profile', 'account', 'studio', 'team', 'rooms']

function isValidSection(section: string | null): section is SettingsSection {
  return VALID_SECTIONS.includes(section as SettingsSection)
}

interface SettingsModalContextType {
  isOpen: boolean
  selectedSection: SettingsSection
  openSettingsModal: (section?: SettingsSection) => void
  closeSettingsModal: () => void
  setSelectedSection: (section: SettingsSection) => void
}

const SettingsModalContext = React.createContext<SettingsModalContextType | undefined>(undefined)

const STORAGE_KEY_IS_OPEN = 'settings-modal-is-open'
const STORAGE_KEY_SECTION = 'settings-modal-section'

export function SettingsModalProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from localStorage
  const [isOpen, setIsOpen] = React.useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(STORAGE_KEY_IS_OPEN)
    return stored === 'true'
  })

  const [selectedSection, setSelectedSection] = React.useState<SettingsSection>(() => {
    if (typeof window === 'undefined') return 'account'
    const stored = localStorage.getItem(STORAGE_KEY_SECTION)
    return isValidSection(stored) ? stored : 'account'
  })

  // Persist isOpen to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_IS_OPEN, String(isOpen))
    }
  }, [isOpen])

  // Persist selectedSection to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SECTION, selectedSection)
    }
  }, [selectedSection])

  const openSettingsModal = React.useCallback((section?: SettingsSection) => {
    if (section) {
      setSelectedSection(section)
    }
    setIsOpen(true)
  }, [])

  const closeSettingsModal = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSetSelectedSection = React.useCallback((section: SettingsSection) => {
    setSelectedSection(section)
  }, [])

  return (
    <SettingsModalContext.Provider
      value={{
        isOpen,
        selectedSection,
        openSettingsModal,
        closeSettingsModal,
        setSelectedSection: handleSetSelectedSection,
      }}
    >
      {children}
    </SettingsModalContext.Provider>
  )
}

export function useSettingsModal() {
  const context = React.useContext(SettingsModalContext)
  if (context === undefined) {
    throw new Error('useSettingsModal must be used within a SettingsModalProvider')
  }
  return context
}

export type { SettingsSection }

