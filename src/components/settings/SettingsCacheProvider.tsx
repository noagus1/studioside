'use client'

import * as React from 'react'
import { getUserSettings } from '@/actions/getUserSettings'
import { getStudioSettings } from '@/actions/getStudioSettings'
import { getTeamData } from '@/actions/getTeamData'
import { getMembership } from '@/data/getMembership'
import type { UserSettingsData } from '@/actions/getUserSettings'
import type { StudioSettingsData } from '@/actions/getStudioSettings'
import type { TeamData } from '@/actions/getTeamData'
import type { MembershipRole } from '@/types/db'

interface SettingsCache {
  userSettings: UserSettingsData | null
  studioSettings: StudioSettingsData | null
  teamData: TeamData | null
  membership: { role: MembershipRole } | null
  isLoading: boolean
  lastFetched: number | null
}

interface SettingsCacheContextValue {
  cache: SettingsCache
  refreshCache: () => Promise<void>
  invalidateCache: () => void
  getCachedUserSettings: () => UserSettingsData | null
  getCachedStudioSettings: () => StudioSettingsData | null
  getCachedTeamData: () => TeamData | null
  getCachedMembership: () => { role: MembershipRole } | null
}

const SettingsCacheContext = React.createContext<SettingsCacheContextValue | null>(null)

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CACHE_STORAGE_KEY = 'settings-cache'

// Helper to load cache from sessionStorage
function loadCacheFromStorage(): SettingsCache | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = sessionStorage.getItem(CACHE_STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    // Check if cache is still fresh
    if (parsed.lastFetched && Date.now() - parsed.lastFetched < CACHE_DURATION) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

// Helper to save cache to sessionStorage
function saveCacheToStorage(cache: SettingsCache) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage errors
  }
}

export function SettingsCacheProvider({ children }: { children: React.ReactNode }) {
  // Initialize from sessionStorage if available
  const [cache, setCache] = React.useState<SettingsCache>(() => {
    const stored = loadCacheFromStorage()
    return stored || {
      userSettings: null,
      studioSettings: null,
      teamData: null,
      membership: null,
      isLoading: false,
      lastFetched: null,
    }
  })

  const refreshCache = React.useCallback(async () => {
    // Don't refresh if already loading
    setCache((prev) => {
      if (prev.isLoading) return prev
      return { ...prev, isLoading: true }
    })

    try {
      // Fetch all settings data in parallel
      const [userSettingsResult, studioSettingsResult, teamDataResult, membershipResult] =
        await Promise.all([
          getUserSettings().catch(() => ({ error: 'FETCH_ERROR' as const, message: 'Failed to fetch' })),
          getStudioSettings().catch(() => ({ error: 'FETCH_ERROR' as const, message: 'Failed to fetch' })),
          getTeamData().catch(() => ({ error: 'FETCH_ERROR' as const, message: 'Failed to fetch' })),
          getMembership().catch(() => null),
        ])

      const newCache: SettingsCache = {
        userSettings: 'error' in userSettingsResult ? null : userSettingsResult,
        studioSettings: 'error' in studioSettingsResult ? null : studioSettingsResult,
        teamData: 'error' in teamDataResult ? null : teamDataResult,
        membership: membershipResult ? { role: membershipResult.role } : null,
        isLoading: false,
        lastFetched: Date.now(),
      }

      setCache(newCache)
      saveCacheToStorage(newCache)
    } catch (error) {
      console.error('Failed to refresh settings cache:', error)
      setCache((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  // Prefetch data on mount if cache is empty or stale
  React.useEffect(() => {
    // Check current cache state
    const currentCache = loadCacheFromStorage()
    const isStale =
      !currentCache?.lastFetched || Date.now() - currentCache.lastFetched > CACHE_DURATION

    if (isStale && !cache.isLoading) {
      refreshCache()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  const invalidateCache = React.useCallback(() => {
    const emptyCache: SettingsCache = {
      userSettings: null,
      studioSettings: null,
      teamData: null,
      membership: null,
      isLoading: false,
      lastFetched: null,
    }
    setCache(emptyCache)
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(CACHE_STORAGE_KEY)
      } catch {
        // Ignore storage errors
      }
    }
  }, [])

  const getCachedUserSettings = React.useCallback(() => {
    // Return cached data if fresh, otherwise return null to trigger server fetch
    if (cache.userSettings && cache.lastFetched) {
      const isFresh = Date.now() - cache.lastFetched < CACHE_DURATION
      if (isFresh) {
        return cache.userSettings
      }
    }
    return null
  }, [cache.userSettings, cache.lastFetched])

  const getCachedStudioSettings = React.useCallback(() => {
    if (cache.studioSettings && cache.lastFetched) {
      const isFresh = Date.now() - cache.lastFetched < CACHE_DURATION
      if (isFresh) {
        return cache.studioSettings
      }
    }
    return null
  }, [cache.studioSettings, cache.lastFetched])

  const getCachedTeamData = React.useCallback(() => {
    if (cache.teamData && cache.lastFetched) {
      const isFresh = Date.now() - cache.lastFetched < CACHE_DURATION
      if (isFresh) {
        return cache.teamData
      }
    }
    return null
  }, [cache.teamData, cache.lastFetched])

  const getCachedMembership = React.useCallback(() => {
    if (cache.membership && cache.lastFetched) {
      const isFresh = Date.now() - cache.lastFetched < CACHE_DURATION
      if (isFresh) {
        return cache.membership
      }
    }
    return null
  }, [cache.membership, cache.lastFetched])

  const value = React.useMemo(
    () => ({
      cache,
      refreshCache,
      invalidateCache,
      getCachedUserSettings,
      getCachedStudioSettings,
      getCachedTeamData,
      getCachedMembership,
    }),
    [cache, refreshCache, invalidateCache, getCachedUserSettings, getCachedStudioSettings, getCachedTeamData, getCachedMembership]
  )

  return <SettingsCacheContext.Provider value={value}>{children}</SettingsCacheContext.Provider>
}

export function useSettingsCache() {
  const context = React.useContext(SettingsCacheContext)
  if (!context) {
    throw new Error('useSettingsCache must be used within SettingsCacheProvider')
  }
  return context
}
