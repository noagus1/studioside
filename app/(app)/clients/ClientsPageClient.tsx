'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Users, ChevronRight, Pin } from 'lucide-react'
import { PageContainer, PageColumns, MainColumn } from '@/components/layout/PageColumns'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Client } from './actions'
import { CreateClientSheet } from './components/CreateClientSheet'

interface ClientsPageClientProps {
  clients: Client[]
}

const ROLE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'staff', label: 'Staff' },
] as const

type RoleFilter = (typeof ROLE_FILTERS)[number]['id']

function getClientRole(client: Client): RoleFilter {
  const options = ROLE_FILTERS.filter((role) => role.id !== 'all')
  if (!client?.name) return 'staff'
  if (options.length === 0) return 'staff'

  const hash = Array.from(client.name).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const index = hash % options.length

  return (options[index]?.id as RoleFilter) ?? 'staff'
}

function formatRoleLabel(role: RoleFilter) {
  const match = ROLE_FILTERS.find((option) => option.id === role)
  return match?.label ?? 'Staff'
}

function getClientInitials(name: string) {
  const fromName = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)

  if (fromName) return fromName.toUpperCase()
  return '?'
}

export function ClientsPageClient({ clients }: ClientsPageClientProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = React.useState('')
  const [clientList, setClientList] = React.useState<Client[]>(clients)
  const [createClientOpen, setCreateClientOpen] = React.useState(false)
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>('all')

  const handleClientCreated = React.useCallback(
    (client: Client) => {
      setClientList((prev) => [client, ...prev])
    },
    [setClientList]
  )

  const filteredClients = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim()

    return clientList.filter((client) => {
      const matchesTerm = !term || client.name.toLowerCase().includes(term)
      const matchesRole = roleFilter === 'all' || getClientRole(client) === roleFilter
      return matchesTerm && matchesRole
    })
  }, [clientList, searchTerm, roleFilter])

  const clientCount = clientList.length

  return (
    <PageContainer className="max-w-5xl">
      <PageColumns variant="single">
        <MainColumn className="space-y-10">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Artists</h1>
              <Button type="button" onClick={() => setCreateClientOpen(true)}>
                <Plus className="h-4 w-4" />
                New artist
              </Button>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search artists…"
                  className="h-9 border-0 bg-muted pl-9 text-sm placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2">
            {ROLE_FILTERS.map((role) => {
              const isActive = roleFilter === role.id
              return (
                <React.Fragment key={role.id}>
                  <button
                    type="button"
                    onClick={() => setRoleFilter(role.id === roleFilter ? 'all' : role.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-transparent bg-muted/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    }`}
                  >
                    <span>{role.label}</span>
                  </button>
                  {role.id === 'all' && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition border-transparent bg-muted/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    >
                      <Pin className="h-4 w-4" />
                      <span>Pinned</span>
                    </button>
                  )}
                </React.Fragment>
              )
            })}
          </div>

          <div className="overflow-hidden rounded-lg border bg-card">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Users className="h-5 w-5" />
                </div>
                <p className="font-medium text-foreground">No artists yet.</p>
                <p className="mt-1 text-sm">
                  Add the artists you collaborate with.
                </p>
                <div className="mt-4">
                  <Button type="button" onClick={() => setCreateClientOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add artist
                  </Button>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Last session</th>
                    <th className="px-4 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => {
                    const role = getClientRole(client)
                    return (
                      <tr
                        key={client.id}
                        className="group cursor-pointer transition hover:bg-muted/60"
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/clients/${client.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            router.push(`/clients/${client.id}`)
                          }
                        }}
                      >
                        <td className="px-4 py-3">
                          <Link href={`/clients/${client.id}`} className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-muted text-muted-foreground">
                                {getClientInitials(client.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium leading-none">{client.name}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {formatRoleLabel(role)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">—</td>
                        <td className="px-4 py-3 text-right pr-5">
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <CreateClientSheet
            open={createClientOpen}
            onOpenChange={setCreateClientOpen}
            onClientCreated={handleClientCreated}
          />
        </MainColumn>
      </PageColumns>
    </PageContainer>
  )
}


