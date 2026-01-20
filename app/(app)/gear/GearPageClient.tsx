'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { LucideIcon } from 'lucide-react'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getGearWithFilters, type Gear, type GearFacetOptions, type GearType } from './actions'
import { DEFAULT_CATEGORY_OPTION, getCategoryDisplayName, getCategoryIconByKey } from './categoryIcons'

interface GearPageClientProps {
  initialGear: Gear[]
  initialFacets: GearFacetOptions
}

type SelectedTypeValue = 'all' | GearType['id']

type TypeOption = {
  id: SelectedTypeValue
  name: string
  icon: LucideIcon
}

function computeTypeCounts(gearItems: Gear[]) {
  return gearItems.reduce<Record<string, number>>((acc, gear) => {
    if (gear.type_id) {
      const quantity = Number.isFinite(gear.quantity) ? Math.max(gear.quantity, 0) : 1
      acc[gear.type_id] = (acc[gear.type_id] || 0) + quantity
    }
    return acc
  }, {})
}

function getTypeLabel(gear: Gear) {
  if (gear.type?.name) return getCategoryDisplayName(gear.type.name)
  return 'Uncategorized'
}

function formatName(gear: Gear) {
  const parts: string[] = []
  if (gear.brand) parts.push(gear.brand)
  if (gear.model) parts.push(gear.model)

  if (parts.length === 0) return getTypeLabel(gear)
  return parts.join(' ')
}

function GearCategoryFilter({
  value,
  options,
  onChange,
}: {
  value: SelectedTypeValue
  options: TypeOption[]
  onChange: (value: SelectedTypeValue) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => {
        const isActive = value === option.id
        const Icon = option.icon || DEFAULT_CATEGORY_OPTION.icon

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id === value ? 'all' : option.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition ${
              isActive
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-transparent bg-muted/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{option.name}</span>
          </button>
        )
      })}
    </div>
  )
}

export function GearPageClient({ initialGear, initialFacets }: GearPageClientProps) {
  const router = useRouter()
  const [gearList, setGearList] = React.useState<Gear[]>(initialGear)
  const [facets] = React.useState<GearFacetOptions>(initialFacets)
  const [typeCounts, setTypeCounts] = React.useState<Record<string, number>>(
    computeTypeCounts(initialGear)
  )
  const [loading, setLoading] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedType, setSelectedType] = React.useState<SelectedTypeValue>('all')

  const refreshGear = React.useCallback(async (typeId: SelectedTypeValue) => {
    setLoading(true)
    try {
      const filters = typeId === 'all' ? {} : { types: [typeId] }
      const result = await getGearWithFilters(filters)
      if ('success' in result && result.success) {
        setGearList(result.gear)
        if (typeId === 'all') {
          setTypeCounts(computeTypeCounts(result.gear))
        }
      } else {
        toast.error('error' in result ? result.message : 'Failed to load gear')
      }
    } catch (error) {
      toast.error('Failed to load gear')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshCurrentCategory = React.useCallback(
    () => refreshGear(selectedType),
    [refreshGear, selectedType]
  )

  const handleCategoryChange = React.useCallback(
    (nextTypeId: SelectedTypeValue) => {
      const targetType = nextTypeId
      setSelectedType(targetType)
      refreshGear(targetType)
    },
    [refreshGear]
  )

  const handleAddGear = React.useCallback(() => {
    router.push('/gear/new')
  }, [router])

  const handleEditGear = (gearItem: Gear) => {
    router.push(`/gear/${gearItem.id}`)
  }

  const filteredGear = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim()

    return gearList
      .filter((gear) => {
        if (!term) return true

        const name = formatName(gear).toLowerCase()
        const typeName = getTypeLabel(gear).toLowerCase()

        return (
          name.includes(term) ||
          typeName.includes(term)
        )
      })
      .sort((a, b) => formatName(a).localeCompare(formatName(b)))
  }, [gearList, searchTerm])

  const typeOptions = React.useMemo<TypeOption[]>(() => {
    const typesArray = facets?.types || []
    const mapped = typesArray
      .map((type) => {
        if (!type?.id) return null
        const count = typeCounts[type.id] ?? 0
        if (count === 0) return null

        return {
          option: {
            id: type.id as SelectedTypeValue,
            name: getCategoryDisplayName(type?.name) || 'Unknown',
            icon: getCategoryIconByKey(type?.icon_key, type?.name),
          },
          count,
        }
      })
      .filter((value): value is { option: TypeOption; count: number } => Boolean(value))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.option.name.localeCompare(b.option.name)
      })
      .map(({ option }) => option)

    return [
      DEFAULT_CATEGORY_OPTION,
      ...mapped,
    ]
  }, [facets.types, typeCounts])

  React.useEffect(() => {
    if (selectedType === 'all') return
    const exists = typeOptions.some((option) => option.id === selectedType)
    if (!exists) {
      setSelectedType('all')
      refreshGear('all')
    }
  }, [selectedType, typeOptions, refreshGear])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Gear</h1>
          <p className="text-sm text-muted-foreground">Keep track of everything in the studio.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search…"
              className="h-9 border-0 bg-muted pl-9 text-sm placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <Button type="button" onClick={handleAddGear}>
            <Plus className="h-4 w-4" />
            Add Gear
          </Button>
        </div>
      </div>

      <GearCategoryFilter
        value={selectedType}
        options={typeOptions}
        onChange={handleCategoryChange}
      />

      {/* Loading state intentionally removed per request */}

      <div className="space-y-2">
        {filteredGear.length === 0 ? (
          <div className="rounded-md border bg-muted/40 p-6 text-center text-muted-foreground">
            <p className="font-medium text-foreground">No gear yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first piece of equipment to get started.
            </p>
            <div className="mt-4 flex justify-center">
              <Button type="button" onClick={handleAddGear}>
                <Plus className="h-4 w-4" />
                Add Gear
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="divide-y">
              {filteredGear.map((gear) => {
                const typeLabel = getTypeLabel(gear)
                const TypeIcon = getCategoryIconByKey(gear.type?.icon_key, gear.type?.name)
                const quantity = Number.isFinite(gear.quantity) ? Math.max(gear.quantity, 0) : 1

                return (
                  <div
                    key={gear.id}
                    className="group flex items-center gap-4 px-4 py-3 transition hover:bg-muted/50"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <Avatar className="h-9 w-9 border bg-muted">
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          <TypeIcon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium leading-none">{formatName(gear)}</p>
                          <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {typeLabel}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            ×{quantity}
                          </span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Gear actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => handleEditGear(gear)}>View Details</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
