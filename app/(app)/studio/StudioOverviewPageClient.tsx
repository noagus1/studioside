'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Camera, Check, ChevronDown, Loader2, Search } from 'lucide-react'
import { getTeamData, type TeamData } from '@/actions/getTeamData'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SettingsCacheProvider, useSettingsCache } from '@/components/settings/SettingsCacheProvider'
import GeneralSection from '@/components/settings/sections/GeneralSection'
import type { StudioSettingsData } from '@/actions/getStudioSettings'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { InviteMembersModal } from '@/components/InviteMembersModal'
import { updateStudio } from '@/actions/updateStudio'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { uploadStudioLogo } from '@/actions/uploadStudioLogo'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const SECTION_KEYS = ['general', 'team', 'rooms', 'preferences'] as const
type SectionKey = (typeof SECTION_KEYS)[number]

const COLOR_CHOICES = [
  '#111827',
  '#0F172A',
  '#0EA5E9',
  '#22C55E',
  '#EAB308',
  '#F97316',
  '#EF4444',
  '#A855F7',
  '#06B6D4',
  '#F43F5E',
] as const

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Manager' },
  { value: 'member', label: 'Member' },
] as const
type RoleValue = (typeof ROLE_OPTIONS)[number]['value']

interface StudioOverviewPageClientProps {
  studioSettings: StudioSettingsData
}

function resolveInitialSection(searchParams: URLSearchParams): SectionKey {
  const raw = searchParams.get('section')
  const param = raw === 'overview' || raw === 'security' ? 'general' : raw || 'general'
  return SECTION_KEYS.includes(param as SectionKey) ? (param as SectionKey) : 'general'
}

function StudioOverviewContent({
  studioSettings,
}: StudioOverviewPageClientProps) {
  const { refreshCache } = useSettingsCache()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const initialSection = React.useMemo(() => resolveInitialSection(searchParams), [searchParams])
  const [section, setSection] = React.useState<SectionKey>(initialSection)
  const isOwnerOrAdmin = studioSettings.isOwnerOrAdmin
  const memberCount = typeof studioSettings.memberCount === 'number' ? studioSettings.memberCount : 0
  const memberLabel = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`
  const [teamData, setTeamData] = React.useState<TeamData | null>(null)
  const [teamError, setTeamError] = React.useState<string | null>(null)
  const [teamLoading, setTeamLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [roleOverrides, setRoleOverrides] = React.useState<Record<string, RoleValue>>({})
  const [studioName, setStudioName] = React.useState(
    studioSettings.studio.name || 'Your studio'
  )
  const [logoUrl, setLogoUrl] = React.useState<string | undefined>(
    studioSettings.studio.logo_url || undefined
  )
  const [logoColor, setLogoColor] = React.useState<string | null>(null)
  const [logoPopoverOpen, setLogoPopoverOpen] = React.useState(false)
  const [isUpdatingLogo, setIsUpdatingLogo] = React.useState(false)
  const [isEditingName, setIsEditingName] = React.useState(false)
  const [nameDraft, setNameDraft] = React.useState(studioSettings.studio.name || 'Your studio')
  const [nameInputWidthPx, setNameInputWidthPx] = React.useState<number | null>(null)
  const [isSavingName, setIsSavingName] = React.useState(false)
  const [confirmNameModalOpen, setConfirmNameModalOpen] = React.useState(false)
  const [pendingName, setPendingName] = React.useState<string | null>(null)
  const nameInputRef = React.useRef<HTMLInputElement>(null)
  const prevStudioNameRef = React.useRef<string | null>(studioSettings.studio.name || null)
  const canEditName = isOwnerOrAdmin
  const fallbackInitials = React.useMemo(() => {
    if (!studioName) return 'ST'
    return studioName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [studioName])

  React.useEffect(() => {
    setLogoUrl(studioSettings.studio.logo_url || undefined)
    if (studioSettings.studio.logo_url?.startsWith('data:image/svg+xml')) {
      try {
        const decoded = decodeURIComponent(
          studioSettings.studio.logo_url.replace('data:image/svg+xml;utf8,', '')
        )
        const match = decoded.match(/fill=['"]([^'"]+)['"]/)
        setLogoColor(match ? match[1] : null)
      } catch {
        setLogoColor(null)
      }
    } else {
      setLogoColor(null)
    }
  }, [studioSettings.studio.logo_url])

  React.useEffect(() => {
    setSection(initialSection)
  }, [initialSection])

  React.useEffect(() => {
    const nextName = studioSettings.studio.name || 'Your studio'
    const prevName = prevStudioNameRef.current || 'Your studio'

    // Only sync local state when the server-provided studio name actually changes.
    if (nextName !== prevName) {
      prevStudioNameRef.current = studioSettings.studio.name || null
      setStudioName(nextName)
      if (!isEditingName) {
        setNameDraft(nextName)
      }
    }
  }, [isEditingName, studioSettings.studio.name])

  React.useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isEditingName])

  React.useLayoutEffect(() => {
    const el = nameInputRef.current
    if (!el) return

    const style = window.getComputedStyle(el)
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.font = font
    const textWidth = ctx.measureText(nameDraft || '').width
    const minWidth = ctx.measureText('MMMMMM').width // keep at least ~6 chars
    const buffer = 4 // small buffer so caret has breathing room

    setNameInputWidthPx(Math.max(textWidth, minWidth) + buffer)
  }, [nameDraft])

  const ensureSquareImage = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const isSquare = Math.abs(img.width - img.height) <= 4
        URL.revokeObjectURL(url)
        if (!isSquare) {
          reject(new Error('Please upload a square (1:1) image'))
        } else {
          resolve()
        }
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Unable to read image'))
      }
      img.src = url
    })
  }

  const colorDataUrl = (color: string) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><rect width='256' height='256' fill='${color}' /></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }

  const applyLogoUpdate = async (next: string | null, successMessage?: string) => {
    if (!isOwnerOrAdmin) return
    setIsUpdatingLogo(true)
    const result = await updateStudio({ logo_url: next })
    if ('error' in result) {
      toast.error(result.message || 'Unable to update logo')
      setIsUpdatingLogo(false)
      return
    }

    setLogoUrl(next || undefined)
    setLogoColor(
      next?.startsWith('data:image/svg+xml')
        ? (() => {
            try {
              const decoded = decodeURIComponent(next.replace('data:image/svg+xml;utf8,', ''))
              const match = decoded.match(/fill=['"]([^'"]+)['"]/)
              return match ? match[1] : null
            } catch {
              return null
            }
          })()
        : null
    )

    if (successMessage) {
      toast.success(successMessage)
    } else {
      toast.success(next ? 'Logo updated' : 'Logo removed')
    }

    try {
      await refreshCache()
    } catch (error) {
      console.warn('Failed to refresh settings cache after logo update', error)
    } finally {
      setIsUpdatingLogo(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwnerOrAdmin) return
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5MB')
      return
    }

    try {
      await ensureSquareImage(file)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Logo must be square (1:1)')
      return
    }

    setIsUpdatingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      const uploadResult = await uploadStudioLogo(formData)
      if ('error' in uploadResult) {
        toast.error(uploadResult.message || 'Unable to upload logo')
        setIsUpdatingLogo(false)
        return
      }

      await applyLogoUpdate(uploadResult.url, 'Logo updated')
      setLogoPopoverOpen(false)
    } catch (error) {
      toast.error('Failed to upload logo')
      setIsUpdatingLogo(false)
    }
  }

  const handleColorPick = async (color: string) => {
    const url = colorDataUrl(color)
    await applyLogoUpdate(url, 'Color applied')
    setLogoPopoverOpen(false)
  }

  const handleRemoveLogo = async () => {
    await applyLogoUpdate(null, 'Logo cleared')
    setLogoPopoverOpen(false)
  }

  const handleSectionChange = (next: string) => {
    if (!SECTION_KEYS.includes(next as SectionKey)) return
    setSection(next as SectionKey)
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('section', next)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleStartEditingName = () => {
    if (!canEditName) return
    if (!isEditingName) {
      setIsEditingName(true)
    }
  }

  const handleCancelNameEdit = () => {
    setNameDraft(studioName)
    setIsEditingName(false)
  }

  const handleSaveName = ({ fromBlur = false }: { fromBlur?: boolean } = {}) => {
    if (isSavingName) return
    const trimmedName = nameDraft.trim()

    if (!trimmedName) {
      if (!fromBlur) {
        toast.error('Studio name cannot be empty')
      }
      handleCancelNameEdit()
      return
    }

    if (trimmedName === studioName) {
      setIsEditingName(false)
      return
    }

    if (confirmNameModalOpen && pendingName === trimmedName) {
      return
    }

    // Ask for confirmation before persisting the new name.
    setPendingName(trimmedName)
    setConfirmNameModalOpen(true)
  }

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSaveName()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      handleCancelNameEdit()
    }
  }

  const handleNameBlur = () => {
    handleSaveName({ fromBlur: true })
  }

  const handleConfirmNameChange = async () => {
    if (!pendingName) return
    try {
      setIsSavingName(true)
      const result = await updateStudio({ name: pendingName })

      if ('error' in result) {
        toast.error(result.message || 'Unable to update studio name')
        return
      }

      setStudioName(pendingName)
      setNameDraft(pendingName)
      setIsEditingName(false)
      prevStudioNameRef.current = pendingName
      toast.success('Studio name updated')

      try {
        await refreshCache()
      } catch (error) {
        console.warn('Failed to refresh settings cache after renaming studio', error)
      }
    } catch (error) {
      toast.error('Unable to update studio name')
    } finally {
      setIsSavingName(false)
      setConfirmNameModalOpen(false)
      setPendingName(null)
    }
  }

  const handleCancelNameChange = () => {
    setConfirmNameModalOpen(false)
    setPendingName(null)
    setNameDraft(studioName)
    setIsEditingName(false)
  }

  React.useEffect(() => {
    let mounted = true
    const loadTeam = async () => {
      try {
        setTeamLoading(true)
        const result = await getTeamData()
        if (!mounted) return
        if ('error' in result) {
          setTeamError(result.message)
          setTeamData(null)
        } else {
          setTeamData(result)
          setTeamError(null)
        }
      } catch (error) {
        if (!mounted) return
        setTeamError(error instanceof Error ? error.message : 'Unable to load team')
        setTeamData(null)
      } finally {
        if (mounted) {
          setTeamLoading(false)
        }
      }
    }
    loadTeam()
    return () => {
      mounted = false
    }
  }, [])

  const sortedMembers = React.useMemo(() => {
    if (!teamData?.members) return []
    return [...teamData.members].sort((a, b) => {
      const nameA = (a.user.full_name || a.user.email || '').toLowerCase()
      const nameB = (b.user.full_name || b.user.email || '').toLowerCase()
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
    })
  }, [teamData])

  const renderTeamTable = () => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const filteredMembers = normalizedSearch
      ? sortedMembers.filter((member) => {
          const name = (member.user.full_name || member.user.email || '').toLowerCase()
          const email = (member.user.email || '').toLowerCase()
          return name.includes(normalizedSearch) || email.includes(normalizedSearch)
        })
      : sortedMembers

    if (teamLoading) {
      return (
        <div className="rounded-lg divide-y divide-border/60 bg-transparent">
          <div className="grid grid-cols-[minmax(0,1fr)_160px] items-center gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/80 border-b border-border/60">
            <span>Name</span>
            <span>Role</span>
          </div>
          {[1, 2, 3].map((key) => (
            <div
              key={key}
              className="grid grid-cols-[minmax(0,1fr)_160px] items-center gap-4 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex">
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (teamError) {
      return (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {teamError}
        </div>
      )
    }

    if (!filteredMembers.length) {
      return (
        <div className="rounded-lg bg-muted/15 px-4 py-3 text-sm text-muted-foreground/90">
          {sortedMembers.length === 0 && !normalizedSearch
            ? 'No team members yet.'
            : 'No team members match your search.'}
        </div>
      )
    }

    const normalizeRole = (role: string | null | undefined): RoleValue => {
      const match = ROLE_OPTIONS.find((option) => option.value === role)
      return match ? match.value : 'member'
    }

    const roleLabel = (role: string) => {
      if (role === 'owner') return 'Owner'
      if (role === 'admin') return 'Manager'
      return 'Member'
    }

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-[minmax(0,3fr)_auto] gap-3 items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search members"
              className="w-full pl-9 bg-muted/60 border-0 focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Button
            className="w-auto px-3 justify-self-end bg-[hsl(var(--ring))] text-white hover:bg-[hsl(var(--ring))]/90"
            onClick={() => setInviteOpen(true)}
          >
            Add members
          </Button>
        </div>

        <div className="rounded-lg overflow-hidden bg-transparent">
          <div className="grid grid-cols-[minmax(0,1fr)_160px] items-center gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/80 border-b border-border/60">
            <span>Name</span>
            <span>Role</span>
          </div>
          <div className="divide-y divide-border/60">
            {filteredMembers.map((member) => {
              const displayName = member.user.full_name?.trim() || member.user.email || 'Unknown user'
              const email = member.user.email || 'No email on file'
              const fallback = displayName.charAt(0).toUpperCase()
              const isCurrentUser = teamData?.currentUserId && member.user.id === teamData.currentUserId
              const nameWithIndicator = isCurrentUser ? `${displayName} (You)` : displayName
              const currentRole = normalizeRole(roleOverrides[member.id] || member.role)

              return (
                <div
                  key={member.id}
                  className="grid grid-cols-[minmax(0,1fr)_160px] items-center gap-4 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user.avatar_url ?? undefined} alt={displayName} />
                      <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium leading-tight text-foreground">{nameWithIndicator}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{email}</p>
                    </div>
                  </div>
                  <div className="flex">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-2.5 py-2 text-sm font-normal leading-none text-foreground shadow-none ring-offset-background placeholder:text-muted-foreground transition hover:bg-muted/60 focus:outline-none focus:border-ring focus:ring-0 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                          aria-label="Change member role"
                        >
                          <span className="capitalize">{roleLabel(currentRole)}</span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground opacity-70" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-[160px] rounded-md border border-input bg-popover p-1 text-popover-foreground shadow-md"
                      >
                        <div className="flex flex-col gap-0.5">
                          {ROLE_OPTIONS.map((option) => {
                            const isActive = currentRole === option.value
                            return (
                              <DropdownMenuItem
                                key={option.value}
                                onSelect={() =>
                                  setRoleOverrides((prev) => ({
                                    ...prev,
                                    [member.id]: normalizeRole(option.value),
                                  }))
                                }
                                className={cn(
                                  'flex w-full cursor-pointer select-none items-center rounded-sm px-2.5 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                                  isActive && 'bg-muted/60'
                                )}
                              >
                                {option.label}
                              </DropdownMenuItem>
                            )
                          })}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault()
                            toast.info('Customize roles coming soon')
                          }}
                          className="flex w-full cursor-default select-none items-center rounded-sm px-2.5 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                        >
                          Customize
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Popover open={logoPopoverOpen} onOpenChange={setLogoPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'group relative rounded-lg ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  !isOwnerOrAdmin && 'cursor-default'
                )}
                disabled={!isOwnerOrAdmin}
                aria-label="Update studio logo"
              >
                <Avatar
                  className="h-12 w-12 rounded-lg border border-border/60 bg-muted/40 shadow-sm transition-opacity group-hover:opacity-90"
                  style={logoColor ? { backgroundColor: logoColor } : undefined}
                >
                  <AvatarImage
                    src={logoUrl}
                    alt={studioName}
                    className="rounded-lg object-cover"
                  />
                  <AvatarFallback
                    className="rounded-lg bg-muted text-muted-foreground/70 text-base font-semibold"
                    style={logoColor ? { backgroundColor: logoColor, color: '#fff' } : undefined}
                  >
                    {fallbackInitials}
                  </AvatarFallback>
                </Avatar>
                {isOwnerOrAdmin && (
                  <span className="pointer-events-none absolute inset-0 rounded-lg border border-transparent bg-black/30 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Studio logo</p>
                <p className="text-xs text-muted-foreground/80">
                  Upload a square logo or pick a simple color background.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Brand color
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_CHOICES.map((color) => {
                    const isSelected = logoColor?.toLowerCase() === color.toLowerCase()
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorPick(color)}
                        disabled={isUpdatingLogo}
                        className={cn(
                          'relative h-10 w-full rounded-md border border-border/50 shadow-sm transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={`Use ${color} as logo color`}
                      >
                        {isSelected && (
                          <span className="absolute inset-0 flex items-center justify-center text-white">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Upload square image
                </p>
                <label
                  htmlFor="studio-logo-upload"
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border/80 bg-muted/40 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isUpdatingLogo && 'opacity-60 cursor-wait'
                  )}
                >
                  {isUpdatingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Camera className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{isUpdatingLogo ? 'Uploading…' : 'Upload square logo'}</span>
                  <input
                    id="studio-logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={isUpdatingLogo}
                  />
                </label>
                <p className="text-[11px] text-muted-foreground/80">
                  Use a 1:1 image (PNG, JPG, SVG). Max 5MB.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleRemoveLogo}
                  disabled={isUpdatingLogo || (!logoUrl && !logoColor)}
                >
                  Clear logo
                </Button>
                <span className="text-[11px] text-muted-foreground/80">
                  Changes save automatically
                </span>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'inline-flex rounded-lg transition-all ring-2 ring-offset-2 ring-offset-background',
                  isEditingName ? 'ring-selection bg-background/70' : 'ring-transparent'
                )}
              >
                <Input
                  ref={nameInputRef}
                  value={nameDraft}
                  readOnly={!isEditingName || !canEditName}
                  onClick={handleStartEditingName}
                  onFocus={handleStartEditingName}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  onBlur={handleNameBlur}
                  disabled={isSavingName && !isEditingName}
                  className={cn(
                    'w-auto min-w-[6ch] bg-transparent border-0 px-0 py-0 text-2xl md:text-2xl leading-[2rem] font-semibold tracking-tight text-foreground focus-visible:ring-0 focus-visible:outline-none focus-visible:ring-offset-0 shadow-none h-auto',
                    !isEditingName ? 'cursor-text' : ''
                  )}
                  style={nameInputWidthPx ? { width: `${nameInputWidthPx}px` } : undefined}
                  aria-label="Edit studio name"
                />
              </div>
              {isSavingName && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-sm text-muted-foreground/90">{memberLabel}</p>
          </div>
        </div>
      </div>

      <Tabs value={section} onValueChange={handleSectionChange} className="space-y-6">
        <div className="flex flex-col gap-4">
          <TabsList className="w-full justify-start gap-6 p-0 bg-transparent border-b border-border/60 rounded-none h-auto">
            <TabsTrigger
              value="general"
              className="rounded-none px-0 pb-3 text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=inactive]:hover:text-foreground"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="rounded-none px-0 pb-3 text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=inactive]:hover:text-foreground"
            >
              Team Members
            </TabsTrigger>
            <TabsTrigger
              value="rooms"
              className="rounded-none px-0 pb-3 text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=inactive]:hover:text-foreground"
            >
              Rooms
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="rounded-none px-0 pb-3 text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=inactive]:hover:text-foreground"
            >
              Preferences
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-6">
          <GeneralSection
            userRole={isOwnerOrAdmin ? 'owner' : null}
            initialData={studioSettings}
            view="general"
            className="space-y-6"
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          {renderTeamTable()}
          <InviteMembersModal open={inviteOpen} onOpenChange={setInviteOpen} />
        </TabsContent>

        <TabsContent value="rooms" className="space-y-6" />

        <TabsContent value="preferences" className="space-y-6">
          <Card className="shadow-none border-border/60 rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Scheduling defaults</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground/90 space-y-2">
              <p className="leading-relaxed">Update timezone and studio basics without leaving the hub.</p>
              <p className="text-xs text-muted-foreground/80">Changes save with the existing settings actions.</p>
            </CardContent>
          </Card>
          <GeneralSection
            userRole={isOwnerOrAdmin ? 'owner' : null}
            initialData={studioSettings}
            view="scheduling"
            className="space-y-6"
          />
        </TabsContent>
      </Tabs>

      <Dialog open={confirmNameModalOpen} onOpenChange={(open) => !open && handleCancelNameChange()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change studio name?</DialogTitle>
            <DialogDescription>
              {pendingName
                ? `Update studio name to “${pendingName}”?`
                : 'Update studio name?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" onClick={handleCancelNameChange} disabled={isSavingName}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmNameChange} disabled={isSavingName}>
              {isSavingName ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function StudioOverviewPageClient(props: StudioOverviewPageClientProps) {
  return (
    <SettingsCacheProvider>
      <StudioOverviewContent {...props} />
    </SettingsCacheProvider>
  )
}
