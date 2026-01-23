import { redirect } from 'next/navigation'
import { getStudioSettings } from '@/actions/getStudioSettings'
import { getTeamData } from '@/actions/getTeamData'
import { StudioOverviewPageClient } from './StudioOverviewPageClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StudioOverviewPage() {
  const [studioSettings, teamData] = await Promise.all([
    getStudioSettings(),
    getTeamData(),
  ])

  if ('error' in studioSettings) {
    if (studioSettings.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }
    redirect('/dashboard')
  }

  return (
    <StudioOverviewPageClient studioSettings={studioSettings} initialTeamData={teamData} />
  )
}
