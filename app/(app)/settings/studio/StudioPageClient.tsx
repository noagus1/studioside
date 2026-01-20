'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useSettingsCache } from '@/components/settings/SettingsCacheProvider'
import { getStudioSettings } from '@/actions/getStudioSettings'
import GeneralSection from '@/components/settings/sections/GeneralSection'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

interface StudioPageClientProps {
  view?: 'all' | 'general' | 'scheduling'
}

export function StudioPageClient({ view = 'all' }: StudioPageClientProps) {
  const router = useRouter()
  const { getCachedStudioSettings, refreshCache } = useSettingsCache()
  const [studioSettings, setStudioSettings] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadData() {
      // Check cache first
      const cachedStudioSettings = getCachedStudioSettings()

      if (cachedStudioSettings) {
        // Use cached data immediately - no loading state
        setStudioSettings(cachedStudioSettings)
        setLoading(false)
        return
      }

      // Cache miss - fetch from server
      setLoading(true)
      const result = await getStudioSettings()

      // Handle errors
      if ('error' in result) {
        if (result.error === 'NO_STUDIO') {
          router.push('/dashboard')
          return
        }
        if (result.error === 'NOT_A_MEMBER') {
          router.push('/dashboard')
          return
        }
        if (result.error === 'AUTHENTICATION_REQUIRED') {
          router.push('/login')
          return
        }
        setError(result.message)
        setLoading(false)
        return
      }

      setStudioSettings(result)
      setLoading(false)

      // Refresh cache in background for next time
      refreshCache()
    }

    loadData()
  }, [getCachedStudioSettings, refreshCache, router])

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Card className="shadow-none">
            <CardContent className="p-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <div className="flex-1 max-w-md">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12 min-h-[400px]">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (!studioSettings) {
    return null
  }

  return <GeneralSection userRole={studioSettings.isOwnerOrAdmin ? 'owner' : null} initialData={studioSettings} view={view} />
}
