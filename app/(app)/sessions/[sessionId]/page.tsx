import { notFound, redirect } from 'next/navigation'
import { getSessionById } from '../actions'
import { getStudioSettings } from '@/actions/getStudioSettings'
import { SessionDetailClient } from '../components/SessionDetailClient'

interface SessionDetailPageProps {
  params: { sessionId: string }
}

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
  const sessionResult = await getSessionById(params.sessionId)

  if ('error' in sessionResult) {
    if (sessionResult.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }
    if (sessionResult.error === 'NOT_FOUND') {
      notFound()
    }
    // For membership or studio issues, hide details
    notFound()
  }

  const session = sessionResult.session

  // Optional: fetch studio timezone for consistent display
  let timeZone: string | undefined
  const studioSettings = await getStudioSettings()
  if (!('error' in studioSettings)) {
    timeZone = studioSettings.studio.timezone || undefined
  }

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <SessionDetailClient session={session} timeZone={timeZone} />
    </div>
  )
}

