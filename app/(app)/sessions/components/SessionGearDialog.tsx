'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Check, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  addSessionResource,
  getSessionResources,
  removeSessionResource,
  type SessionResourceWarning,
} from '../actions'
import { getGear, type Gear } from '../../gear/actions'
import type { Session, SessionResource } from '@/types/session'
import { getCategoryIconByKey } from '../../gear/categoryIcons'

type GearLike =
  | (Partial<Omit<Gear, 'quantity'>> & { id?: string | null; quantity?: number | null })
  | SessionResource['gear']

interface SessionGearDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: Session
  onUpdated?: (resources?: SessionResource[]) => void
  onResourcesChange?: (resources: SessionResource[]) => void
}

const CATEGORY_ORDER = ['Microphones', 'Interfaces', 'Instruments', 'Controllers', 'Outboard', 'Misc'] as const
type GearCategory = (typeof CATEGORY_ORDER)[number]

export function computeGearLabel(item: GearLike | null | undefined) {
  if (!item) return 'Gear'
  const parts = [item.brand, item.model].filter(Boolean).join(' ').trim()
  if (parts) return parts
  const base = item.type?.name || 'Gear'
  const suffix = item.id ? ` · ${item.id.slice(0, 6)}` : ''
  return `${base}${suffix}`
}

export function GearListDisplay({ gear, className }: { gear?: GearLike | null; className?: string }) {
  const GearIcon = getCategoryIconByKey(gear?.type?.icon_key, gear?.type?.name)
  const primary = computeGearLabel(gear)
  const secondary = gear?.type?.name || 'Misc'

  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <GearIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{primary}</p>
        <p className="truncate text-xs text-muted-foreground">{secondary}</p>
      </div>
    </div>
  )
}

export function SessionGearDialog({
  open,
  onOpenChange,
  session,
  onUpdated,
  onResourcesChange,
}: SessionGearDialogProps) {
  const [resources, setResources] = React.useState<SessionResource[]>(
    session.gear_items || session.resources || []
  )
  const [gear, setGear] = React.useState<Gear[]>([])
  const [loadingGear, setLoadingGear] = React.useState(false)
  const [loadingResources, setLoadingResources] = React.useState(false)
  const [pendingGearId, setPendingGearId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')

  const handleWarnings = React.useCallback((warnings?: SessionResourceWarning[]) => {
    warnings?.forEach((warning) => {
      toast.warning(warning.message)
    })
  }, [])

  const refreshResources = React.useCallback(async () => {
    setLoadingResources(true)
    try {
      const result = await getSessionResources(session.id)
      if ('success' in result && result.success) {
        const nextResources = result.gear || result.resources || []
        setResources(nextResources)
        handleWarnings(result.warnings)
        setError(null)
      } else {
        setError('error' in result ? result.message : 'Failed to load resources')
        toast.error('error' in result ? result.message : 'Failed to load resources')
      }
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Failed to load resources'
      setError(message)
      toast.error(message)
    } finally {
      setLoadingResources(false)
    }
  }, [handleWarnings, session.id])

  const loadGear = React.useCallback(async () => {
    setLoadingGear(true)
    try {
      const result = await getGear()
      if ('success' in result && result.success) {
        setGear(result.gear)
      } else {
        toast.error('error' in result ? result.message : 'Failed to load gear')
        setGear([])
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load gear')
      setGear([])
    } finally {
      setLoadingGear(false)
    }
  }, [])

  React.useEffect(() => {
    if (open) {
      void loadGear()
      void refreshResources()
      setError(null)
    }
  }, [loadGear, open, refreshResources])

  const gearLabel = (id: string) => {
    const g = gear.find((item) => item.id === id)
    if (!g) return ''
    return computeGearLabel(g)
  }

  const resolveCategory = (item: Gear): GearCategory => {
    const typeName = item.type?.name?.toLowerCase() || ''
    if (typeName.includes('mic')) return 'Microphones'
    if (typeName.includes('interface')) return 'Interfaces'
    if (typeName.includes('instrument')) return 'Instruments'
    if (typeName.includes('controller')) return 'Controllers'
    if (typeName.includes('outboard')) return 'Outboard'
    return 'Misc'
  }

  const filteredGear = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return gear
    return gear.filter((g) => {
      const label = computeGearLabel(g).toLowerCase()
      const typeName = g.type?.name?.toLowerCase() || ''
      return label.includes(term) || typeName.includes(term)
    })
  }, [gear, search])

  const groupedGear = React.useMemo(() => {
    const groups: Record<GearCategory, Gear[]> = {
      Microphones: [],
      Interfaces: [],
      Instruments: [],
      Controllers: [],
      Outboard: [],
      Misc: [],
    }
    filteredGear.forEach((item) => {
      const category = resolveCategory(item)
      groups[category].push(item)
    })
    const sortByName = (a: Gear, b: Gear) => computeGearLabel(a).localeCompare(computeGearLabel(b))
    CATEGORY_ORDER.forEach((cat) => groups[cat].sort(sortByName))
    return groups
  }, [filteredGear])

  const selectedIds = React.useMemo(() => new Set(resources.map((r) => r.gear_id)), [resources])

  const toggleSelection = async (gearId: string) => {
    setPendingGearId(gearId)
    setError(null)
    const exists = selectedIds.has(gearId)
    try {
      const result = exists
        ? await removeSessionResource(session.id, gearId)
        : await addSessionResource(session.id, { gear_id: gearId })

      if ('success' in result && result.success) {
        const nextResources = result.gear || result.resources || []
        setResources(nextResources)
        onResourcesChange?.(nextResources)
        onUpdated?.(nextResources)
        handleWarnings(result.warnings)
      } else {
        const message = 'error' in result ? result.message : 'Failed to update resources'
        setError(message)
        toast.error(message)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update resources'
      setError(message)
      toast.error(message)
    } finally {
      setPendingGearId(null)
    }
  }

  const renderGearRow = (item: Gear) => {
    const selected = selectedIds.has(item.id)
    const resource = resources.find((res) => res.gear_id === item.id)
    const isBusy = pendingGearId === item.id
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => toggleSelection(item.id)}
        disabled={loadingGear || loadingResources || isBusy}
        className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted ${selected ? 'bg-primary/5' : ''}`}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 text-muted-foreground'}`}
          aria-hidden
        >
          {selected && <Check className="h-3 w-3" />}
        </span>
        <GearListDisplay gear={item} className="flex-1" />
        {selected && (
          <span className="text-xs font-medium text-primary">
            {resource?.quantity && resource.quantity > 1 ? `x${resource.quantity}` : 'Added'}
          </span>
        )}
      </button>
    )
  }

  const renderCategory = (category: GearCategory, items: Gear[]) => {
    if (items.length === 0) return null
    return (
      <div key={category} className="rounded-lg border">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold text-foreground">{category}</p>
          <span className="text-xs text-muted-foreground">{items.length} item{items.length === 1 ? '' : 's'}</span>
        </div>
        <div className="divide-y">{items.map(renderGearRow)}</div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle>Add gear</DialogTitle>
          <DialogDescription>Select gear needed for this session.</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mt-3 bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">{error}</div>
        )}

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search gear (optional)"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={loadingGear}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredGear.length} item{filteredGear.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-3">
            {CATEGORY_ORDER.map((category) => renderCategory(category, groupedGear[category]))}
            {!loadingGear && filteredGear.length === 0 && (
              <div className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                No gear matches this search.
              </div>
            )}
          </div>

        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pendingGearId !== null || loadingResources || loadingGear}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
