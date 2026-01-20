import { redirect } from 'next/navigation'
import { getStudioSettings } from '@/actions/getStudioSettings'
import { StudioOverviewPageClient } from './StudioOverviewPageClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StudioOverviewPage() {
  const studioSettings = await getStudioSettings()

  if ('error' in studioSettings) {
    if (studioSettings.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }
    redirect('/dashboard')
  }

  return (
    <StudioOverviewPageClient studioSettings={studioSettings} />
  )
}
