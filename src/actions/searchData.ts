'use server'

/**
 * Search Data Server Action
 * 
 * Fetches all searchable data (clients, sessions, gear) for the command palette.
 * All operations are scoped to the current studio via existing server actions.
 */

import { getClients } from '../../app/(app)/sessions/actions'
import { getSessions } from '../../app/(app)/sessions/actions'
import { getGear } from '../../app/(app)/gear/actions'
import type { Client, Session } from '../../app/(app)/sessions/actions'
import type { Gear } from '../../app/(app)/gear/actions'

export interface SearchDataResult {
  success: true
  clients: Client[]
  sessions: Session[]
  gear: Gear[]
}

export interface SearchDataError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'VALIDATION_ERROR'
    | 'DATABASE_ERROR'
  message: string
}

/**
 * Fetches all searchable data for the command palette.
 * 
 * @returns Combined search data (clients, sessions, gear) or error object
 */
export async function getSearchData(): Promise<SearchDataResult | SearchDataError> {
  // Fetch all data in parallel
  const [clientsResult, sessionsResult, gearResult] = await Promise.all([
    getClients(),
    getSessions(),
    getGear(),
  ])

  // Check for errors - return first error encountered
  if ('error' in clientsResult) {
    return {
      error: clientsResult.error,
      message: clientsResult.message,
    }
  }

  if ('error' in sessionsResult) {
    return {
      error: sessionsResult.error,
      message: sessionsResult.message,
    }
  }

  if ('error' in gearResult) {
    return {
      error: gearResult.error,
      message: gearResult.message,
    }
  }

  // All successful, return combined data
  return {
    success: true,
    clients: clientsResult.clients,
    sessions: sessionsResult.sessions,
    gear: gearResult.gear,
  }
}
