'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Client } from '../actions'

interface ClientComboboxProps {
  clients: Client[]
  value: { id: string | null; name: string }
  loading: boolean
  onInputChange: (value: string) => void
  onSelectExisting: (client: Client) => void
  onCreateNew: (name: string) => Promise<Client | null>
}

export function ClientCombobox({
  clients,
  value,
  loading,
  onInputChange,
  onSelectExisting,
  onCreateNew,
}: ClientComboboxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const ignoreNextCloseRef = React.useRef(false)
  const [open, setOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)

  const normalizedInput = value.name.trim().toLowerCase()
  const disabled = loading || creating

  const exactMatch = React.useMemo(() => {
    if (!normalizedInput) return null
    return clients.find((client) => client.name.toLowerCase() === normalizedInput) ?? null
  }, [clients, normalizedInput])

  React.useEffect(() => {
    if (exactMatch && value.id !== exactMatch.id) {
      onSelectExisting(exactMatch)
    }
  }, [exactMatch, onSelectExisting, value.id])

  const handleSelect = (client: Client) => {
    onSelectExisting(client)
    setOpen(false)
  }

  const handleCreate = async () => {
    if (!value.name.trim()) return
    setCreating(true)
    const created = await onCreateNew(value.name.trim())
    setCreating(false)
    if (created) {
      handleSelect(created)
    }
  }

  const filteredClients = React.useMemo(() => {
    return clients.filter((client) => client.name.toLowerCase().includes(normalizedInput))
  }, [clients, normalizedInput])

  const hasExactMatch = Boolean(exactMatch)

  return (
    <div className="space-y-2">
      <Popover
        modal={false}
        open={open}
        onOpenChange={(next) => {
          if (disabled) return
          const shouldIgnoreClose = !next && ignoreNextCloseRef.current
          if (shouldIgnoreClose) {
            ignoreNextCloseRef.current = false
            return
          }
          ignoreNextCloseRef.current = false
          setOpen(next)
        }}
      >
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              placeholder="Search or create client"
              value={value.name}
              onChange={(e) => onInputChange(e.target.value)}
              onFocus={() => {
                if (disabled) return
                ignoreNextCloseRef.current = true
                setOpen(true)
              }}
              onClick={() => {
                if (disabled) return
                ignoreNextCloseRef.current = true
                setOpen(true)
              }}
              onKeyDown={async (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
                  // Ensure select-all still works when the combobox is inside popovers/portals
                  e.preventDefault()
                  e.stopPropagation()
                  inputRef.current?.select()
                  return
                }
                if (e.key === 'ArrowDown') {
                  setOpen(true)
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  onInputChange('')
                  setOpen(true)
                  inputRef.current?.focus()
                  return
                }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (exactMatch) {
                    handleSelect(exactMatch)
                    return
                  }
                  await handleCreate()
                }
              }}
              className="pr-20"
              disabled={disabled}
            />
            <div className="absolute inset-y-0 right-2 flex items-center gap-1 text-muted-foreground">
              {hasExactMatch && !loading && !creating ? (
                <Check
                  className="h-4 w-4 text-emerald-500"
                  aria-label="Existing client match"
                />
              ) : null}
              {loading || creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {value.name && !loading && !creating && (
                <button
                  type="button"
                  aria-label="Clear client"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 leading-none"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    ignoreNextCloseRef.current = true
                  }}
                  onClick={() => {
                    ignoreNextCloseRef.current = true
                    onInputChange('')
                    setOpen(true)
                    inputRef.current?.focus()
                  }}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {!value.name && (
                <button
                  type="button"
                  aria-label={open ? 'Close client list' : 'Open client list'}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 leading-none"
                  onMouseDown={(e) => {
                    if (disabled) return
                    e.preventDefault()
                    e.stopPropagation()
                    ignoreNextCloseRef.current = true
                  }}
                  onClick={(e) => {
                    if (disabled) return
                    e.stopPropagation()
                    setOpen((prev) => {
                      const next = !prev
                      ignoreNextCloseRef.current = next
                      if (next) {
                        inputRef.current?.focus()
                      }
                      return next
                    })
                  }}
                  disabled={disabled}
                >
                  <ChevronsUpDown className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[min(420px,calc(100vw-2rem))] p-0"
          sideOffset={6}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Command
            shouldFilter={false}
            className="border border-border/60 bg-card/95 shadow-sm [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground/80"
          >
            <CommandList className="max-h-64 p-2">
              <CommandEmpty className="flex flex-col gap-2 rounded-md bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
                <span>{normalizedInput ? 'No matches' : 'No clients yet'}</span>
                {normalizedInput && (
                  <span className="text-xs text-muted-foreground/90">
                    Press Enter to add “{value.name.trim() || 'New client'}” as a new client
                  </span>
                )}
              </CommandEmpty>

              {filteredClients.length > 0 && (
                <CommandGroup>
                  {filteredClients.map((client) => (
                    <CommandItem key={client.id} onSelect={() => handleSelect(client)}>
                      <span className="truncate">{client.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
