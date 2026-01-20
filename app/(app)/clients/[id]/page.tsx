import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getClientById, getSessionsForClient } from '../actions'
import { ClientDetailClient } from './ClientDetailClient'

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

/**
 * Client Detail Page (Server Component)
 * 
 * Fetches client and sessions data server-side.
 */
export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get client ID from route params
  const { id } = await params

  // Fetch client data
  const clientResult = await getClientById(id)

  // Handle errors
  if ('error' in clientResult) {
    if (clientResult.error === 'NO_STUDIO') {
      redirect('/dashboard')
    }
    if (clientResult.error === 'NOT_FOUND') {
      redirect('/clients?error=client_not_found')
    }
    // For other errors, redirect to clients page
    redirect('/clients')
  }

  const client = clientResult.client

  // Fetch sessions for this client
  const sessionsResult = await getSessionsForClient(id)

  // Handle session errors (non-fatal, just show empty list)
  const sessions = ('success' in sessionsResult && sessionsResult.success)
    ? sessionsResult.sessions
    : []

  return <ClientDetailClient initialClient={client} initialSessions={sessions} />
}








