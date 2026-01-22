import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import AcceptInviteForm from './AcceptInviteForm'
import Link from 'next/link'
import type { InviteContext } from '@/types/invite'

interface AcceptInvitePanelProps {
  token: string
  invitation: InviteContext
}

export default async function AcceptInvitePanel({ token, invitation }: AcceptInvitePanelProps) {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthenticated = !!user

  // Check if user is already a member of this studio
  let isAlreadyMember = false
  if (user && invitation.studio?.id) {
    const { data: membership } = await supabase
      .from('studio_users')
      .select('id')
      .eq('studio_id', invitation.studio.id)
      .eq('user_id', user.id)
      .maybeSingle()
    
    isAlreadyMember = !!membership
  }

  if (isAlreadyMember) {
    redirect('/api/join/token?action=clear&returnTo=/dashboard')
  }

  // Check for email mismatch (warn but allow)
  const userEmail = user?.email?.toLowerCase().trim() || ''
  const inviteEmail = invitation.email?.toLowerCase().trim() || ''
  const emailMismatch =
    invitation.source === 'invitation' && isAuthenticated && userEmail && inviteEmail && userEmail !== inviteEmail

  // Get inviter info
  const inviter =
    invitation.source === 'invitation'
      ? (
          await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', invitation.invitation?.invited_by ?? '')
            .maybeSingle()
        ).data
      : null

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold">You&apos;re Invited!</h1>
          <p className="text-gray-600 mt-2">
            You&apos;ve been invited to join a studio.
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div>
            <p className="text-sm text-gray-500">Studio</p>
            <p className="font-semibold">{invitation.studio.name}</p>
          </div>

          {invitation.source === 'invitation' && inviter && (
            <div>
              <p className="text-sm text-gray-500">Invited by</p>
              <p className="font-semibold">
                {inviter.full_name || inviter.email}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-semibold capitalize">{invitation.role}</p>
          </div>

          {invitation.source === 'invitation' && (
            <div>
              <p className="text-sm text-gray-500">Invited Email</p>
              <p className="font-semibold">{invitation.email}</p>
            </div>
          )}

          {invitation.source === 'invite_link' && (
            <div>
              <p className="text-sm text-gray-500">Invite type</p>
              <p className="font-semibold">Anyone with this link can join as a Member.</p>
            </div>
          )}
        </div>

        {emailMismatch && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
            <p className="font-semibold mb-1">Email Mismatch</p>
            <p className="text-sm">
              This invitation was sent to <strong>{invitation.email}</strong>, but you&apos;re signed in as <strong>{userEmail}</strong>. 
              You can still accept the invitation, but you may want to sign in with the invited email address instead.
            </p>
          </div>
        )}

        {!isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Sign up or sign in to accept this invitation. New here? You&apos;ll create your password next.
            </p>
            <Link
              href={`/login?redirect=/join?token=${token}&intent=invite`}
              className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Sign up or Sign in to Accept Invite
            </Link>
          </div>
        ) : (
          <AcceptInviteForm token={token} />
        )}
      </div>
    </div>
  )
}

