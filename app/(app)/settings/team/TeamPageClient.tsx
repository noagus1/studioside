'use client'

import * as React from 'react'
import { useSettingsCache } from '@/components/settings/SettingsCacheProvider'
import { useStudioAccess } from '@/components/settings/useStudioAccess'
import { getTeamData } from '@/actions/getTeamData'
import TeamSection from '@/components/settings/sections/TeamSection'

export function TeamPageClient() {
  const { getCachedTeamData, refreshCache } = useSettingsCache()
  const { isAdmin, role, loading: roleLoading } = useStudioAccess()
  const [teamData, setTeamData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      // Check cache first
      const cachedTeamData = getCachedTeamData()

      if (cachedTeamData) {
        // Use cached data immediately - no loading state
        setTeamData(cachedTeamData)
        setLoading(false)
        return
      }

      // Cache miss - fetch from server
      setLoading(true)
      const result = await getTeamData()

      setTeamData(result)
      setLoading(false)

      // Refresh cache in background for next time
      refreshCache()
    }

    loadData()
  }, [getCachedTeamData, refreshCache])

  if (loading || roleLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12 min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return <TeamSection initialData={teamData} isAdmin={isAdmin} currentRole={role} />
}
