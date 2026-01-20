import type { LucideIcon } from 'lucide-react'
import {
  Cable,
  Mic,
  Headphones,
  KeyboardMusic,
  Guitar as GuitarIcon,
  Music,
  Package,
  SlidersHorizontal,
  SlidersVertical,
  Volume2,
  Zap,
  HardDrive,
} from 'lucide-react'

export type CategoryIconKey =
  | 'all'
  | 'music'
  | 'mic'
  | 'interface'
  | 'outboard'
  | 'headphones'
  | 'mixer'
  | 'amp'
  | 'monitor'
  | 'keyboard-music'
  | 'guitar'
  | 'fallback'

const ICON_REGISTRY: Record<CategoryIconKey, LucideIcon> = {
  all: Package,
  music: Music,
  mic: Mic,
  interface: HardDrive,
  outboard: SlidersHorizontal,
  headphones: Headphones,
  mixer: SlidersVertical,
  amp: Zap,
  monitor: Volume2,
  'keyboard-music': KeyboardMusic,
  guitar: GuitarIcon,
  fallback: Music,
}

const VALID_ICON_KEYS = new Set<CategoryIconKey>([
  'music',
  'mic',
  'interface',
  'outboard',
  'headphones',
  'mixer',
  'amp',
  'monitor',
  'keyboard-music',
  'guitar',
  'fallback',
])

function normalizeName(name: string | null | undefined) {
  return name?.trim() || ''
}

function resolveIconKeyFromName(name: string | null | undefined): CategoryIconKey | null {
  const normalized = normalizeName(name).toLowerCase()
  if (!normalized) return null

  if (normalized.includes('mic')) return 'mic'
  if (normalized.includes('interface')) return 'interface'
  if (normalized.includes('headphone')) return 'headphones'
  if (normalized.includes('mixer') || normalized.includes('mix')) return 'mixer'
  if (normalized.includes('monitor') || normalized.includes('speaker')) return 'monitor'
  if (normalized.includes('amp') || normalized.includes('amplifier')) return 'amp'
  if (normalized.includes('keyboard') || normalized.includes('piano') || normalized.includes('synth'))
    return 'keyboard-music'
  if (normalized.includes('guitar') || normalized.includes('bass')) return 'guitar'
  if (
    normalized.includes('outboard') ||
    normalized.includes('compressor') ||
    normalized.includes('preamp') ||
    normalized.includes('eq')
  )
    return 'outboard'

  return null
}

export function getCategoryDisplayName(name: string | null | undefined) {
  const normalized = normalizeName(name)
  return normalized || 'Uncategorized'
}

export function getCategoryIconByKey(
  iconKey: string | null | undefined,
  typeName?: string | null | undefined
): LucideIcon {
  if (iconKey && VALID_ICON_KEYS.has(iconKey as CategoryIconKey)) {
    return ICON_REGISTRY[iconKey as CategoryIconKey]
  }

  const derivedKey = resolveIconKeyFromName(typeName)
  if (derivedKey) {
    return ICON_REGISTRY[derivedKey]
  }

  return ICON_REGISTRY.fallback
}

export const DEFAULT_CATEGORY_OPTION = {
  id: 'all',
  name: 'All',
  icon: ICON_REGISTRY.all,
}

export const FALLBACK_CATEGORY_ICON = ICON_REGISTRY.fallback

