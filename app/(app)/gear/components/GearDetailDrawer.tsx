'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Save, Trash2, Plus } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createGear, updateGear, deleteGear, type Gear, type GearType } from '../actions'

interface GearDetailDrawerProps {
  gear: Gear | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onGearUpdated?: () => void
  onGearDeleted?: (gearId: string) => void
  onGearAdded?: (gear: Gear) => void
  gearTypes?: GearType[]
}

export function GearDetailDrawer({
  gear,
  open,
  onOpenChange,
  onGearUpdated,
  onGearDeleted,
  onGearAdded,
  gearTypes,
}: GearDetailDrawerProps) {
  const isAddMode = gear === null
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const safeGearTypes = Array.isArray(gearTypes) ? gearTypes : []

  // Form state
  const [typeId, setTypeId] = React.useState<string>('')
  const [brand, setBrand] = React.useState('')
  const [model, setModel] = React.useState('')
  const [quantity, setQuantity] = React.useState('1')

  // Reset form when gear changes or drawer opens/closes
  React.useEffect(() => {
    if (gear) {
      // Edit mode: populate form with gear data
      setTypeId(gear.type_id || '')
      setBrand(gear.brand || '')
      setModel(gear.model || '')
      setQuantity(String(gear.quantity ?? 1))
    } else if (open && isAddMode) {
      // Add mode: reset form to defaults
      setTypeId('')
      setBrand('')
      setModel('')
      setQuantity('1')
    }
  }, [gear, open, isAddMode])

  const handleSave = async () => {
    if (!brand.trim() || !model.trim()) {
      toast.error('Brand and model are required')
      return
    }

    const parsedQuantity = Number.parseInt(quantity, 10)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      toast.error('Quantity must be 0 or greater')
      return
    }

    setSaving(true)

    try {
      if (isAddMode) {
        // Create new gear
        const result = await createGear({
          type_id: typeId || null,
          brand: brand.trim(),
          model: model.trim(),
          quantity: parsedQuantity,
        })

        if ('success' in result && result.success) {
          toast.success('Gear added successfully')
          onGearAdded?.(result.gear)
          onOpenChange(false)
        } else {
          toast.error('error' in result ? result.message : 'Failed to add gear')
        }
      } else {
        // Update existing gear
        if (!gear) return

        const result = await updateGear(gear.id, {
          type_id: typeId || null,
          brand: brand.trim(),
          model: model.trim(),
          quantity: parsedQuantity,
        })

        if ('success' in result && result.success) {
          toast.success('Gear updated successfully')
          onGearUpdated?.()
          onOpenChange(false)
        } else {
          toast.error('error' in result ? result.message : 'Failed to update gear')
        }
      }
    } catch (error) {
      toast.error(isAddMode ? 'Failed to add gear' : 'Failed to update gear')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!gear || isAddMode) return

    if (!confirm('Are you sure you want to delete this gear item? This action cannot be undone.')) {
      return
    }

    setDeleting(true)

    try {
      const result = await deleteGear(gear.id)
      if ('success' in result && result.success) {
        toast.success('Gear deleted successfully')
        onGearDeleted?.(gear.id)
        onOpenChange(false)
      } else {
        toast.error('error' in result ? result.message : 'Failed to delete gear')
      }
    } catch (error) {
      toast.error('Failed to delete gear')
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isAddMode ? 'Add New Gear' : 'Edit Gear'}</DialogTitle>
          <DialogDescription>
            {isAddMode
              ? 'Add a new piece of equipment to your studio inventory.'
              : 'Update gear details.'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={typeId || undefined} onValueChange={setTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select gear type..." />
              </SelectTrigger>
              <SelectContent>
                {safeGearTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Brand</label>
            <Input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g., Shure, Canon"
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g., SM58, EOS R5"
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              min={0}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 2"
            />
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2">
          {!isAddMode && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || saving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} variant="outline" disabled={saving || deleting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || deleting}>
            {isAddMode ? (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {saving ? 'Adding...' : 'Add Gear'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

