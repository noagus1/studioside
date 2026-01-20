'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Users, Clock, ArrowUpRight, CalendarPlus } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { getSearchData } from '@/actions/searchData'
import type { Client, Session } from '../../app/(app)/sessions/actions'
import type { Gear } from '../../app/(app)/gear/actions'
import { getCategoryIconByKey } from '../../app/(app)/gear/categoryIcons'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ResultItem =
  | {
      kind: 'client'
      id: string
      title: string
      subtitle: string
      destination: string
      onSelect: () => void
    }
  | {
      kind: 'session'
      id: string
      title: string
      subtitle: string
      destination: string
      onSelect: () => void
    }
  | {
      kind: 'gear'
      id: string
      title: string
      subtitle: string
      destination: string
      onSelect: () => void
      Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    }

const formatSessionTime = (startTime: string) => {
  try {
    const date = new Date(startTime)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return startTime
  }
}

const getGearName = (gear: Gear) => {
  const parts = [gear.brand, gear.model, gear.type?.name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Unnamed Gear'
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [searchData, setSearchData] = React.useState<{
    clients: Client[]
    sessions: Session[]
    gear: Gear[]
  } | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [query, setQuery] = React.useState('')

  const handleNewSession = React.useCallback(() => {
    onOpenChange(false)
    // Avoid any portal/unmount timing issues
    setTimeout(() => {
      router.push('/sessions/new')
    }, 0)
  }, [onOpenChange, router])

  // Reset query when palette closes
  React.useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  React.useEffect(() => {
    if (open && !searchData) {
      setLoading(true)
      getSearchData()
        .then((result) => {
          if ('success' in result) {
            setSearchData({
              clients: result.clients,
              sessions: result.sessions,
              gear: result.gear,
            })
          }
        })
        .catch((error) => {
          console.error('Failed to fetch search data:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [open, searchData])

  const resultItems: ResultItem[] = React.useMemo(() => {
    if (!searchData) return []

    const clients: ResultItem[] = searchData.clients.map((client) => ({
      kind: 'client',
      id: client.id,
      title: client.name,
      subtitle: 'Person',
      destination: 'Artists',
      onSelect: () => {
        router.push(`/clients/${client.id}`)
        onOpenChange(false)
      },
    }))

    const sessions: ResultItem[] = searchData.sessions.slice(0, 10).map((session) => ({
      kind: 'session',
      id: session.id,
      title: session.client?.name || 'Session',
      subtitle: formatSessionTime(session.start_time),
      destination: 'Session',
      onSelect: () => {
        router.push(`/sessions/${session.id}`)
        onOpenChange(false)
      },
    }))

    const gear: ResultItem[] = searchData.gear.slice(0, 10).map((item) => {
      const Icon = getCategoryIconByKey(item.type?.icon_key, item.type?.name)
      return {
        kind: 'gear',
        id: item.id,
        title: getGearName(item),
        subtitle: item.type?.name || 'Gear',
        destination: 'Gear',
        Icon,
        onSelect: () => {
          router.push(`/gear/${item.id}`)
          onOpenChange(false)
        },
      }
    })

    return [...clients, ...sessions, ...gear]
  }, [searchData, router, onOpenChange])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search the studio" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandItem
          forceMount
          value="New Session"
          onSelect={handleNewSession}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground bg-transparent hover:bg-muted data-[selected=true]:bg-transparent data-[selected=true]:text-foreground data-[selected=true]:hover:bg-muted aria-selected:bg-transparent aria-selected:text-foreground focus-visible:ring-0"
        >
          <CalendarPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            <span className="truncate text-sm font-normal text-foreground">New Session</span>
            <CommandShortcut className="ml-auto">⌘ N</CommandShortcut>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </CommandItem>

        {query.length === 0 ? null : (
          <>
            <CommandSeparator />
            <CommandEmpty>{loading ? 'Loading...' : 'No results found.'}</CommandEmpty>
            {resultItems.map((item) => (
              <CommandItem
                key={`${item.kind}-${item.id}`}
                value={`${item.title} ${item.subtitle}`}
                onSelect={item.onSelect}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground bg-transparent hover:bg-muted data-[selected=true]:bg-transparent data-[selected=true]:text-foreground data-[selected=true]:hover:bg-muted aria-selected:bg-transparent aria-selected:text-foreground focus-visible:ring-0"
              >
                {item.kind === 'client' && (
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                {item.kind === 'session' && (
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                {item.kind === 'gear' && 'Icon' in item && item.Icon && (
                  <item.Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="flex flex-1 items-center gap-2 overflow-hidden">
                  <span className="truncate text-sm font-normal text-foreground">{item.title}</span>
                  <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="truncate rounded-full bg-muted/60 px-2 py-[3px] leading-none">
                      {item.subtitle}
                    </span>
                    <span className="truncate rounded-full bg-muted/40 px-2 py-[3px] leading-none">
                      {item.destination}
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CommandItem>
            ))}
          </>
        )}
      </CommandList>
      <div className="flex items-center justify-center gap-1 border-t border-border/60 px-4 py-3 text-[11px] text-muted-foreground/80">
        <span className="font-medium tracking-wide">⌘</span>
        <span className="font-medium tracking-wide">K</span>
        <span className="text-muted-foreground/80">Command Search</span>
      </div>
    </CommandDialog>
  )
}
