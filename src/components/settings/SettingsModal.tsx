'use client'

import * as React from 'react'
import { Sliders, Cog, Users, CircleUser, DoorOpen } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSettingsModal, type SettingsSection } from './SettingsModalContext'
import AccountSection from './sections/AccountSection'
import GeneralSection from './sections/GeneralSection'
import PreferencesSection from './sections/PreferencesSection'
import TeamSection from './sections/TeamSection'
import RoomsSection from './sections/RoomsSection'
import type { MembershipRole } from '@/types/db'
import type { UserProfile } from '@/data/getUserProfile'
import type { UserSettingsData } from '@/actions/getUserSettings'

const allSections: Array<{
  id: SettingsSection
  label: string
  icon: React.ComponentType<{ className?: string }>
  category?: string
  title: string
}> = [
  { id: 'profile', label: '', icon: CircleUser, category: 'Account', title: 'Account' },
  { id: 'studio', label: 'General', icon: Cog, category: 'Studio', title: 'General' },
  { id: 'account', label: 'Preferences', icon: Sliders, category: 'Studio', title: 'Preferences' },
  { id: 'rooms', label: 'Rooms', icon: DoorOpen, category: 'Studio', title: 'Rooms' },
  { id: 'team', label: 'Members', icon: Users, category: 'Studio', title: 'Members' },
]

// Helper to get section title
function getSectionTitle(sectionId: SettingsSection, userProfile?: UserProfile | null): string {
  const section = allSections.find(s => s.id === sectionId)
  // For profile section, always show "Account" in the header (sidebar shows user's name)
  if (sectionId === 'profile') {
    return 'Account'
  }
  return section?.title || 'Settings'
}

// Helper to get user initials
function getInitials(name: string | null): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function SectionContent({ section, userRole, userProfile, userSettings }: { section: SettingsSection; userRole: MembershipRole | null; userProfile?: UserProfile | null; userSettings?: UserSettingsData | null }) {
  switch (section) {
    case 'profile':
      return <AccountSection userSettings={userSettings} />
    case 'account':
      return <PreferencesSection userRole={userRole} />
    case 'studio':
      return <GeneralSection userRole={userRole} />
    case 'rooms':
      return <RoomsSection userRole={userRole} />
    case 'team':
      return (
        <TeamSection
          isAdmin={userRole === 'owner' || userRole === 'admin'}
          currentRole={userRole}
        />
      )
    default:
      return <GeneralSection userRole={userRole} />
  }
}

interface SettingsModalProps {
  userRole: MembershipRole | null
  userProfile?: UserProfile | null
  userSettings?: UserSettingsData | null
}

export default function SettingsModal({ userRole, userProfile, userSettings }: SettingsModalProps) {
  const { isOpen, closeSettingsModal, selectedSection, setSelectedSection } = useSettingsModal()

  const sections = allSections

  return (
    <Dialog open={isOpen} onOpenChange={closeSettingsModal}>
      <DialogContent className="max-w-4xl h-[90vh] max-h-[900px] p-0 flex [&>button]:!block [&>button]:absolute [&>button]:right-4 [&>button]:top-4 [&>button]:text-muted-foreground [&>button]:hover:text-foreground [&>button]:z-10">
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Sidebar - Full Height */}
          <div className="w-60 border-r bg-muted/30 flex-shrink-0 flex flex-col h-full">
            <nav className="px-2 py-3 space-y-4 overflow-y-auto flex-1">
              {['Account', 'Studio'].map((category) => {
                const categorySections = sections.filter((s) => s.category === category)
                if (categorySections.length === 0) return null
                
                return (
                  <div key={category}>
                    <div className="px-2 py-0 text-xs font-semibold text-muted-foreground/60">
                      {category}
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {categorySections.map((section) => {
                        const Icon = section.icon
                        const isActive = selectedSection === section.id
                        // For profile section, show user's name instead of label
                        const displayLabel = section.id === 'profile' 
                          ? (userProfile?.full_name || 'Account')
                          : section.label
                        return (
                          <button
                            key={section.id}
                            onClick={() => setSelectedSection(section.id)}
                            className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-muted text-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            {section.id === 'profile' ? (
                              <div className="h-4 w-4 shrink-0 flex items-center justify-center">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.full_name || ''} />
                                  <AvatarFallback className="bg-white dark:bg-slate-700 text-[10px] leading-none shadow-sm">
                                    {getInitials(userProfile?.full_name || null)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            ) : (
                              <Icon className="h-4 w-4" />
                            )}
                            <span>{displayLabel}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </nav>
          </div>

          {/* Right Content Panel */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Centralized Header */}
            <div className="flex-shrink-0">
              <div className="pt-6 pb-4 pl-10">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium">{getSectionTitle(selectedSection, userProfile)}</h2>
                  {selectedSection === 'account' && userRole !== 'owner' && userRole !== 'admin' && (
                    <span className="text-sm text-muted-foreground">(View only)</span>
                  )}
                  {selectedSection === 'rooms' && userRole !== 'owner' && userRole !== 'admin' && (
                    <span className="text-sm text-muted-foreground">(View only)</span>
                  )}
                </div>
              </div>
              <div className="pl-10 pr-10 border-b"></div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {sections.some((s) => s.id === selectedSection) ? (
                <SectionContent section={selectedSection} userRole={userRole} userProfile={userProfile} userSettings={userSettings} />
              ) : (
                <SectionContent section="account" userRole={userRole} userProfile={userProfile} userSettings={userSettings} />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

