import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getSessions } from '../sessions/actions'
import { getStudioSettings } from '@/actions/getStudioSettings'
import { CalendarClient } from './CalendarClient'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch sessions for a wider date range to support month navigation
  // Fetch 3 months back and 6 months forward
  const today = new Date()
  const startDate = new Date(today)
  startDate.setMonth(today.getMonth() - 3)
  const endDate = new Date(today)
  endDate.setMonth(today.getMonth() + 6)

  const sessionsResult = await getSessions(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  )
  const sessions = 'success' in sessionsResult && sessionsResult.success
    ? sessionsResult.sessions
    : []

  const studioSettings = await getStudioSettings()
  const studioTimezone =
    'error' in studioSettings ? 'UTC' : studioSettings.studio.timezone || 'UTC'

  const initialSessionId =
    searchParams && typeof searchParams.sessionId === 'string' ? searchParams.sessionId : undefined

  return <CalendarClient sessions={sessions} studioTimezone={studioTimezone} initialSessionId={initialSessionId} />
}

