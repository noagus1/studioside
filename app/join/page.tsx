import { redirect } from 'next/navigation'
import { getInviteByToken } from '@/actions/getInviteByToken'
import AcceptInvitePanel from './AcceptInvitePanel'
import OnboardingOptions from './OnboardingOptions'
import { getInviteToken } from '@/lib/cookies/inviteToken'
import { hashToken } from '@/lib/utils/hashToken'

interface JoinPageProps {
  searchParams: Promise<{ token?: string }>
}

/**
 * Join Page
 * 
 * Single onboarding entry point for both creating studios and joining via invite.
 * - If token is present: Shows Accept Invite flow (only if invite is valid)
 * - If no token: Shows two-option selection (Create Studio or Join with Invite)
 */
export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams
  const token = params.token

  // If no token, show the two-option onboarding screen
  if (!token) {
    // Check if there's a stale cookie that should be cleared
    const existingToken = await getInviteToken()
    if (existingToken) {
      // Redirect to API route to clear the cookie, then come back
      redirect('/api/join/token?action=clear')
    }
    return <OnboardingOptions />
  }

  // Validate the invite token using the shared validator
  const invitation = await getInviteByToken(token)

  // If invitation is invalid, expired, or already accepted, show error page
  if (!invitation) {
    // Check if there's a cookie that should be cleared
    const existingToken = await getInviteToken()
    if (existingToken) {
      // Redirect to API route to clear the cookie, then come back to show error
      redirect(`/api/join/token?action=clear&returnToken=${encodeURIComponent(token)}`)
    }
    
    // Check if it's expired or already accepted by querying directly for better error messages
    const { admin } = await import('@/lib/supabase/adminClient')
    const tokenHash = hashToken(token)
    const { data: rawInvite } = await admin
      .from('studio_invitations')
      .select('expires_at, accepted_at, status')
      .eq('token_hash', tokenHash)
      .maybeSingle()
    const { data: rawLink } = await admin
      .from('studio_invite_links')
      .select('is_enabled')
      .eq('token_hash', tokenHash)
      .maybeSingle()
    
    let errorTitle = 'Invitation not found'
    let errorMessage = 'This invitation is invalid or could not be found.'
    
    if (rawInvite) {
      if (rawInvite.accepted_at) {
        errorTitle = 'Invitation already accepted'
        errorMessage = 'This invitation has already been used. If you need access, please request a new invitation from the studio owner.'
      } else {
        const expiresAt = new Date(rawInvite.expires_at)
        if (expiresAt <= new Date()) {
          errorTitle = 'Invitation expired'
          errorMessage = 'This invitation has expired. Please contact the studio owner to request a new invitation.'
        } else if (rawInvite.status === 'revoked') {
          errorTitle = 'Invitation revoked'
          errorMessage = 'This invitation has been revoked. Please request a new one from the studio owner.'
        }
      }
    } else if (rawLink && rawLink.is_enabled === false) {
      errorTitle = 'Invite link disabled'
      errorMessage = 'This invite link has been disabled. Ask an admin for a new link.'
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">{errorTitle}</h1>
            <p className="text-red-800 mt-2">
              {errorMessage}
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              If you believe this is an error, please contact the studio owner or request a new invitation.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="/join"
              className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Return to Onboarding
            </a>
            <a
              href="/dashboard"
              className="block w-full text-center text-blue-600 hover:underline text-sm"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Persist valid invite token so onboarding redirects skip welcome
  // Check if cookie is already set with the correct token
  const existingToken = await getInviteToken()
  if (existingToken !== token) {
    // Redirect to API route to set the cookie, then come back
    redirect(`/api/join/token?token=${encodeURIComponent(token)}`)
  }

  // Show Accept Invite Panel only when invitation is valid
  return <AcceptInvitePanel token={token} invitation={invitation} />
}
