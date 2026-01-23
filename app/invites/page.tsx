import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getPendingInvitesForEmail } from '@/data/getPendingInvitesForEmail'
import InvitesList from './InvitesList'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function InvitesPage() {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userEmail = user.email?.toLowerCase().trim()
  if (!userEmail) {
    redirect('/dashboard')
  }

  const invites = await getPendingInvitesForEmail(userEmail)

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Choose a studio</h1>
          <p className="text-muted-foreground">
            You have multiple invitations. Accept one to continue.
          </p>
        </div>
        <InvitesList invites={invites} />
      </div>
    </div>
  )
}
