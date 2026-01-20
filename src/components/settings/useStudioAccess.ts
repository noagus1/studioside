'use client'

import * as React from 'react'
import { getMembership } from '@/data/getMembership'
import { useSettingsCache } from './SettingsCacheProvider'
import type { MembershipRole } from '@/types/db'

/**
 * Centralized helper to determine studio access level.
 * Uses cached membership when available, otherwise fetches once.
 */
export function useStudioAccess() {
  const { getCachedMembership, refreshCache } = useSettingsCache()
  const [role, setRole] = React.useState<MembershipRole | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    const cached = getCachedMembership()
    if (cached?.role) {
      setRole(cached.role)
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      try {
        const membership = await getMembership()
        if (cancelled) return
        setRole(membership?.role || null)
        refreshCache()
      } catch (error) {
        if (cancelled) return
        setRole(null)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [getCachedMembership, refreshCache])

  const isAdmin = role === 'owner' || role === 'admin'

  return { role, isAdmin, loading }
}
