'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Save, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createGear, deleteGear, updateGear, type Gear, type GearType } from '../actions'

function getDisplayTitle(gear: Gear | null) {
  if (!gear) return 'Edit Gear'
  return gear.model?.trim() || gear.brand?.trim() || gear.type?.name || 'Edit Gear'
}

interface GearDetailFormProps {
  gear: Gear | null
  gearTypes?: GearType[]
  onSaved?: (gear: Gear) => void
  onDeleted?: (gearId: string) => void
  onCancel?: () => void
}

export function GearDetailForm({ gear, gearTypes, onSaved, onDeleted, onCancel }: GearDetailFormProps) {
  const router = useRouter()
  const isAddMode = gear === null
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const safeGearTypes = Array.isArray(gearTypes) ? gearTypes : []

  const [typeId, setTypeId] = React.useState<string>('')
  const [brand, setBrand] = React.useState('')
  const [model, setModel] = React.useState('')
  const [quantity, setQuantity] = React.useState('1')

  React.useEffect(() => {
    if (gear) {
      setTypeId(gear.type_id || '')
      setBrand(gear.brand || '')
      setModel(gear.model || '')
      setQuantity(String(gear.quantity ?? 1))
    } else {
      setTypeId('')
      setBrand('')
      setModel('')
      setQuantity('1')
    }
  }, [gear])

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.push('/gear')
    }
  }

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
        const result = await createGear({
          type_id: typeId || null,
          brand: brand.trim(),
          model: model.trim(),
          quantity: parsedQuantity,
        })

        if ('success' in result && result.success) {
          toast.success('Gear added successfully')
          onSaved ? onSaved(result.gear) : router.push('/gear')
        } else {
          toast.error('error' in result ? result.message : 'Failed to add gear')
        }
      } else {
        if (!gear) return

        const result = await updateGear(gear.id, {
          type_id: typeId || null,
          brand: brand.trim(),
          model: model.trim(),
          quantity: parsedQuantity,
        })

        if ('success' in result && result.success) {
          toast.success('Gear updated successfully')
          onSaved ? onSaved(result.gear) : router.push('/gear')
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
        onDeleted ? onDeleted(gear.id) : router.push('/gear')
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {isAddMode ? 'Add New Gear' : getDisplayTitle(gear)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAddMode
              ? 'Add a new piece of equipment to your studio inventory.'
              : 'Update gear details.'}
          </p>
        </div>

        <div className="flex gap-2">
          {!isAddMode && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting || saving}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={handleCancel} disabled={saving || deleting}>
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
        </div>
      </div>

      <div className="grid gap-4">
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Brand</label>
          <Input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g., Shure, Canon"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Model</label>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g., SM58, EOS R5"
          />
        </div>

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
    </div>
  )
}

