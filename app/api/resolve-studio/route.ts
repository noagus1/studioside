import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { admin } from '@/lib/supabase/adminClient'
import { acceptPendingInviteForUser } from '@/lib/auth/resolveStudioAccess'
import { getUserStudios } from '@/data/getUserStudios'
import { setCurrentStudioId } from '@/lib/cookies/currentStudio'
import { clearInviteToken } from '@/lib/cookies/inviteToken'

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const searchParams = request.nextUrl.searchParams
  const inviteId = searchParams.get('inviteId')
  const studioId = searchParams.get('studioId')

  if (inviteId) {
    const normalizedEmail = user.email?.toLowerCase().trim()
    if (!normalizedEmail) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const nowIso = new Date().toISOString()
    const { data: invite } = await admin
      .from('studio_invitations')
      .select('id, studio_id, role, email, invited_by, expires_at, accepted_at, status')
      .eq('id', inviteId)
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .is('accepted_at', null)
      .gt('expires_at', nowIso)
      .maybeSingle()

    if (!invite) {
      return NextResponse.redirect(new URL('/invites', request.url))
    }

    await acceptPendingInviteForUser(invite, user.id)
    await setCurrentStudioId(invite.studio_id)
    await clearInviteToken()

    try {
      await supabase.rpc('set_current_studio_id', {
        studio_uuid: invite.studio_id,
      })
    } catch (error) {
      console.warn('Failed to set current_studio_id in session:', error)
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (studioId) {
    const studios = await getUserStudios()
    const isMember = studios.some((studio) => studio.studio_id === studioId)

    if (!isMember) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    await setCurrentStudioId(studioId)
    try {
      await supabase.rpc('set_current_studio_id', {
        studio_uuid: studioId,
      })
    } catch (error) {
      console.warn('Failed to set current_studio_id in session:', error)
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
