'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Camera, Building2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { getStudioSettings, type StudioSettingsData } from '@/actions/getStudioSettings'
import { updateStudio } from '@/actions/updateStudio'
import { uploadStudioLogo } from '@/actions/uploadStudioLogo'

export default function StudioSection() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [data, setData] = React.useState<StudioSettingsData | null>(null)

  // Form state
  const [studioName, setStudioName] = React.useState('')
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)
  const [description, setDescription] = React.useState('')

  // Track original values to detect changes
  const originalStudioName = React.useRef<string>('')
  const originalLogoUrl = React.useRef<string | null>(null)
  const originalDescription = React.useRef<string>('')

  // Load initial data
  React.useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const result = await getStudioSettings()
      if ('error' in result) {
        toast.error(result.message)
        setLoading(false)
        return
      }
      setData(result)
      setStudioName(result.studio.name || '')
      setLogoUrl(result.studio.logo_url)
      setDescription(result.studio.description || '')
      originalStudioName.current = result.studio.name || ''
      originalLogoUrl.current = result.studio.logo_url
      originalDescription.current = result.studio.description || ''
      setLoading(false)
    }
    fetchData()
  }, [])

  // Check if studio has changed
  const hasStudioChanges =
    studioName !== originalStudioName.current ||
    logoUrl !== originalLogoUrl.current ||
    description !== originalDescription.current

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const result = await uploadStudioLogo(formData)

      if ('error' in result) {
        toast.error(result.message)
        setSaving(false)
        return
      }

      // Update logo URL immediately
      setLogoUrl(result.url)

      // Update studio with new logo URL
      const updateResult = await updateStudio({ logo_url: result.url })

      if ('error' in updateResult) {
        toast.error(updateResult.message)
        setSaving(false)
        return
      }

      originalLogoUrl.current = result.url
      toast.success('Studio logo updated successfully')
    } catch (error) {
      toast.error('Failed to upload logo')
    } finally {
      setSaving(false)
    }
  }

  // Handle studio save
  const handleSaveStudio = async () => {
    if (!hasStudioChanges) return

    setSaving(true)
    try {
      const result = await updateStudio({
        name: studioName.trim(),
        description: description.trim() || undefined,
        logo_url: logoUrl || undefined,
      })

      if ('error' in result) {
        toast.error(result.message)
        setSaving(false)
        return
      }

      originalStudioName.current = studioName.trim()
      originalLogoUrl.current = logoUrl
      originalDescription.current = description.trim() || ''
      toast.success('Studio settings updated successfully')
    } catch (error) {
      toast.error('Failed to update studio settings')
    } finally {
      setSaving(false)
    }
  }

  return <div></div>
}
