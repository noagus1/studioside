'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Calendar, AudioLines, FileText, LayoutGrid, Building2, Clock } from 'lucide-react'
import { MusicMicrophoneIcon } from '@/components/icons/MusicMicrophone'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import LogoHeaderButtonSidebar from '@/components/LogoHeaderButtonSidebar'
import AccountPopover from '@/components/AccountPopover'
import { useCommandPalette } from '@/components/CommandPaletteProvider'
import type { UserProfile } from '@/data/getUserProfile'
import type { MembershipRole } from '@/types/db'

type Props = {
  user: UserProfile
  role: MembershipRole | null
}

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>

type SidebarLinkItem = {
  title: string
  url: string
  icon: IconComponent
}

type SidebarActionItem = {
  title: string
  action: 'commandPalette'
  icon: IconComponent
  shortcut?: string
}

type SidebarGroupItem = SidebarLinkItem | SidebarActionItem

type SidebarGroupConfig = {
  label: string
  items: SidebarGroupItem[]
}

function isActionItem(item: SidebarGroupItem): item is SidebarActionItem {
  return 'action' in item
}

/**
 * Client-side sidebar rendering with sticky header/footer.
 */
export default function AppSidebarClient({ user, role }: Props) {
  const pathname = usePathname()
  const safePathname = pathname ?? ''
  const searchParams = useSearchParams()
  const { openPalette } = useCommandPalette()

  const groups: SidebarGroupConfig[] = [
    {
      label: 'Navigation',
      items: [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
        { title: 'Calendar', url: '/calendar', icon: Calendar },
        { title: 'Sessions', url: '/sessions', icon: Clock },
      ],
    },
    {
      label: 'Manage',
      items: [
        { title: 'Artists', url: '/clients', icon: MusicMicrophoneIcon },
        { title: 'Gear', url: '/gear', icon: AudioLines },
        { title: 'Invoices', url: '/invoices', icon: FileText },
        { title: 'Studio', url: '/studio?section=general', icon: Building2 },
      ],
    },
  ]

  return (
    <Sidebar>
      <SidebarHeader className="sticky top-0 z-10 bg-sidebar px-1.5 pt-1.5 pb-2 min-h-11 justify-start items-start">
        <LogoHeaderButtonSidebar />
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="px-2 pt-0 pb-2">
            <SidebarGroupLabel className="uppercase tracking-wide">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0">
                {group.items.map((item) => {
                  if (isActionItem(item)) {
                    const Icon = item.icon
                    const searchTooltip = item.shortcut ? `${item.title} (${item.shortcut})` : item.title

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton type="button" onClick={openPalette} tooltip={searchTooltip}>
                          {Icon ? <Icon strokeWidth={1.6} /> : null}
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                        {item.shortcut ? (
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-sm font-normal text-muted-foreground/70 opacity-0 transition-opacity duration-150 group-hover/menu-item:opacity-100">
                            {item.shortcut}
                          </span>
                        ) : null}
                      </SidebarMenuItem>
                    )
                  }

                  const Icon = item.icon
                  const [path, query] = item.url.split('?')
                  const matchesPath = safePathname === path || safePathname?.startsWith(`${path}/`)
                  const matchesSection = (() => {
                    if (!query) return true
                    const itemParams = new URLSearchParams(query)
                    const section = itemParams.get('section')
                    if (!section) return true
                    return searchParams?.get('section') === section
                  })()
                  const isActive = matchesPath && matchesSection

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={Boolean(isActive)}
                        className="data-[active=true]:bg-transparent data-[active=true]:text-foreground data-[active=true]:hover:bg-[color:var(--sidebar-hover)] data-[active=true]:hover:text-foreground"
                      >
                        <Link href={item.url}>
                          {Icon ? <Icon strokeWidth={1.6} /> : null}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="sticky bottom-0 z-10 border-t border-border/60 bg-sidebar px-2 py-2">
        <AccountPopover user={user} role={role} />
      </SidebarFooter>
    </Sidebar>
  )
}
